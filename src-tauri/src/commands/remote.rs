use git2::{
    AutotagOption, BranchType, Direction, FetchOptions, PushOptions,
    RemoteCallbacks,
};
use std::sync::{Arc, Mutex};

use super::models::{RemoteBranchInfo, RemoteInfo, SyncProgress};
use super::utils::{normalize_unicode, open_repo};

// Global progress state
lazy_static::lazy_static! {
    static ref SYNC_PROGRESS: Arc<Mutex<SyncProgress>> = Arc::new(Mutex::new(SyncProgress {
        phase: "idle".to_string(),
        current: 0,
        total: 0,
        bytes: 0,
        message: String::new(),
    }));
}

/// List all remotes.
#[tauri::command]
pub async fn list_remotes(repo_path: String) -> Result<Vec<RemoteInfo>, String> {
    let repo = open_repo(&repo_path)?;
    let mut remotes = Vec::new();

    for remote_name in repo.remotes().map_err(|e| format!("원격 목록 조회 실패: {}", e))?.iter() {
        if let Some(name) = remote_name {
            let remote = repo
                .find_remote(name)
                .map_err(|e| format!("원격 '{}' 찾기 실패: {}", name, e))?;
            let url = remote.url().unwrap_or("").to_string();
            let push_url = remote
                .pushurl()
                .unwrap_or(remote.url().unwrap_or(""))
                .to_string();

            remotes.push(RemoteInfo {
                name: normalize_unicode(name),
                url: url.clone(),
                fetch_url: url,
                push_url,
            });
        }
    }
    Ok(remotes)
}

/// Add a new remote.
#[tauri::command]
pub async fn add_remote(repo_path: String, name: String, url: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&name);
    let repo = open_repo(&repo_path)?;
    repo.remote(&normalized_name, &url)
        .map_err(|e| format!("원격 추가 실패: {}", e))?;
    Ok(format!("원격 '{}' 추가 완료", normalized_name))
}

/// Remove a remote.
#[tauri::command]
pub async fn remove_remote(repo_path: String, name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&name);
    let repo = open_repo(&repo_path)?;
    repo.remote_delete(&normalized_name)
        .map_err(|e| format!("원격 삭제 실패: {}", e))?;
    Ok(format!("원격 '{}' 삭제 완료", normalized_name))
}

/// Fetch from remote.
#[tauri::command]
pub async fn fetch_remote(repo_path: String, remote_name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&remote_name);
    let repo = open_repo(&repo_path)?;

    update_progress("fetching", &format!("'{}'에서 페치 중...", normalized_name));

    let mut remote = repo
        .find_remote(&normalized_name)
        .map_err(|e| format!("원격 '{}' 찾기 실패: {}", normalized_name, e))?;

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

    remote
        .fetch(&[] as &[&str], Some(&mut fetch_options), None)
        .map_err(|e| format!("페치 실패: {}", e))?;

    update_progress("idle", &format!("'{}'에서 페치 완료", normalized_name));
    Ok(format!("'{}' 페치 완료", normalized_name))
}

/// Pull changes from remote.
#[tauri::command]
pub async fn pull_changes(
    repo_path: String,
    remote_name: String,
    branch_name: String,
) -> Result<String, String> {
    let normalized_remote = normalize_unicode(&remote_name);
    let normalized_branch = normalize_unicode(&branch_name);

    update_progress(
        "pulling",
        &format!("'{}/{}'에서 풀 중...", normalized_remote, normalized_branch),
    );

    // Fetch first
    fetch_remote(repo_path.clone(), normalized_remote.clone()).await?;

    let repo = open_repo(&repo_path)?;

    let remote_branch_name = format!("{}/{}", normalized_remote, normalized_branch);
    let remote_branch = repo
        .find_branch(&remote_branch_name, BranchType::Remote)
        .map_err(|e| format!("원격 브랜치 '{}' 찾기 실패: {}", remote_branch_name, e))?;

    let remote_commit = remote_branch
        .get()
        .peel_to_commit()
        .map_err(|e| format!("원격 커밋 접근 실패: {}", e))?;
    let annotated_commit = repo
        .find_annotated_commit(remote_commit.id())
        .map_err(|e| format!("Annotated 커밋 생성 실패: {}", e))?;

    let (merge_analysis, _) = repo
        .merge_analysis(&[&annotated_commit])
        .map_err(|e| format!("병합 분석 실패: {}", e))?;

    if merge_analysis.is_up_to_date() {
        update_progress("idle", "이미 최신 상태입니다");
        return Ok("이미 최신 상태입니다".to_string());
    }

    if merge_analysis.is_fast_forward() {
        let refname = format!("refs/heads/{}", normalized_branch);
        let mut reference = repo
            .find_reference(&refname)
            .map_err(|e| format!("참조 찾기 실패: {}", e))?;
        reference
            .set_target(remote_commit.id(), "Fast-forward merge")
            .map_err(|e| format!("참조 업데이트 실패: {}", e))?;

        repo.set_head(&refname)
            .map_err(|e| format!("HEAD 변경 실패: {}", e))?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))
            .map_err(|e| format!("체크아웃 실패: {}", e))?;

        update_progress("idle", &format!("Fast-forward 완료: {}", remote_commit.id()));
        Ok("풀 성공 (fast-forward)".to_string())
    } else {
        update_progress("idle", "수동 병합이 필요합니다");
        Err("풀 실패: 병합 또는 리베이스가 필요합니다".to_string())
    }
}

/// Push changes to remote.
#[tauri::command]
pub async fn push_changes(
    repo_path: String,
    remote_name: String,
    branch_name: String,
    force: bool,
) -> Result<String, String> {
    let normalized_remote = normalize_unicode(&remote_name);
    let normalized_branch = normalize_unicode(&branch_name);

    update_progress(
        "pushing",
        &format!("'{}/{}'에 푸시 중...", normalized_remote, normalized_branch),
    );

    let repo = open_repo(&repo_path)?;
    let mut remote = repo
        .find_remote(&normalized_remote)
        .map_err(|e| format!("원격 '{}' 찾기 실패: {}", normalized_remote, e))?;

    let mut callbacks = RemoteCallbacks::new();
    callbacks.push_transfer_progress(|current, total, bytes| {
        let mut progress = SYNC_PROGRESS.lock().unwrap();
        progress.current = current as u32;
        progress.total = total as u32;
        progress.bytes = bytes as u64;
    });

    let mut push_options = PushOptions::new();
    push_options.remote_callbacks(callbacks);

    let refspec = if force {
        format!(
            "+refs/heads/{}:refs/heads/{}",
            normalized_branch, normalized_branch
        )
    } else {
        format!(
            "refs/heads/{}:refs/heads/{}",
            normalized_branch, normalized_branch
        )
    };

    remote
        .push(&[&refspec], Some(&mut push_options))
        .map_err(|e| format!("푸시 실패: {}", e))?;

    update_progress(
        "idle",
        &format!("'{}/{}' 푸시 완료", normalized_remote, normalized_branch),
    );
    Ok(format!(
        "'{}/{}' 푸시 완료",
        normalized_remote, normalized_branch
    ))
}

/// Get remote branches.
#[tauri::command]
pub async fn get_remote_branches(
    repo_path: String,
    remote_name: String,
) -> Result<Vec<RemoteBranchInfo>, String> {
    let normalized_remote = normalize_unicode(&remote_name);
    let repo = open_repo(&repo_path)?;
    let mut branches = Vec::new();

    let branch_iter = repo
        .branches(Some(BranchType::Remote))
        .map_err(|e| format!("원격 브랜치 목록 조회 실패: {}", e))?;

    let prefix = format!("{}/", normalized_remote);

    for branch_result in branch_iter {
        let (branch, _) = branch_result.map_err(|e| format!("브랜치 읽기 실패: {}", e))?;
        let name = branch
            .name()
            .map_err(|e| format!("브랜치 이름 읽기 실패: {}", e))?
            .unwrap_or("unknown")
            .to_string();

        if name.starts_with(&prefix) {
            let commit = branch
                .get()
                .peel_to_commit()
                .map_err(|e| format!("커밋 접근 실패: {}", e))?;
            let short_name = name.trim_start_matches(&prefix).to_string();

            branches.push(RemoteBranchInfo {
                name: normalize_unicode(&short_name),
                full_name: normalize_unicode(&name),
                commit_sha: commit.id().to_string()[..7].to_string(),
                commit_message: commit
                    .message()
                    .unwrap_or("")
                    .lines()
                    .next()
                    .unwrap_or("")
                    .to_string(),
                is_head: name.ends_with("/HEAD"),
            });
        }
    }
    Ok(branches)
}

/// Get sync progress.
#[tauri::command]
pub async fn get_sync_progress(_repo_path: String) -> Result<SyncProgress, String> {
    let progress = SYNC_PROGRESS.lock().unwrap().clone();
    Ok(progress)
}

/// Check remote connection.
#[tauri::command]
pub async fn check_remote_connection(
    repo_path: String,
    remote_name: String,
) -> Result<bool, String> {
    let normalized_name = normalize_unicode(&remote_name);
    let repo = open_repo(&repo_path)?;

    let mut remote = repo
        .find_remote(&normalized_name)
        .map_err(|e| format!("원격 '{}' 찾기 실패: {}", normalized_name, e))?;

    remote
        .connect(Direction::Fetch)
        .map_err(|e| format!("원격 연결 실패: {}", e))?;

    let connected = remote.connected();
    remote.disconnect().ok();
    Ok(connected)
}

// ============================================================================
// Helpers
// ============================================================================

fn update_progress(phase: &str, message: &str) {
    let mut progress = SYNC_PROGRESS.lock().unwrap();
    progress.phase = phase.to_string();
    progress.message = message.to_string();
    if phase == "idle" {
        progress.current = 0;
        progress.total = 0;
    }
}
