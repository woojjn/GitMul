#[cfg(test)]
mod amend_tests {
    use super::*;
    use git2::{Repository, Signature, Time};
    use std::fs;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn setup_test_repo() -> (TempDir, PathBuf) {
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_path_buf();
        
        // Initialize repository
        Repository::init(&repo_path).unwrap();
        
        (temp_dir, repo_path)
    }

    fn create_initial_commit(repo: &Repository) -> git2::Oid {
        let sig = Signature::new("Test User", "test@example.com", &Time::new(0, 0)).unwrap();
        let tree_id = {
            let mut index = repo.index().unwrap();
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
        ).unwrap()
    }

    fn create_test_file(repo_path: &PathBuf, filename: &str, content: &str) {
        let file_path = repo_path.join(filename);
        fs::write(file_path, content).unwrap();
    }

    fn stage_file(repo: &Repository, filename: &str) {
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new(filename)).unwrap();
        index.write().unwrap();
    }

    #[test]
    fn test_amend_commit_message() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        // Create initial commit
        create_test_file(&repo_path, "test.txt", "initial content");
        stage_file(&repo, "test.txt");
        create_initial_commit(&repo);
        
        // Get original commit message
        let original_msg = get_last_commit_message(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(original_msg, "Initial commit");
        
        // Amend commit with new message
        let result = amend_commit(
            repo_path.to_str().unwrap().to_string(),
            "Amended commit message".to_string(),
        );
        
        assert!(result.is_ok(), "Amend should succeed");
        
        // Verify new message
        let new_msg = get_last_commit_message(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(new_msg, "Amended commit message");
    }

    #[test]
    fn test_amend_commit_with_new_files() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        // Create initial commit
        create_test_file(&repo_path, "file1.txt", "content 1");
        stage_file(&repo, "file1.txt");
        create_initial_commit(&repo);
        
        // Add new file and stage
        create_test_file(&repo_path, "file2.txt", "content 2");
        stage_file(&repo, "file2.txt");
        
        // Amend commit
        let result = amend_commit(
            repo_path.to_str().unwrap().to_string(),
            "Amended with file2".to_string(),
        );
        
        assert!(result.is_ok(), "Amend with new files should succeed");
        
        // Verify both files are in the commit
        let head = repo.head().unwrap();
        let commit = head.peel_to_commit().unwrap();
        let tree = commit.tree().unwrap();
        
        assert!(tree.get_name("file1.txt").is_some(), "file1.txt should exist");
        assert!(tree.get_name("file2.txt").is_some(), "file2.txt should exist");
    }

    #[test]
    fn test_amend_commit_empty_message() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_test_file(&repo_path, "test.txt", "content");
        stage_file(&repo, "test.txt");
        create_initial_commit(&repo);
        
        // Try to amend with empty message (should fail or use default)
        let result = amend_commit(
            repo_path.to_str().unwrap().to_string(),
            "".to_string(),
        );
        
        // libgit2 allows empty messages, so this should succeed
        assert!(result.is_ok());
    }

    #[test]
    fn test_amend_no_commits() {
        let (_temp, repo_path) = setup_test_repo();
        
        // Try to amend when there are no commits
        let result = amend_commit(
            repo_path.to_str().unwrap().to_string(),
            "Test message".to_string(),
        );
        
        assert!(result.is_err(), "Amend should fail with no commits");
        assert!(result.unwrap_err().contains("HEAD"));
    }

    #[test]
    fn test_get_last_commit_message_multiple_commits() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        let sig = Signature::new("Test", "test@test.com", &Time::new(0, 0)).unwrap();
        
        // First commit
        create_test_file(&repo_path, "file1.txt", "content 1");
        stage_file(&repo, "file1.txt");
        let tree_id = repo.index().unwrap().write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let first_commit = repo.commit(Some("HEAD"), &sig, &sig, "First", &tree, &[]).unwrap();
        
        // Second commit
        create_test_file(&repo_path, "file2.txt", "content 2");
        stage_file(&repo, "file2.txt");
        let tree_id2 = repo.index().unwrap().write_tree().unwrap();
        let tree2 = repo.find_tree(tree_id2).unwrap();
        let parent = repo.find_commit(first_commit).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "Second", &tree2, &[&parent]).unwrap();
        
        // Should get the last commit message
        let msg = get_last_commit_message(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(msg, "Second");
    }

    #[test]
    fn test_amend_preserves_parent() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        let sig = Signature::new("Test", "test@test.com", &Time::new(0, 0)).unwrap();
        
        // Create two commits
        create_test_file(&repo_path, "file1.txt", "content 1");
        stage_file(&repo, "file1.txt");
        let tree_id = repo.index().unwrap().write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let first_oid = repo.commit(Some("HEAD"), &sig, &sig, "First", &tree, &[]).unwrap();
        
        create_test_file(&repo_path, "file2.txt", "content 2");
        stage_file(&repo, "file2.txt");
        let tree_id2 = repo.index().unwrap().write_tree().unwrap();
        let tree2 = repo.find_tree(tree_id2).unwrap();
        let first_commit = repo.find_commit(first_oid).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "Second", &tree2, &[&first_commit]).unwrap();
        
        // Amend second commit
        amend_commit(
            repo_path.to_str().unwrap().to_string(),
            "Second (amended)".to_string(),
        ).unwrap();
        
        // Verify parent is still the first commit
        let head = repo.head().unwrap();
        let commit = head.peel_to_commit().unwrap();
        assert_eq!(commit.parent_count(), 1);
        assert_eq!(commit.parent(0).unwrap().id(), first_oid);
    }
}
