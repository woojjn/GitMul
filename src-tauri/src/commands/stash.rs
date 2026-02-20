use git2::StashFlags;
use std::path::Path;

use super::models::StashInfo;

/// Create a stash with optional message.
#[tauri::command]
pub fn stash_save(
    repo_path: String,
    message: Option<String>,
    include_untracked: bool,
) -> Result<String, String> {
    let mut repo = git2::Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let sig = repo
        .signature()
        .map_err(|e| format!("서명 생성 실패: {}", e))?;

    let mut flags = StashFlags::DEFAULT;
    if include_untracked {
        flags.insert(StashFlags::INCLUDE_UNTRACKED);
    }

    let stash_msg = message.as_deref().unwrap_or("WIP");
    let oid = repo
        .stash_save(&sig, stash_msg, Some(flags))
        .map_err(|e| format!("스태시 생성 실패: {}", e))?;

    Ok(format!("스태시 생성 완료: {}", oid))
}

/// List all stashes.
#[tauri::command]
pub fn stash_list(repo_path: String) -> Result<Vec<StashInfo>, String> {
    let mut repo = git2::Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let mut stashes = Vec::new();
    repo.stash_foreach(|index, message, oid| {
        stashes.push(StashInfo {
            index,
            message: message.to_string(),
            oid: oid.to_string(),
        });
        true
    })
    .map_err(|e| format!("스태시 목록 조회 실패: {}", e))?;

    Ok(stashes)
}

/// Apply a stash by index.
#[tauri::command]
pub fn stash_apply(repo_path: String, index: usize) -> Result<String, String> {
    let mut repo = git2::Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    repo.stash_apply(index, None)
        .map_err(|e| format!("스태시 적용 실패: {}", e))?;

    Ok("스태시 적용 완료".to_string())
}

/// Pop a stash by index (apply and remove).
#[tauri::command]
pub fn stash_pop(repo_path: String, index: usize) -> Result<String, String> {
    let mut repo = git2::Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    repo.stash_pop(index, None)
        .map_err(|e| format!("스태시 팝 실패: {}", e))?;

    Ok("스태시 팝 완료".to_string())
}

/// Drop a stash by index.
#[tauri::command]
pub fn stash_drop(repo_path: String, index: usize) -> Result<String, String> {
    let mut repo = git2::Repository::open(Path::new(&repo_path))
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    repo.stash_drop(index)
        .map_err(|e| format!("스태시 삭제 실패: {}", e))?;

    Ok("스태시 삭제 완료".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::{Repository, Signature, Time};
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

    fn stage_and_commit(repo: &Repository, message: &str) {
        let mut index = repo.index().unwrap();
        index
            .add_all(["."].iter(), git2::IndexAddOption::DEFAULT, None)
            .unwrap();
        index.write().unwrap();
        let sig = Signature::new("Test", "test@test.com", &Time::new(0, 0)).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let parent = repo.head().and_then(|h| h.peel_to_commit()).ok();
        let parents = if let Some(ref p) = parent {
            vec![p]
        } else {
            vec![]
        };
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)
            .unwrap();
    }

    #[test]
    fn test_stash_save_and_list() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        create_file(&repo_path, "file1.txt", "modified");

        let result = stash_save(
            repo_path.to_str().unwrap().to_string(),
            Some("My stash".to_string()),
            false,
        );
        assert!(result.is_ok());

        let stashes = stash_list(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(stashes.len(), 1);
        assert!(stashes[0].message.contains("My stash"));
    }

    #[test]
    fn test_stash_pop() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");
        create_file(&repo_path, "file1.txt", "modified");

        stash_save(repo_path.to_str().unwrap().to_string(), None, false).unwrap();

        let result = stash_pop(repo_path.to_str().unwrap().to_string(), 0);
        assert!(result.is_ok());

        let content = fs::read_to_string(repo_path.join("file1.txt")).unwrap();
        assert_eq!(content, "modified");

        let stashes = stash_list(repo_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(stashes.len(), 0);
    }

    #[test]
    fn test_stash_no_changes() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");

        let result = stash_save(repo_path.to_str().unwrap().to_string(), None, false);
        assert!(result.is_err());
    }
}
