use crate::commands::remote::*;
use git2::{Repository, Signature, RemoteCallbacks, Cred, PushOptions};
use std::fs;
use std::path::Path;
use tempfile::tempdir;

/// Helper: Create test repository with remote
fn setup_test_repo_with_remote() -> (tempfile::TempDir, String, tempfile::TempDir, String) {
    // Create bare remote repository
    let remote_dir = tempdir().unwrap();
    let remote_path = remote_dir.path().to_str().unwrap().to_string();
    Repository::init_bare(&remote_path).unwrap();
    
    // Create local repository
    let local_dir = tempdir().unwrap();
    let local_path = local_dir.path().to_str().unwrap().to_string();
    let repo = Repository::init(&local_path).unwrap();
    
    // Configure
    let mut config = repo.config().unwrap();
    config.set_str("user.name", "Test User").unwrap();
    config.set_str("user.email", "test@example.com").unwrap();
    config.set_str("core.quotepath", "false").unwrap();
    
    // Add remote
    repo.remote("origin", &remote_path).unwrap();
    
    // Create initial commit
    let sig = Signature::now("Test User", "test@example.com").unwrap();
    let tree_id = {
        let mut index = repo.index().unwrap();
        let file_path = local_dir.path().join("README.md");
        fs::write(&file_path, "# Test Repository\n").unwrap();
        index.add_path(Path::new("README.md")).unwrap();
        index.write().unwrap();
        index.write_tree().unwrap()
    };
    let tree = repo.find_tree(tree_id).unwrap();
    
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        "Initial commit",
        &tree,
        &[],
    )
    .unwrap();

    (local_dir, local_path, remote_dir, remote_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_list_remotes() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        let result = list_remotes(local_path).await;
        assert!(result.is_ok());
        
        let remotes = result.unwrap();
        assert_eq!(remotes.len(), 1);
        assert_eq!(remotes[0].name, "origin");
    }

    #[tokio::test]
    async fn test_get_remote_branches() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        // Push to remote first
        let repo = Repository::open(&local_path).unwrap();
        let mut remote = repo.find_remote("origin").unwrap();
        remote.push(&["refs/heads/main:refs/heads/main"], None).unwrap();
        
        // Fetch remote branches
        let result = fetch_remote(local_path.clone(), "origin".to_string()).await;
        assert!(result.is_ok());
        
        // List remote branches
        let result = get_remote_branches(local_path, "origin".to_string()).await;
        assert!(result.is_ok());
        
        let branches = result.unwrap();
        assert!(branches.len() > 0);
    }

    #[tokio::test]
    async fn test_fetch_remote() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        let result = fetch_remote(local_path, "origin".to_string()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_pull_changes() {
        let (_local_dir, local_path, _remote_dir, remote_path) = setup_test_repo_with_remote();
        
        // Push initial commit to remote
        let repo = Repository::open(&local_path).unwrap();
        let mut remote = repo.find_remote("origin").unwrap();
        remote.push(&["refs/heads/main:refs/heads/main"], None).unwrap();
        
        // Create another commit on remote (simulate remote changes)
        let remote_repo = Repository::open(&remote_path).unwrap();
        // Note: Can't easily simulate remote changes in bare repo, skip for now
        
        let result = pull_changes(local_path, "origin".to_string(), "main".to_string()).await;
        // Should succeed even if no changes
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_push_changes() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        let result = push_changes(
            local_path,
            "origin".to_string(),
            "main".to_string(),
            false,
        ).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_add_remote() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        let result = add_remote(
            local_path.clone(),
            "upstream".to_string(),
            "https://github.com/test/repo.git".to_string(),
        ).await;
        assert!(result.is_ok());
        
        // Verify remote was added
        let remotes = list_remotes(local_path).await.unwrap();
        assert_eq!(remotes.len(), 2);
        assert!(remotes.iter().any(|r| r.name == "upstream"));
    }

    #[tokio::test]
    async fn test_remove_remote() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        // Add a remote to remove
        add_remote(
            local_path.clone(),
            "upstream".to_string(),
            "https://github.com/test/repo.git".to_string(),
        ).await.unwrap();
        
        // Remove it
        let result = remove_remote(local_path.clone(), "upstream".to_string()).await;
        assert!(result.is_ok());
        
        // Verify removed
        let remotes = list_remotes(local_path).await.unwrap();
        assert_eq!(remotes.len(), 1);
        assert!(!remotes.iter().any(|r| r.name == "upstream"));
    }

    #[tokio::test]
    async fn test_get_fetch_progress() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        // Start fetch (in background)
        let result = fetch_remote(local_path.clone(), "origin".to_string()).await;
        assert!(result.is_ok());
        
        // Get progress (should complete quickly)
        let result = get_sync_progress(local_path).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_check_remote_connection() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        let result = check_remote_connection(local_path, "origin".to_string()).await;
        assert!(result.is_ok());
        assert!(result.unwrap()); // Local file path should be reachable
    }

    // Performance benchmarks
    #[tokio::test]
    async fn bench_list_remotes_performance() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        let start = std::time::Instant::now();
        let result = list_remotes(local_path).await;
        let duration = start.elapsed();
        
        assert!(result.is_ok());
        assert!(duration.as_millis() < 50, "List remotes should be < 50ms, got {:?}", duration);
        println!("List remotes: {:?}", duration);
    }

    #[tokio::test]
    async fn bench_fetch_performance() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        let start = std::time::Instant::now();
        let result = fetch_remote(local_path, "origin".to_string()).await;
        let duration = start.elapsed();
        
        assert!(result.is_ok());
        assert!(duration.as_millis() < 1000, "Fetch should be < 1s, got {:?}", duration);
        println!("Fetch: {:?}", duration);
    }

    #[tokio::test]
    async fn bench_push_performance() {
        let (_local_dir, local_path, _remote_dir, _remote_path) = setup_test_repo_with_remote();
        
        let start = std::time::Instant::now();
        let result = push_changes(
            local_path,
            "origin".to_string(),
            "main".to_string(),
            false,
        ).await;
        let duration = start.elapsed();
        
        assert!(result.is_ok());
        assert!(duration.as_millis() < 1000, "Push should be < 1s, got {:?}", duration);
        println!("Push: {:?}", duration);
    }
}
