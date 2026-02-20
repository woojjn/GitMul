use git2::{Repository, BranchType, MergeAnalysis, MergePreference};
use std::path::Path;

/// Merge a branch into the current branch
#[tauri::command]
pub fn merge_branch(
    repo_path: String,
    source_branch: String,
    no_fast_forward: bool,
) -> Result<String, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    // Get the source branch
    let source = repo.find_branch(&source_branch, BranchType::Local)
        .map_err(|e| format!("Failed to find source branch: {}", e))?;
    
    let source_commit = source.get().peel_to_commit()
        .map_err(|e| format!("Failed to get source commit: {}", e))?;

    // Perform merge analysis
    let (analysis, _preference) = repo.merge_analysis(&[&source_commit.as_object().into()])
        .map_err(|e| format!("Failed to analyze merge: {}", e))?;

    if analysis.is_fast_forward() && !no_fast_forward {
        // Fast-forward merge
        let mut head_ref = repo.head()
            .map_err(|e| format!("Failed to get HEAD: {}", e))?;
        
        head_ref.set_target(source_commit.id(), "Fast-forward merge")
            .map_err(|e| format!("Failed to fast-forward: {}", e))?;

        repo.checkout_head(None)
            .map_err(|e| format!("Failed to checkout HEAD: {}", e))?;

        Ok(format!("Fast-forward merge successful"))
    } else if analysis.is_normal() {
        // Normal merge
        let mut merge_options = git2::MergeOptions::new();
        let mut checkout_options = git2::build::CheckoutBuilder::new();

        repo.merge(
            &[&source_commit.as_object().into()],
            Some(&mut merge_options),
            Some(&mut checkout_options),
        ).map_err(|e| format!("Failed to merge: {}", e))?;

        // Check if there are conflicts
        let index = repo.index()
            .map_err(|e| format!("Failed to get index: {}", e))?;

        if index.has_conflicts() {
            return Ok("Merge completed with conflicts".to_string());
        }

        // Create merge commit
        let sig = repo.signature()
            .map_err(|e| format!("Failed to get signature: {}", e))?;

        let tree_id = index.write_tree()
            .map_err(|e| format!("Failed to write tree: {}", e))?;
        let tree = repo.find_tree(tree_id)
            .map_err(|e| format!("Failed to find tree: {}", e))?;

        let head = repo.head()
            .map_err(|e| format!("Failed to get HEAD: {}", e))?;
        let head_commit = head.peel_to_commit()
            .map_err(|e| format!("Failed to get HEAD commit: {}", e))?;

        let message = format!("Merge branch '{}'", source_branch);

        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &message,
            &tree,
            &[&head_commit, &source_commit],
        ).map_err(|e| format!("Failed to create merge commit: {}", e))?;

        // Cleanup merge state
        repo.cleanup_state()
            .map_err(|e| format!("Failed to cleanup state: {}", e))?;

        Ok("Merge successful".to_string())
    } else if analysis.is_up_to_date() {
        Ok("Already up-to-date".to_string())
    } else {
        Err("Cannot merge: unhandled merge analysis result".to_string())
    }
}

/// Check if a merge can be performed
#[tauri::command]
pub fn can_merge(
    repo_path: String,
    source_branch: String,
) -> Result<bool, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    // Check for uncommitted changes
    let statuses = repo.statuses(None)
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    if !statuses.is_empty() {
        return Ok(false);
    }

    // Check if source branch exists
    let source = repo.find_branch(&source_branch, BranchType::Local);
    if source.is_err() {
        return Ok(false);
    }

    Ok(true)
}

/// Get merge conflicts
#[tauri::command]
pub fn get_merge_conflicts(repo_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let index = repo.index()
        .map_err(|e| format!("Failed to get index: {}", e))?;

    let mut conflicts = Vec::new();

    if index.has_conflicts() {
        let conflicts_iter = index.conflicts()
            .map_err(|e| format!("Failed to get conflicts: {}", e))?;

        for conflict in conflicts_iter {
            let conflict = conflict.map_err(|e| format!("Failed to read conflict: {}", e))?;
            
            if let Some(our) = conflict.our {
                let path = String::from_utf8_lossy(&our.path).to_string();
                conflicts.push(path);
            }
        }
    }

    Ok(conflicts)
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
        
        let mut config = repo.config().unwrap();
        config.set_str("user.name", "Test User").unwrap();
        config.set_str("user.email", "test@example.com").unwrap();
        
        (temp_dir, repo_path)
    }

    fn create_file(repo_path: &PathBuf, filename: &str, content: &str) {
        fs::write(repo_path.join(filename), content).unwrap();
    }

    fn stage_and_commit(repo: &Repository, message: &str) -> git2::Oid {
        let mut index = repo.index().unwrap();
        index.add_all(["."].iter(), git2::IndexAddOption::DEFAULT, None).unwrap();
        index.write().unwrap();
        
        let sig = Signature::new("Test", "test@test.com", &Time::new(0, 0)).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        
        let parent = repo.head().and_then(|h| h.peel_to_commit()).ok();
        let parents = if let Some(ref p) = parent { vec![p] } else { vec![] };
        
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parents).unwrap()
    }

    #[test]
    fn test_fast_forward_merge() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        // Create initial commit on main
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial commit");
        
        // Create feature branch
        repo.branch("feature", &repo.head().unwrap().peel_to_commit().unwrap(), false).unwrap();
        
        // Switch to feature and add commit
        repo.set_head("refs/heads/feature").unwrap();
        repo.checkout_head(None).unwrap();
        
        create_file(&repo_path, "file2.txt", "feature content");
        stage_and_commit(&repo, "Feature commit");
        
        // Switch back to main
        repo.set_head("refs/heads/main").unwrap();
        repo.checkout_head(None).unwrap();
        
        // Merge feature into main (should be fast-forward)
        let result = merge_branch(
            repo_path.to_str().unwrap().to_string(),
            "feature".to_string(),
            false,
        );
        
        assert!(result.is_ok());
        assert!(result.unwrap().contains("Fast-forward"));
        
        // Verify file2.txt exists on main
        assert!(repo_path.join("file2.txt").exists());
    }

    #[test]
    fn test_normal_merge() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        // Initial commit
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        // Create and switch to feature branch
        let head_commit = repo.head().unwrap().peel_to_commit().unwrap();
        repo.branch("feature", &head_commit, false).unwrap();
        repo.set_head("refs/heads/feature").unwrap();
        repo.checkout_head(None).unwrap();
        
        // Commit on feature
        create_file(&repo_path, "file2.txt", "feature");
        stage_and_commit(&repo, "Feature commit");
        
        // Switch to main and make different commit
        repo.set_head("refs/heads/main").unwrap();
        repo.checkout_head(None).unwrap();
        create_file(&repo_path, "file3.txt", "main");
        stage_and_commit(&repo, "Main commit");
        
        // Merge feature into main
        let result = merge_branch(
            repo_path.to_str().unwrap().to_string(),
            "feature".to_string(),
            false,
        );
        
        assert!(result.is_ok());
        
        // Both files should exist
        assert!(repo_path.join("file2.txt").exists());
        assert!(repo_path.join("file3.txt").exists());
    }

    #[test]
    fn test_merge_conflict() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        // Initial commit
        create_file(&repo_path, "file1.txt", "line1\nline2\nline3");
        stage_and_commit(&repo, "Initial");
        
        // Create feature branch
        let head_commit = repo.head().unwrap().peel_to_commit().unwrap();
        repo.branch("feature", &head_commit, false).unwrap();
        
        // Commit on main
        create_file(&repo_path, "file1.txt", "line1\nMAIN_CHANGE\nline3");
        stage_and_commit(&repo, "Main change");
        
        // Switch to feature and make conflicting change
        repo.set_head("refs/heads/feature").unwrap();
        repo.checkout_head(None).unwrap();
        create_file(&repo_path, "file1.txt", "line1\nFEATURE_CHANGE\nline3");
        stage_and_commit(&repo, "Feature change");
        
        // Switch back to main
        repo.set_head("refs/heads/main").unwrap();
        repo.checkout_head(None).unwrap();
        
        // Try to merge (should have conflict)
        let result = merge_branch(
            repo_path.to_str().unwrap().to_string(),
            "feature".to_string(),
            false,
        );
        
        assert!(result.is_ok());
        assert!(result.unwrap().contains("conflicts"));
        
        // Check for conflicts
        let conflicts = get_merge_conflicts(repo_path.to_str().unwrap().to_string()).unwrap();
        assert!(conflicts.len() > 0);
        assert!(conflicts.contains(&"file1.txt".to_string()));
    }

    #[test]
    fn test_can_merge_with_uncommitted_changes() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        // Create feature branch
        repo.branch("feature", &repo.head().unwrap().peel_to_commit().unwrap(), false).unwrap();
        
        // Make uncommitted change
        create_file(&repo_path, "file1.txt", "modified");
        
        // Should not be able to merge
        let can = can_merge(
            repo_path.to_str().unwrap().to_string(),
            "feature".to_string(),
        ).unwrap();
        
        assert!(!can);
    }

    #[test]
    fn test_merge_already_up_to_date() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        
        // Create feature branch (same as main)
        repo.branch("feature", &repo.head().unwrap().peel_to_commit().unwrap(), false).unwrap();
        
        // Try to merge (already up-to-date)
        let result = merge_branch(
            repo_path.to_str().unwrap().to_string(),
            "feature".to_string(),
            false,
        );
        
        assert!(result.is_ok());
        assert!(result.unwrap().contains("up-to-date"));
    }
}
