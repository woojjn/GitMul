use git2::Repository;
use std::path::Path;

/// Amend the last commit with a new message and/or staged changes
#[tauri::command]
pub fn amend_commit(
    repo_path: String,
    message: String,
) -> Result<String, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    // Get HEAD commit
    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    
    let head_commit = head.peel_to_commit()
        .map_err(|e| format!("Failed to get HEAD commit: {}", e))?;

    // Get the tree from index (includes staged changes)
    let mut index = repo.index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    let tree_oid = index.write_tree()
        .map_err(|e| format!("Failed to write tree: {}", e))?;
    
    let tree = repo.find_tree(tree_oid)
        .map_err(|e| format!("Failed to find tree: {}", e))?;

    // Get signature from config or use default
    let signature = repo.signature()
        .map_err(|e| format!("Failed to get signature: {}", e))?;

    // Amend the commit - this replaces HEAD
    head_commit.amend(
        Some("HEAD"),           // Update HEAD reference
        Some(&signature),       // Author
        Some(&signature),       // Committer  
        None,                   // Use default encoding
        Some(&message),         // New message
        Some(&tree),           // New tree (with staged changes)
    ).map_err(|e| format!("Failed to amend commit: {}", e))?;

    Ok("Commit amended successfully".to_string())
}

/// Get the message of the last commit
#[tauri::command]
pub fn get_last_commit_message(repo_path: String) -> Result<String, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    
    let commit = head.peel_to_commit()
        .map_err(|e| format!("Failed to get HEAD commit: {}", e))?;

    Ok(commit.message().unwrap_or("").to_string())
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
        Repository::init(&repo_path).unwrap();
        (temp_dir, repo_path)
    }

    fn create_test_file(repo_path: &PathBuf, filename: &str, content: &str) {
        fs::write(repo_path.join(filename), content).unwrap();
    }

    fn stage_file(repo: &Repository, filename: &str) {
        let mut index = repo.index().unwrap();
        index.add_path(Path::new(filename)).unwrap();
        index.write().unwrap();
    }

    fn create_commit(repo: &Repository, message: &str) -> git2::Oid {
        let sig = Signature::new("Test User", "test@example.com", &Time::new(0, 0)).unwrap();
        let tree_id = repo.index().unwrap().write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        
        let parent_commit = repo.head()
            .and_then(|h| h.peel_to_commit())
            .ok();
        
        let parents = if let Some(ref p) = parent_commit {
            vec![p]
        } else {
            vec![]
        };
        
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            message,
            &tree,
            &parents,
        ).unwrap()
    }

    #[test]
    fn test_amend_commit_message() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_test_file(&repo_path, "test.txt", "initial content");
        stage_file(&repo, "test.txt");
        create_commit(&repo, "Initial commit");
        
        let original = get_last_commit_message(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(original, "Initial commit");
        
        amend_commit(
            repo_path.to_str().unwrap().to_string(),
            "Amended message".to_string(),
        ).unwrap();
        
        let amended = get_last_commit_message(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(amended, "Amended message");
    }

    #[test]
    fn test_amend_with_new_files() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_test_file(&repo_path, "file1.txt", "content 1");
        stage_file(&repo, "file1.txt");
        create_commit(&repo, "Initial commit");
        
        create_test_file(&repo_path, "file2.txt", "content 2");
        stage_file(&repo, "file2.txt");
        
        amend_commit(
            repo_path.to_str().unwrap().to_string(),
            "Amended with file2".to_string(),
        ).unwrap();
        
        let head = repo.head().unwrap();
        let commit = head.peel_to_commit().unwrap();
        let tree = commit.tree().unwrap();
        
        assert!(tree.get_name("file1.txt").is_some());
        assert!(tree.get_name("file2.txt").is_some());
    }

    #[test]
    fn test_amend_no_commits() {
        let (_temp, repo_path) = setup_test_repo();
        
        let result = amend_commit(
            repo_path.to_str().unwrap().to_string(),
            "Test".to_string(),
        );
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("HEAD"));
    }

    #[test]
    fn test_amend_preserves_parent() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_test_file(&repo_path, "file1.txt", "content 1");
        stage_file(&repo, "file1.txt");
        let first_oid = create_commit(&repo, "First");
        
        create_test_file(&repo_path, "file2.txt", "content 2");
        stage_file(&repo, "file2.txt");
        create_commit(&repo, "Second");
        
        amend_commit(
            repo_path.to_str().unwrap().to_string(),
            "Second (amended)".to_string(),
        ).unwrap();
        
        let head = repo.head().unwrap();
        let commit = head.peel_to_commit().unwrap();
        assert_eq!(commit.parent_count(), 1);
        assert_eq!(commit.parent(0).unwrap().id(), first_oid);
    }
}
