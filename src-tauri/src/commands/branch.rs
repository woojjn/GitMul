use git2::BranchType;

use super::models::BranchInfo;
use super::utils::{normalize_unicode, open_repo};

/// List all local branches.
#[tauri::command]
pub async fn list_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = open_repo(&repo_path)?;
    let mut branches = Vec::new();

    let branch_iter = repo
        .branches(Some(BranchType::Local))
        .map_err(|e| format!("브랜치 목록 조회 실패: {}", e))?;

    for branch_result in branch_iter {
        let (branch, _) = branch_result.map_err(|e| format!("브랜치 읽기 실패: {}", e))?;

        let name = branch
            .name()
            .map_err(|e| format!("브랜치 이름 읽기 실패: {}", e))?
            .unwrap_or("unknown")
            .to_string();

        let normalized_name = normalize_unicode(&name);
        let is_current = branch.is_head();

        let commit = branch
            .get()
            .peel_to_commit()
            .map_err(|e| format!("커밋 접근 실패: {}", e))?;

        branches.push(BranchInfo {
            name: normalized_name,
            is_current,
            is_remote: false,
            commit_sha: commit.id().to_string()[..7].to_string(),
            commit_message: commit
                .message()
                .unwrap_or("")
                .lines()
                .next()
                .unwrap_or("")
                .to_string(),
            author: commit.author().name().unwrap_or("Unknown").to_string(),
            timestamp: commit.time().seconds(),
        });
    }

    branches.sort_by(|a, b| b.is_current.cmp(&a.is_current));
    Ok(branches)
}

/// Get current branch name.
#[tauri::command]
pub async fn get_current_branch(repo_path: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let head = repo.head().map_err(|e| format!("HEAD 접근 실패: {}", e))?;

    if !head.is_branch() {
        return Err("HEAD가 분리되어 있습니다 (detached HEAD)".to_string());
    }

    let branch_name = head
        .shorthand()
        .ok_or("브랜치 이름을 가져올 수 없습니다")?
        .to_string();

    Ok(normalize_unicode(&branch_name))
}

/// Create a new branch from HEAD.
#[tauri::command]
pub async fn create_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&branch_name);
    let repo = open_repo(&repo_path)?;

    let head = repo.head().map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    let commit = head
        .peel_to_commit()
        .map_err(|e| format!("HEAD 커밋 접근 실패: {}", e))?;

    repo.branch(&normalized_name, &commit, false)
        .map_err(|e| format!("브랜치 생성 실패: {}", e))?;

    Ok(format!("브랜치 '{}' 생성 완료", normalized_name))
}

/// Switch to a different branch.
#[tauri::command]
pub async fn switch_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&branch_name);
    let repo = open_repo(&repo_path)?;

    let branch = repo
        .find_branch(&normalized_name, BranchType::Local)
        .map_err(|e| format!("브랜치 '{}' 찾기 실패: {}", normalized_name, e))?;

    let reference_name = branch
        .get()
        .name()
        .ok_or("유효하지 않은 브랜치 참조입니다")?;
    repo.set_head(reference_name)
        .map_err(|e| format!("HEAD 변경 실패: {}", e))?;

    let mut checkout_builder = git2::build::CheckoutBuilder::new();
    checkout_builder.force();
    repo.checkout_head(Some(&mut checkout_builder))
        .map_err(|e| format!("체크아웃 실패: {}", e))?;

    Ok(format!("'{}' 브랜치로 전환 완료", normalized_name))
}

/// Delete a branch.
#[tauri::command]
pub async fn delete_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&branch_name);
    let repo = open_repo(&repo_path)?;

    let head = repo.head().map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    let current_branch = head.shorthand().unwrap_or("");

    if current_branch == normalized_name {
        return Err("현재 브랜치는 삭제할 수 없습니다".to_string());
    }

    let mut branch = repo
        .find_branch(&normalized_name, BranchType::Local)
        .map_err(|e| format!("브랜치 '{}' 찾기 실패: {}", normalized_name, e))?;

    branch
        .delete()
        .map_err(|e| format!("브랜치 삭제 실패: {}", e))?;

    Ok(format!("브랜치 '{}' 삭제 완료", normalized_name))
}

/// Rename a branch.
#[tauri::command]
pub async fn rename_branch(
    repo_path: String,
    old_name: String,
    new_name: String,
) -> Result<String, String> {
    let normalized_old = normalize_unicode(&old_name);
    let normalized_new = normalize_unicode(&new_name);
    let repo = open_repo(&repo_path)?;

    let mut branch = repo
        .find_branch(&normalized_old, BranchType::Local)
        .map_err(|e| format!("브랜치 '{}' 찾기 실패: {}", normalized_old, e))?;

    branch
        .rename(&normalized_new, false)
        .map_err(|e| format!("브랜치 이름 변경 실패: {}", e))?;

    Ok(format!(
        "브랜치 '{}' → '{}' 이름 변경 완료",
        normalized_old, normalized_new
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::{Repository, Signature};
    use tempfile::tempdir;

    fn setup_test_repo() -> (tempfile::TempDir, String) {
        let temp_dir = tempdir().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap().to_string();
        let repo = Repository::init(&repo_path).unwrap();

        let sig = Signature::now("Test User", "test@example.com").unwrap();
        let tree_id = { repo.index().unwrap().write_tree().unwrap() };
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
            .unwrap();

        (temp_dir, repo_path)
    }

    #[tokio::test]
    async fn test_create_and_list_branches() {
        let (_temp_dir, repo_path) = setup_test_repo();
        let result = create_branch(repo_path.clone(), "feature/test".to_string()).await;
        assert!(result.is_ok());

        let branches = list_branches(repo_path).await.unwrap();
        assert_eq!(branches.len(), 2);
        assert!(branches.iter().any(|b| b.name == "feature/test"));
    }

    #[tokio::test]
    async fn test_korean_branch_name() {
        let (_temp_dir, repo_path) = setup_test_repo();
        let result = create_branch(repo_path.clone(), "기능/테스트".to_string()).await;
        assert!(result.is_ok());

        let branches = list_branches(repo_path).await.unwrap();
        assert!(branches.iter().any(|b| b.name == "기능/테스트"));
    }

    #[tokio::test]
    async fn test_switch_branch() {
        let (_temp_dir, repo_path) = setup_test_repo();
        create_branch(repo_path.clone(), "develop".to_string())
            .await
            .unwrap();
        let result = switch_branch(repo_path.clone(), "develop".to_string()).await;
        assert!(result.is_ok());

        let current = get_current_branch(repo_path).await.unwrap();
        assert_eq!(current, "develop");
    }

    #[tokio::test]
    async fn test_delete_branch() {
        let (_temp_dir, repo_path) = setup_test_repo();
        create_branch(repo_path.clone(), "temp".to_string())
            .await
            .unwrap();
        let result = delete_branch(repo_path.clone(), "temp".to_string()).await;
        assert!(result.is_ok());

        let branches = list_branches(repo_path).await.unwrap();
        assert!(!branches.iter().any(|b| b.name == "temp"));
    }
}
