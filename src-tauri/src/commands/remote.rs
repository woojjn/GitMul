use git2::{
    Repository, Remote, RemoteCallbacks, FetchOptions, PushOptions,
    Direction, Cred, CredentialType, BranchType, AutotagOption
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
    pub fetch_url: String,
    pub push_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteBranchInfo {
    pub name: String,
    pub full_name: String,
    pub commit_sha: String,
    pub commit_message: String,
    pub is_head: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncProgress {
    pub phase: String,  // "idle", "fetching", "pulling", "pushing"
    pub current: u32,
    pub total: u32,
    pub bytes: u64,
    pub message: String,
}

/// Global progress state
lazy_static::lazy_static! {
    static ref SYNC_PROGRESS: Arc<Mutex<SyncProgress>> = Arc::new(Mutex::new(SyncProgress {
        phase: "idle".to_string(),
        current: 0,
        total: 0,
        bytes: 0,
        message: String::new(),
    }));
}

/// Normalize Unicode (NFC)
fn normalize_unicode(s: &str) -> String {
    s.nfc().collect()
}

/// List all remotes
#[tauri::command]
pub async fn list_remotes(repo_path: String) -> Result<Vec<RemoteInfo>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut remotes = Vec::new();

    for remote_name in repo.remotes().map_err(|e| e.to_string())?.iter() {
        if let Some(name) = remote_name {
            let remote = repo.find_remote(name).map_err(|e| e.to_string())?;
            
            let url = remote.url().unwrap_or("").to_string();
            let fetch_url = remote.url().unwrap_or("").to_string();
            let push_url = remote.pushurl().unwrap_or(remote.url().unwrap_or("")).to_string();

            remotes.push(RemoteInfo {
                name: normalize_unicode(name),
                url,
                fetch_url,
                push_url,
            });
        }
    }

    Ok(remotes)
}

/// Add a new remote
#[tauri::command]
pub async fn add_remote(
    repo_path: String,
    name: String,
    url: String,
) -> Result<String, String> {
    let normalized_name = normalize_unicode(&name);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    repo.remote(&normalized_name, &url).map_err(|e| e.to_string())?;

    Ok(format!("Remote '{}' added successfully", normalized_name))
}

/// Remove a remote
#[tauri::command]
pub async fn remove_remote(repo_path: String, name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&name);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    repo.remote_delete(&normalized_name).map_err(|e| e.to_string())?;

    Ok(format!("Remote '{}' removed successfully", normalized_name))
}

/// Fetch from remote
#[tauri::command]
pub async fn fetch_remote(repo_path: String, remote_name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&remote_name);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // Update progress
    {
        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.phase = "fetching".to_string();
        progress.current = 0;
        progress.total = 0;
        progress.message = format!("Fetching from '{}'...", normalized_name);
    }

    let mut remote = repo.find_remote(&normalized_name).map_err(|e| e.to_string())?;
    
    // Setup callbacks
    let mut callbacks = RemoteCallbacks::new();
    callbacks.transfer_progress(|progress| {
        let mut sync_progress = SYNC_PROGRESS.lock().unwrap();
        sync_progress.current = progress.received_objects() as u32;
        sync_progress.total = progress.total_objects() as u32;
        sync_progress.bytes = progress.received_bytes() as u64;
        true
    });

    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);
    fetch_options.download_tags(AutotagOption::All);

    // Fetch
    remote
        .fetch(&[] as &[&str], Some(&mut fetch_options), None)
        .map_err(|e| e.to_string())?;

    // Reset progress
    {
        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.phase = "idle".to_string();
        progress.message = format!("Fetched from '{}'", normalized_name);
    }

    Ok(format!("Fetched from '{}' successfully", normalized_name))
}

/// Pull changes from remote
#[tauri::command]
pub async fn pull_changes(
    repo_path: String,
    remote_name: String,
    branch_name: String,
) -> Result<String, String> {
    let normalized_remote = normalize_unicode(&remote_name);
    let normalized_branch = normalize_unicode(&branch_name);
    
    // Update progress
    {
        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.phase = "pulling".to_string();
        progress.message = format!("Pulling from '{}/{}'...", normalized_remote, normalized_branch);
    }

    // Fetch first
    fetch_remote(repo_path.clone(), normalized_remote.clone()).await?;

    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // Find remote branch
    let remote_branch_name = format!("{}/{}", normalized_remote, normalized_branch);
    let remote_branch = repo
        .find_branch(&remote_branch_name, BranchType::Remote)
        .map_err(|e| format!("Remote branch '{}' not found: {}", remote_branch_name, e))?;
    
    let remote_commit = remote_branch.get().peel_to_commit().map_err(|e| e.to_string())?;
    
    // Get current branch
    let head = repo.head().map_err(|e| e.to_string())?;
    let local_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    
    // Check if fast-forward
    let (merge_analysis, _) = repo
        .merge_analysis(&[&remote_commit])
        .map_err(|e| e.to_string())?;

    if merge_analysis.is_up_to_date() {
        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.phase = "idle".to_string();
        progress.message = "Already up-to-date".to_string();
        return Ok("Already up-to-date".to_string());
    }

    if merge_analysis.is_fast_forward() {
        // Fast-forward merge
        let refname = format!("refs/heads/{}", normalized_branch);
        let mut reference = repo.find_reference(&refname).map_err(|e| e.to_string())?;
        reference
            .set_target(remote_commit.id(), "Fast-forward merge")
            .map_err(|e| e.to_string())?;
        
        // Checkout
        repo.set_head(&refname).map_err(|e| e.to_string())?;
        repo.checkout_head(Some(
            git2::build::CheckoutBuilder::default().force(),
        ))
        .map_err(|e| e.to_string())?;

        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.phase = "idle".to_string();
        progress.message = format!("Fast-forwarded to {}", remote_commit.id());
        
        Ok(format!("Pulled successfully (fast-forward)"))
    } else {
        // Need merge (or has conflicts)
        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.phase = "idle".to_string();
        progress.message = "Merge required - please merge manually".to_string();
        
        Err("Cannot pull: merge or rebase required".to_string())
    }
}

/// Push changes to remote
#[tauri::command]
pub async fn push_changes(
    repo_path: String,
    remote_name: String,
    branch_name: String,
    force: bool,
) -> Result<String, String> {
    let normalized_remote = normalize_unicode(&remote_name);
    let normalized_branch = normalize_unicode(&branch_name);
    
    // Update progress
    {
        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.phase = "pushing".to_string();
        progress.message = format!("Pushing to '{}/{}'...", normalized_remote, normalized_branch);
    }

    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut remote = repo.find_remote(&normalized_remote).map_err(|e| e.to_string())?;
    
    // Setup callbacks
    let mut callbacks = RemoteCallbacks::new();
    callbacks.push_transfer_progress(|current, total, bytes| {
        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.current = current as u32;
        progress.total = total as u32;
        progress.bytes = bytes as u64;
    });

    let mut push_options = PushOptions::new();
    push_options.remote_callbacks(callbacks);

    // Push
    let refspec = if force {
        format!("+refs/heads/{}:refs/heads/{}", normalized_branch, normalized_branch)
    } else {
        format!("refs/heads/{}:refs/heads/{}", normalized_branch, normalized_branch)
    };
    
    remote
        .push(&[&refspec], Some(&mut push_options))
        .map_err(|e| e.to_string())?;

    // Reset progress
    {
        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.phase = "idle".to_string();
        progress.message = format!("Pushed to '{}/{}'", normalized_remote, normalized_branch);
    }

    Ok(format!("Pushed to '{}/{}' successfully", normalized_remote, normalized_branch))
}

/// Get remote branches
#[tauri::command]
pub async fn get_remote_branches(
    repo_path: String,
    remote_name: String,
) -> Result<Vec<RemoteBranchInfo>, String> {
    let normalized_remote = normalize_unicode(&remote_name);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let mut branches = Vec::new();
    
    let branch_iter = repo
        .branches(Some(BranchType::Remote))
        .map_err(|e| e.to_string())?;

    for branch_result in branch_iter {
        let (branch, _) = branch_result.map_err(|e| e.to_string())?;
        
        let name = branch
            .name()
            .map_err(|e| e.to_string())?
            .unwrap_or("unknown")
            .to_string();
        
        // Filter by remote
        if name.starts_with(&format!("{}/", normalized_remote)) {
            let commit = branch.get().peel_to_commit().map_err(|e| e.to_string())?;
            let short_name = name.trim_start_matches(&format!("{}/", normalized_remote)).to_string();
            
            branches.push(RemoteBranchInfo {
                name: normalize_unicode(&short_name),
                full_name: normalize_unicode(&name),
                commit_sha: commit.id().to_string()[..7].to_string(),
                commit_message: commit.message().unwrap_or("").lines().next().unwrap_or("").to_string(),
                is_head: name.ends_with("/HEAD"),
            });
        }
    }

    Ok(branches)
}

/// Get sync progress
#[tauri::command]
pub async fn get_sync_progress(repo_path: String) -> Result<SyncProgress, String> {
    let progress = SYNC_PROGRESS.lock().unwrap().clone();
    Ok(progress)
}

/// Check remote connection
#[tauri::command]
pub async fn check_remote_connection(
    repo_path: String,
    remote_name: String,
) -> Result<bool, String> {
    let normalized_name = normalize_unicode(&remote_name);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let mut remote = repo.find_remote(&normalized_name).map_err(|e| e.to_string())?;
    
    // Connect
    remote
        .connect(Direction::Fetch)
        .map_err(|e| e.to_string())?;
    
    let connected = remote.connected();
    remote.disconnect().ok();
    
    Ok(connected)
}
