use git2::BranchType;

use super::models::BranchInfo;
use super::utils::{ensure_utf8_config, normalize_unicode, open_repo};

/// List all branches (local and remote).
#[tauri::command]
pub async fn list_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = open_repo(&repo_path)?;
    let mut branches = Vec::new();

    // Iterate all branches (local + remote)
    let branch_iter = repo
        .branches(None)
        .map_err(|e| format!("브랜치 목록 조회 실패: {}", e))?;

    for branch_result in branch_iter {
        let (branch, branch_type) =
            branch_result.map_err(|e| format!("브랜치 읽기 실패: {}", e))?;

        let name = branch
            .name()
            .map_err(|e| format!("브랜치 이름 읽기 실패: {}", e))?
            .unwrap_or("unknown")
            .to_string();

        let normalized_name = normalize_unicode(&name);
        let is_remote = branch_type == BranchType::Remote;
        let is_current = !is_remote && branch.is_head();

        let commit = match branch.get().peel_to_commit() {
            Ok(c) => c,
            Err(_) => continue, // skip branches that can't resolve to a commit
        };

        branches.push(BranchInfo {
            name: normalized_name,
            is_current,
            is_remote,
            commit_sha: commit.id().to_string(),
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

    // Current branch first, then local, then remote
    branches.sort_by(|a, b| {
        b.is_current
            .cmp(&a.is_current)
            .then(a.is_remote.cmp(&b.is_remote))
    });
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
/// Returns an error if there are uncommitted changes to prevent data loss.
/// If `force` is true, checkout proceeds even with uncommitted changes.
#[tauri::command]
pub async fn switch_branch(
    repo_path: String,
    branch_name: String,
    force: Option<bool>,
) -> Result<String, String> {
    let normalized_name = normalize_unicode(&branch_name);
    let repo = open_repo(&repo_path)?;
    // Best-effort: ensure Korean file names work correctly after checkout
    let _ = ensure_utf8_config(&repo);
    let force = force.unwrap_or(false);

    // 미저장 변경사항 감지 (force 모드가 아닐 때만)
    if !force {
        let statuses = repo
            .statuses(None)
            .map_err(|e| format!("상태 확인 실패: {}", e))?;
        let has_changes = statuses.iter().any(|s| {
            s.status().intersects(
                git2::Status::INDEX_NEW
                    | git2::Status::INDEX_MODIFIED
                    | git2::Status::INDEX_DELETED
                    | git2::Status::WT_MODIFIED
                    | git2::Status::WT_DELETED,
            )
        });
        if has_changes {
            return Err(
                "미저장 변경사항이 있습니다. 먼저 커밋하거나 스태시한 후 브랜치를 전환하세요."
                    .to_string(),
            );
        }
    }

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
    if force {
        checkout_builder.force();
    }
    repo.checkout_head(Some(&mut checkout_builder))
        .map_err(|e| format!("체크아웃 실패: {}", e))?;

    Ok(format!("'{}' 브랜치로 전환 완료", normalized_name))
}

/// Delete a branch.
/// By default, refuses to delete unmerged branches to prevent data loss.
/// If `force` is true, deletes even if not merged into the current branch.
#[tauri::command]
pub async fn delete_branch(
    repo_path: String,
    branch_name: String,
    force: Option<bool>,
) -> Result<String, String> {
    let normalized_name = normalize_unicode(&branch_name);
    let repo = open_repo(&repo_path)?;
    let force = force.unwrap_or(false);

    let head = repo.head().map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    let current_branch = head.shorthand().unwrap_or("");

    if current_branch == normalized_name {
        return Err("현재 브랜치는 삭제할 수 없습니다".to_string());
    }

    // 병합 여부 확인 (force 모드가 아닐 때만)
    if !force {
        let target_branch = repo
            .find_branch(&normalized_name, BranchType::Local)
            .map_err(|e| format!("브랜치 '{}' 찾기 실패: {}", normalized_name, e))?;
        let target_commit = target_branch
            .get()
            .peel_to_commit()
            .map_err(|e| format!("브랜치 커밋 접근 실패: {}", e))?;
        let head_commit = head
            .peel_to_commit()
            .map_err(|e| format!("HEAD 커밋 접근 실패: {}", e))?;

        // merge-base와 target이 같으면 이미 병합된 것
        let merge_base = repo
            .merge_base(head_commit.id(), target_commit.id())
            .map_err(|e| format!("Merge-base 확인 실패: {}", e))?;

        if merge_base != target_commit.id() {
            return Err(format!(
                "브랜치 '{}'는 현재 브랜치에 병합되지 않았습니다. 강제 삭제하려면 force 옵션을 사용하세요.",
                normalized_name
            ));
        }
    }

    let mut branch = repo
        .find_branch(&normalized_name, BranchType::Local)
        .map_err(|e| format!("브랜치 '{}' 찾기 실패: {}", normalized_name, e))?;

    branch
        .delete()
        .map_err(|e| format!("브랜치 삭제 실패: {}", e))?;

    Ok(format!("브랜치 '{}' 삭제 완료", normalized_name))
}

/// Get the number of commits a branch is ahead/behind relative to a base branch.
/// Returns (ahead, behind) counts.
#[tauri::command]
pub async fn get_branch_divergence(
    repo_path: String,
    branch: String,
    base: String,
) -> Result<(usize, usize), String> {
    let normalized_branch = normalize_unicode(&branch);
    let normalized_base = normalize_unicode(&base);
    let repo = open_repo(&repo_path)?;

    let branch_ref = repo
        .find_branch(&normalized_branch, BranchType::Local)
        .map_err(|e| format!("브랜치 '{}' 찾기 실패: {}", normalized_branch, e))?;
    let base_ref = repo
        .find_branch(&normalized_base, BranchType::Local)
        .map_err(|e| format!("기준 브랜치 '{}' 찾기 실패: {}", normalized_base, e))?;

    let branch_commit = branch_ref
        .get()
        .peel_to_commit()
        .map_err(|e| format!("브랜치 커밋 접근 실패: {}", e))?;
    let base_commit = base_ref
        .get()
        .peel_to_commit()
        .map_err(|e| format!("기준 브랜치 커밋 접근 실패: {}", e))?;

    let (ahead, behind) = repo
        .graph_ahead_behind(branch_commit.id(), base_commit.id())
        .map_err(|e| format!("Ahead/Behind 계산 실패: {}", e))?;

    Ok((ahead, behind))
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
        let result = switch_branch(repo_path.clone(), "develop".to_string(), None).await;
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
        let result = delete_branch(repo_path.clone(), "temp".to_string(), None).await;
        assert!(result.is_ok());

        let branches = list_branches(repo_path).await.unwrap();
        assert!(!branches.iter().any(|b| b.name == "temp"));
    }
}
