use git2::{Branch, BranchType, Repository};
use serde::{Deserialize, Serialize};
use std::path::Path;
use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub commit_sha: String,
    pub commit_message: String,
    pub author: String,
    pub timestamp: i64,
}

/// 유니코드 정규화 (NFC)
fn normalize_unicode(s: &str) -> String {
    s.nfc().collect()
}

/// 브랜치 목록 조회
#[tauri::command]
pub async fn list_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut branches = Vec::new();

    let branch_iter = repo
        .branches(Some(BranchType::Local))
        .map_err(|e| e.to_string())?;

    for branch_result in branch_iter {
        let (branch, _branch_type) = branch_result.map_err(|e| e.to_string())?;
        
        let name = branch
            .name()
            .map_err(|e| e.to_string())?
            .unwrap_or("unknown")
            .to_string();
        
        let normalized_name = normalize_unicode(&name);
        let is_current = branch.is_head();
        
        // 커밋 정보 가져오기
        let commit = branch.get().peel_to_commit().map_err(|e| e.to_string())?;
        let commit_sha = commit.id().to_string()[..7].to_string();
        let commit_message = commit.message().unwrap_or("").lines().next().unwrap_or("").to_string();
        let author = commit.author().name().unwrap_or("Unknown").to_string();
        let timestamp = commit.time().seconds();

        branches.push(BranchInfo {
            name: normalized_name,
            is_current,
            is_remote: false,
            commit_sha,
            commit_message,
            author,
            timestamp,
        });
    }

    // 현재 브랜치를 맨 위로 정렬
    branches.sort_by(|a, b| b.is_current.cmp(&a.is_current));

    Ok(branches)
}

/// 현재 브랜치 이름 조회
#[tauri::command]
pub async fn get_current_branch(repo_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    
    if !head.is_branch() {
        return Err("HEAD is detached".to_string());
    }

    let branch_name = head
        .shorthand()
        .ok_or("Failed to get branch name")?
        .to_string();

    Ok(normalize_unicode(&branch_name))
}

/// 새 브랜치 생성
#[tauri::command]
pub async fn create_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&branch_name);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // HEAD 커밋 가져오기
    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    
    // 브랜치 생성
    repo.branch(&normalized_name, &commit, false)
        .map_err(|e| e.to_string())?;

    Ok(format!("Branch '{}' created successfully", normalized_name))
}

/// 브랜치 전환
#[tauri::command]
pub async fn switch_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&branch_name);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // 브랜치 찾기
    let branch = repo
        .find_branch(&normalized_name, BranchType::Local)
        .map_err(|e| format!("Branch '{}' not found: {}", normalized_name, e))?;
    
    // 브랜치로 전환
    let reference_name = branch.get().name().ok_or("Invalid branch reference")?;
    repo.set_head(reference_name).map_err(|e| e.to_string())?;
    
    // Working directory checkout
    let mut checkout_builder = git2::build::CheckoutBuilder::new();
    checkout_builder.force();
    repo.checkout_head(Some(&mut checkout_builder))
        .map_err(|e| e.to_string())?;

    Ok(format!("Switched to branch '{}'", normalized_name))
}

/// 브랜치 삭제
#[tauri::command]
pub async fn delete_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    let normalized_name = normalize_unicode(&branch_name);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // 현재 브랜치 확인
    let head = repo.head().map_err(|e| e.to_string())?;
    let current_branch = head.shorthand().unwrap_or("");
    
    if current_branch == normalized_name {
        return Err("Cannot delete the current branch".to_string());
    }
    
    // 브랜치 찾기 및 삭제
    let mut branch = repo
        .find_branch(&normalized_name, BranchType::Local)
        .map_err(|e| format!("Branch '{}' not found: {}", normalized_name, e))?;
    
    branch.delete().map_err(|e| e.to_string())?;

    Ok(format!("Branch '{}' deleted successfully", normalized_name))
}

/// 브랜치 이름 변경
#[tauri::command]
pub async fn rename_branch(
    repo_path: String,
    old_name: String,
    new_name: String,
) -> Result<String, String> {
    let normalized_old = normalize_unicode(&old_name);
    let normalized_new = normalize_unicode(&new_name);
    
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let mut branch = repo
        .find_branch(&normalized_old, BranchType::Local)
        .map_err(|e| format!("Branch '{}' not found: {}", normalized_old, e))?;
    
    branch
        .rename(&normalized_new, false)
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "Branch renamed from '{}' to '{}'",
        normalized_old, normalized_new
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::Signature;
    use std::fs;
    use tempfile::tempdir;

    fn setup_test_repo() -> (tempfile::TempDir, String) {
        let temp_dir = tempdir().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap().to_string();
        
        let repo = Repository::init(&repo_path).unwrap();
        
        // 초기 커밋 생성
        let sig = Signature::now("Test User", "test@example.com").unwrap();
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
        )
        .unwrap();

        (temp_dir, repo_path)
    }

    #[tokio::test]
    async fn test_create_and_list_branches() {
        let (_temp_dir, repo_path) = setup_test_repo();

        // 브랜치 생성
        let result = create_branch(repo_path.clone(), "feature/test".to_string()).await;
        assert!(result.is_ok());

        // 브랜치 목록 조회
        let branches = list_branches(repo_path).await.unwrap();
        assert_eq!(branches.len(), 2); // main + feature/test
        assert!(branches.iter().any(|b| b.name == "feature/test"));
    }

    #[tokio::test]
    async fn test_korean_branch_name() {
        let (_temp_dir, repo_path) = setup_test_repo();

        // 한글 브랜치 생성
        let result = create_branch(repo_path.clone(), "기능/테스트".to_string()).await;
        assert!(result.is_ok());

        // 브랜치 목록 확인
        let branches = list_branches(repo_path).await.unwrap();
        assert!(branches.iter().any(|b| b.name == "기능/테스트"));
    }

    #[tokio::test]
    async fn test_switch_branch() {
        let (_temp_dir, repo_path) = setup_test_repo();

        // 새 브랜치 생성
        create_branch(repo_path.clone(), "develop".to_string()).await.unwrap();

        // 브랜치 전환
        let result = switch_branch(repo_path.clone(), "develop".to_string()).await;
        assert!(result.is_ok());

        // 현재 브랜치 확인
        let current = get_current_branch(repo_path).await.unwrap();
        assert_eq!(current, "develop");
    }

    #[tokio::test]
    async fn test_delete_branch() {
        let (_temp_dir, repo_path) = setup_test_repo();

        // 브랜치 생성
        create_branch(repo_path.clone(), "temp".to_string()).await.unwrap();

        // 브랜치 삭제
        let result = delete_branch(repo_path.clone(), "temp".to_string()).await;
        assert!(result.is_ok());

        // 브랜치 목록 확인 (삭제됨)
        let branches = list_branches(repo_path).await.unwrap();
        assert!(!branches.iter().any(|b| b.name == "temp"));
    }
}
