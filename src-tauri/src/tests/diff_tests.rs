use crate::commands::diff::*;
use git2::{Repository, Signature};
use std::fs;
use tempfile::tempdir;

/// Helper: Create test repository with initial commit
fn setup_test_repo() -> (tempfile::TempDir, String) {
    let temp_dir = tempdir().unwrap();
    let repo_path = temp_dir.path().to_str().unwrap().to_string();
    
    let repo = Repository::init(&repo_path).unwrap();
    
    // Configure UTF-8
    let mut config = repo.config().unwrap();
    config.set_str("core.quotepath", "false").unwrap();
    config.set_str("i18n.commitEncoding", "utf-8").unwrap();
    
    // Create initial commit
    let sig = Signature::now("Test User", "test@example.com").unwrap();
    let tree_id = {
        let mut index = repo.index().unwrap();
        // Create initial file
        let file_path = temp_dir.path().join("README.md");
        fs::write(&file_path, "# Test Repository\n").unwrap();
        index.add_path(std::path::Path::new("README.md")).unwrap();
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

    (temp_dir, repo_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_file_diff_unstaged() {
        let (_temp_dir, repo_path) = setup_test_repo();
        
        // Modify file
        let file_path = _temp_dir.path().join("README.md");
        fs::write(&file_path, "# Test Repository\n\nNew content added\n").unwrap();
        
        // Get diff
        let result = get_file_diff(repo_path, "README.md".to_string(), false).await;
        assert!(result.is_ok());
        
        let diff = result.unwrap();
        assert!(diff.contains("New content added"));
        assert!(diff.contains("@@")); // Hunk header
    }

    #[tokio::test]
    async fn test_get_file_diff_staged() {
        let (_temp_dir, repo_path) = setup_test_repo();
        
        // Modify and stage file
        let file_path = _temp_dir.path().join("README.md");
        fs::write(&file_path, "# Test Repository\n\nStaged content\n").unwrap();
        
        let repo = Repository::open(&repo_path).unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("README.md")).unwrap();
        index.write().unwrap();
        
        // Get staged diff
        let result = get_file_diff(repo_path, "README.md".to_string(), true).await;
        assert!(result.is_ok());
        
        let diff = result.unwrap();
        assert!(diff.contains("Staged content"));
    }

    #[tokio::test]
    async fn test_get_file_diff_korean_content() {
        let (_temp_dir, repo_path) = setup_test_repo();
        
        // Create Korean file
        let file_path = _temp_dir.path().join("한글파일.txt");
        fs::write(&file_path, "안녕하세요\n").unwrap();
        
        let repo = Repository::open(&repo_path).unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("한글파일.txt")).unwrap();
        index.write().unwrap();
        
        // Commit
        let sig = Signature::now("Test User", "test@example.com").unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let parent = repo.head().unwrap().peel_to_commit().unwrap();
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            "Add Korean file",
            &tree,
            &[&parent],
        ).unwrap();
        
        // Modify Korean file
        fs::write(&file_path, "안녕하세요\n새로운 내용\n").unwrap();
        
        // Get diff
        let result = get_file_diff(repo_path, "한글파일.txt".to_string(), false).await;
        assert!(result.is_ok());
        
        let diff = result.unwrap();
        assert!(diff.contains("새로운 내용"));
    }

    #[tokio::test]
    async fn test_get_commit_diff() {
        let (_temp_dir, repo_path) = setup_test_repo();
        
        let repo = Repository::open(&repo_path).unwrap();
        let commit = repo.head().unwrap().peel_to_commit().unwrap();
        let commit_id = commit.id().to_string();
        
        // Get commit diff
        let result = get_commit_diff(repo_path, commit_id).await;
        assert!(result.is_ok());
        
        let diff = result.unwrap();
        assert!(diff.contains("README.md"));
        assert!(diff.contains("Test Repository"));
    }

    #[tokio::test]
    async fn test_parse_diff_hunks() {
        let diff_text = r#"diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 Line 1
-Line 2
+Line 2 modified
+New Line 3
 Line 4
"#;

        let result = parse_diff(diff_text.to_string()).await;
        assert!(result.is_ok());
        
        let parsed = result.unwrap();
        assert_eq!(parsed.file_path, "test.txt");
        assert!(parsed.hunks.len() > 0);
        
        let hunk = &parsed.hunks[0];
        assert!(hunk.old_start > 0);
        assert!(hunk.new_start > 0);
        assert!(hunk.lines.len() > 0);
    }

    #[tokio::test]
    async fn test_get_file_content() {
        let (_temp_dir, repo_path) = setup_test_repo();
        
        // Get current file content
        let result = get_file_content(repo_path.clone(), "README.md".to_string(), None).await;
        assert!(result.is_ok());
        
        let content = result.unwrap();
        assert!(content.contains("Test Repository"));
    }

    #[tokio::test]
    async fn test_get_file_content_at_commit() {
        let (_temp_dir, repo_path) = setup_test_repo();
        
        let repo = Repository::open(&repo_path).unwrap();
        let commit = repo.head().unwrap().peel_to_commit().unwrap();
        let commit_id = commit.id().to_string();
        
        // Get file content at specific commit
        let result = get_file_content(
            repo_path,
            "README.md".to_string(),
            Some(commit_id),
        ).await;
        assert!(result.is_ok());
        
        let content = result.unwrap();
        assert!(content.contains("Test Repository"));
    }

    // Performance benchmarks
    #[tokio::test]
    async fn bench_diff_small_file() {
        let (_temp_dir, repo_path) = setup_test_repo();
        
        // Modify file (10 lines)
        let file_path = _temp_dir.path().join("README.md");
        let mut content = String::from("# Test\n");
        for i in 0..10 {
            content.push_str(&format!("Line {}\n", i));
        }
        fs::write(&file_path, content).unwrap();
        
        let start = std::time::Instant::now();
        let result = get_file_diff(repo_path, "README.md".to_string(), false).await;
        let duration = start.elapsed();
        
        assert!(result.is_ok());
        assert!(duration.as_millis() < 50, "Diff should be < 50ms, got {:?}", duration);
        println!("Small file diff: {:?}", duration);
    }

    #[tokio::test]
    async fn bench_diff_medium_file() {
        let (_temp_dir, repo_path) = setup_test_repo();
        
        // Modify file (1000 lines)
        let file_path = _temp_dir.path().join("large.txt");
        let mut content = String::new();
        for i in 0..1000 {
            content.push_str(&format!("Line {} with some content\n", i));
        }
        fs::write(&file_path, &content).unwrap();
        
        let repo = Repository::open(&repo_path).unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("large.txt")).unwrap();
        index.write().unwrap();
        
        // Commit
        let sig = Signature::now("Test User", "test@example.com").unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let parent = repo.head().unwrap().peel_to_commit().unwrap();
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            "Add large file",
            &tree,
            &[&parent],
        ).unwrap();
        
        // Modify 10 lines
        content.push_str("\nNew line 1\n");
        content.push_str("New line 2\n");
        fs::write(&file_path, content).unwrap();
        
        let start = std::time::Instant::now();
        let result = get_file_diff(repo_path, "large.txt".to_string(), false).await;
        let duration = start.elapsed();
        
        assert!(result.is_ok());
        assert!(duration.as_millis() < 150, "Medium file diff should be < 150ms, got {:?}", duration);
        println!("Medium file diff (1000 lines): {:?}", duration);
    }

    #[tokio::test]
    async fn bench_parse_diff_performance() {
        // Generate large diff text
        let mut diff_text = String::from("diff --git a/test.txt b/test.txt\n");
        diff_text.push_str("index 1234567..abcdefg 100644\n");
        diff_text.push_str("--- a/test.txt\n");
        diff_text.push_str("+++ b/test.txt\n");
        diff_text.push_str("@@ -1,100 +1,100 @@\n");
        
        for i in 0..100 {
            diff_text.push_str(&format!(" Line {}\n", i));
        }
        
        let start = std::time::Instant::now();
        let result = parse_diff(diff_text).await;
        let duration = start.elapsed();
        
        assert!(result.is_ok());
        assert!(duration.as_millis() < 20, "Parse should be < 20ms, got {:?}", duration);
        println!("Parse diff (100 lines): {:?}", duration);
    }
}
