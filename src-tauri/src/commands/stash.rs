use git2::{Repository, StashFlags};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StashInfo {
    pub index: usize,
    pub message: String,
    pub oid: String,
}

/// Create a stash with optional message
#[tauri::command]
pub fn stash_save(
    repo_path: String,
    message: Option<String>,
    include_untracked: bool,
) -> Result<String, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let sig = repo.signature()
        .map_err(|e| format!("Failed to get signature: {}", e))?;

    let mut flags = StashFlags::DEFAULT;
    if include_untracked {
        flags.insert(StashFlags::INCLUDE_UNTRACKED);
    }

    let stash_msg = message.as_deref().unwrap_or("WIP");

    let oid = repo.stash_save(&sig, stash_msg, Some(flags))
        .map_err(|e| format!("Failed to create stash: {}", e))?;

    Ok(format!("Stash created: {}", oid))
}

/// List all stashes
#[tauri::command]
pub fn stash_list(repo_path: String) -> Result<Vec<StashInfo>, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut stashes = Vec::new();
    
    repo.stash_foreach(|index, message, oid| {
        stashes.push(StashInfo {
            index,
            message: message.to_string(),
            oid: oid.to_string(),
        });
        true // Continue iteration
    }).map_err(|e| format!("Failed to list stashes: {}", e))?;

    Ok(stashes)
}

/// Apply a stash by index
#[tauri::command]
pub fn stash_apply(
    repo_path: String,
    index: usize,
) -> Result<String, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    repo.stash_apply(index, None)
        .map_err(|e| format!("Failed to apply stash: {}", e))?;

    Ok("Stash applied successfully".to_string())
}

/// Pop a stash by index (apply and remove)
#[tauri::command]
pub fn stash_pop(
    repo_path: String,
    index: usize,
) -> Result<String, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    repo.stash_pop(index, None)
        .map_err(|e| format!("Failed to pop stash: {}", e))?;

    Ok("Stash popped successfully".to_string())
}

/// Drop a stash by index
#[tauri::command]
pub fn stash_drop(
    repo_path: String,
    index: usize,
) -> Result<String, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    repo.stash_drop(index)
        .map_err(|e| format!("Failed to drop stash: {}", e))?;

    Ok("Stash dropped successfully".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::{Signature, Time};
    use std::fs;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn setup_test_repo() -> (TempDir, PathBuf) {
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_path_buf();
        let repo = Repository::init(&repo_path).unwrap();
        
        // Configure user for commits
        let mut config = repo.config().unwrap();
        config.set_str("user.name", "Test User").unwrap();
        config.set_str("user.email", "test@example.com").unwrap();
        
        (temp_dir, repo_path)
    }

    fn create_file(repo_path: &PathBuf, filename: &str, content: &str) {
        fs::write(repo_path.join(filename), content).unwrap();
    }

    fn stage_and_commit(repo: &Repository, message: &str) {
        let mut index = repo.index().unwrap();
        index.add_all(["."].iter(), git2::IndexAddOption::DEFAULT, None).unwrap();
        index.write().unwrap();
        
        let sig = Signature::new("Test", "test@test.com", &Time::new(0, 0)).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        
        let parent = repo.head()
            .and_then(|h| h.peel_to_commit())
            .ok();
        
        let parents = if let Some(ref p) = parent { vec![p] } else { vec![] };
        
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parents).unwrap();
    }

    #[test]
    fn test_stash_save_and_list() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        // Initial commit
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        // Make changes
        create_file(&repo_path, "file1.txt", "modified");
        
        // Create stash
        let result = stash_save(
            repo_path.to_str().unwrap().to_string(),
            Some("My stash".to_string()),
            false,
        );
        assert!(result.is_ok());
        
        // List stashes
        let stashes = stash_list(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(stashes.len(), 1);
        assert!(stashes[0].message.contains("My stash"));
    }

    #[test]
    fn test_stash_apply() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        create_file(&repo_path, "file1.txt", "modified");
        
        stash_save(
            repo_path.to_str().unwrap().to_string(),
            None,
            false,
        ).unwrap();
        
        // File should be reverted
        let content = fs::read_to_string(repo_path.join("file1.txt")).unwrap();
        assert_eq!(content, "initial");
        
        // Apply stash
        let result = stash_apply(repo_path.to_str().unwrap().to_string(), 0);
        assert!(result.is_ok());
        
        // File should be modified again
        let content = fs::read_to_string(repo_path.join("file1.txt")).unwrap();
        assert_eq!(content, "modified");
        
        // Stash should still exist
        let stashes = stash_list(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(stashes.len(), 1);
    }

    #[test]
    fn test_stash_pop() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        create_file(&repo_path, "file1.txt", "modified");
        
        stash_save(repo_path.to_str().unwrap().to_string(), None, false).unwrap();
        
        // Pop stash
        let result = stash_pop(repo_path.to_str().unwrap().to_string(), 0);
        assert!(result.is_ok());
        
        // File should be modified
        let content = fs::read_to_string(repo_path.join("file1.txt")).unwrap();
        assert_eq!(content, "modified");
        
        // Stash should be gone
        let stashes = stash_list(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(stashes.len(), 0);
    }

    #[test]
    fn test_stash_drop() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        create_file(&repo_path, "file1.txt", "modified");
        
        stash_save(repo_path.to_str().unwrap().to_string(), None, false).unwrap();
        
        // Drop stash
        let result = stash_drop(repo_path.to_str().unwrap().to_string(), 0);
        assert!(result.is_ok());
        
        // Stash should be gone
        let stashes = stash_list(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(stashes.len(), 0);
        
        // File should still be reverted (not modified)
        let content = fs::read_to_string(repo_path.join("file1.txt")).unwrap();
        assert_eq!(content, "initial");
    }

    #[test]
    fn test_stash_multiple() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        // Stash 1
        create_file(&repo_path, "file1.txt", "change1");
        stash_save(
            repo_path.to_str().unwrap().to_string(),
            Some("Stash 1".to_string()),
            false,
        ).unwrap();
        
        // Stash 2
        create_file(&repo_path, "file1.txt", "change2");
        stash_save(
            repo_path.to_str().unwrap().to_string(),
            Some("Stash 2".to_string()),
            false,
        ).unwrap();
        
        // Should have 2 stashes
        let stashes = stash_list(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(stashes.len(), 2);
        
        // Most recent is index 0
        assert!(stashes[0].message.contains("Stash 2"));
        assert!(stashes[1].message.contains("Stash 1"));
    }

    #[test]
    fn test_stash_with_untracked() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        // Create untracked file
        create_file(&repo_path, "untracked.txt", "untracked content");
        
        // Stash with untracked files
        stash_save(
            repo_path.to_str().unwrap().to_string(),
            None,
            true,
        ).unwrap();
        
        // Untracked file should be gone
        assert!(!repo_path.join("untracked.txt").exists());
        
        // Apply stash
        stash_apply(repo_path.to_str().unwrap().to_string(), 0).unwrap();
        
        // Untracked file should be restored
        assert!(repo_path.join("untracked.txt").exists());
    }

    #[test]
    fn test_stash_no_changes() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        // Try to stash with no changes
        let result = stash_save(
            repo_path.to_str().unwrap().to_string(),
            None,
            false,
        );
        
        // Should fail (no changes to stash)
        assert!(result.is_err());
    }
}
