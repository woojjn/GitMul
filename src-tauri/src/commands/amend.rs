use super::utils::open_repo;

/// Amend the last commit with a new message and/or staged changes.
#[tauri::command]
pub fn amend_commit(repo_path: String, message: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;

    let head = repo
        .head()
        .map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    let head_commit = head
        .peel_to_commit()
        .map_err(|e| format!("HEAD 커밋 접근 실패: {}", e))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;
    let tree_oid = index
        .write_tree()
        .map_err(|e| format!("트리 쓰기 실패: {}", e))?;
    let tree = repo
        .find_tree(tree_oid)
        .map_err(|e| format!("트리 찾기 실패: {}", e))?;

    let signature = repo
        .signature()
        .map_err(|e| format!("서명 생성 실패: {}", e))?;

    head_commit
        .amend(
            Some("HEAD"),
            Some(&signature),
            Some(&signature),
            None,
            Some(&message),
            Some(&tree),
        )
        .map_err(|e| format!("커밋 수정 실패: {}", e))?;

    Ok("커밋 수정 완료".to_string())
}

/// Get the message of the last commit.
#[tauri::command]
pub fn get_last_commit_message(repo_path: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;

    let head = repo
        .head()
        .map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    let commit = head
        .peel_to_commit()
        .map_err(|e| format!("HEAD 커밋 접근 실패: {}", e))?;

    Ok(commit.message().unwrap_or("").to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::{Repository, Signature, Time};
    use std::fs;
    use std::path::{Path, PathBuf};
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
        let parent_commit = repo.head().and_then(|h| h.peel_to_commit()).ok();
        let parents = if let Some(ref p) = parent_commit {
            vec![p]
        } else {
            vec![]
        };
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)
            .unwrap()
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
        )
        .unwrap();

        let amended = get_last_commit_message(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(amended, "Amended message");
    }

    #[test]
    fn test_amend_no_commits() {
        let (_temp, repo_path) = setup_test_repo();
        let result = amend_commit(repo_path.to_str().unwrap().to_string(), "Test".to_string());
        assert!(result.is_err());
    }
}
