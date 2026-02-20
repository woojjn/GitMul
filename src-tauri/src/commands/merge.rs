use git2::BranchType;

use super::utils::open_repo;

/// Merge a branch into the current branch.
#[tauri::command]
pub fn merge_branch(
    repo_path: String,
    source_branch: String,
    no_fast_forward: bool,
) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;

    let source = repo
        .find_branch(&source_branch, BranchType::Local)
        .map_err(|e| format!("소스 브랜치 찾기 실패: {}", e))?;

    let source_commit = source
        .get()
        .peel_to_commit()
        .map_err(|e| format!("소스 커밋 접근 실패: {}", e))?;

    let annotated_commit = repo
        .find_annotated_commit(source_commit.id())
        .map_err(|e| format!("Annotated 커밋 생성 실패: {}", e))?;

    let (analysis, _) = repo
        .merge_analysis(&[&annotated_commit])
        .map_err(|e| format!("병합 분석 실패: {}", e))?;

    if analysis.is_fast_forward() && !no_fast_forward {
        let mut head_ref = repo
            .head()
            .map_err(|e| format!("HEAD 접근 실패: {}", e))?;
        head_ref
            .set_target(source_commit.id(), "Fast-forward merge")
            .map_err(|e| format!("Fast-forward 실패: {}", e))?;
        repo.checkout_head(None)
            .map_err(|e| format!("체크아웃 실패: {}", e))?;

        Ok("Fast-forward 병합 완료".to_string())
    } else if analysis.is_normal() {
        let mut merge_options = git2::MergeOptions::new();
        let mut checkout_options = git2::build::CheckoutBuilder::new();

        repo.merge(
            &[&annotated_commit],
            Some(&mut merge_options),
            Some(&mut checkout_options),
        )
        .map_err(|e| format!("병합 실패: {}", e))?;

        let mut index = repo
            .index()
            .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

        if index.has_conflicts() {
            return Ok("병합 완료 (충돌 발생)".to_string());
        }

        // Create merge commit
        let sig = repo
            .signature()
            .map_err(|e| format!("서명 생성 실패: {}", e))?;
        let tree_id = index
            .write_tree()
            .map_err(|e| format!("트리 쓰기 실패: {}", e))?;
        let tree = repo
            .find_tree(tree_id)
            .map_err(|e| format!("트리 찾기 실패: {}", e))?;
        let head = repo
            .head()
            .map_err(|e| format!("HEAD 접근 실패: {}", e))?;
        let head_commit = head
            .peel_to_commit()
            .map_err(|e| format!("HEAD 커밋 접근 실패: {}", e))?;

        let message = format!("Merge branch '{}'", source_branch);

        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &message,
            &tree,
            &[&head_commit, &source_commit],
        )
        .map_err(|e| format!("병합 커밋 생성 실패: {}", e))?;

        repo.cleanup_state()
            .map_err(|e| format!("상태 정리 실패: {}", e))?;

        Ok("병합 완료".to_string())
    } else if analysis.is_up_to_date() {
        Ok("이미 최신 상태입니다".to_string())
    } else {
        Err("병합 불가: 처리할 수 없는 병합 상태입니다".to_string())
    }
}

/// Check if a merge can be performed.
#[tauri::command]
pub fn can_merge(repo_path: String, source_branch: String) -> Result<bool, String> {
    let repo = open_repo(&repo_path)?;

    let statuses = repo
        .statuses(None)
        .map_err(|e| format!("상태 조회 실패: {}", e))?;
    if !statuses.is_empty() {
        return Ok(false);
    }

    let source = repo.find_branch(&source_branch, BranchType::Local);
    Ok(source.is_ok())
}

/// Get merge conflicts.
#[tauri::command]
pub fn get_merge_conflicts(repo_path: String) -> Result<Vec<String>, String> {
    let repo = open_repo(&repo_path)?;
    let index = repo
        .index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

    let mut conflicts = Vec::new();

    if index.has_conflicts() {
        let conflicts_iter = index
            .conflicts()
            .map_err(|e| format!("충돌 정보 접근 실패: {}", e))?;

        for conflict in conflicts_iter {
            let conflict = conflict.map_err(|e| format!("충돌 항목 읽기 실패: {}", e))?;
            if let Some(our) = conflict.our {
                conflicts.push(String::from_utf8_lossy(&our.path).to_string());
            }
        }
    }
    Ok(conflicts)
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

    fn stage_and_commit(repo: &Repository, message: &str) -> git2::Oid {
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
            .unwrap()
    }

    #[test]
    fn test_fast_forward_merge() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial commit");

        let default_branch = repo.head().unwrap().shorthand().unwrap().to_string();

        repo.branch(
            "feature",
            &repo.head().unwrap().peel_to_commit().unwrap(),
            false,
        )
        .unwrap();
        repo.set_head("refs/heads/feature").unwrap();
        repo.checkout_head(None).unwrap();

        create_file(&repo_path, "file2.txt", "feature content");
        stage_and_commit(&repo, "Feature commit");

        repo.set_head(&format!("refs/heads/{}", default_branch)).unwrap();
        repo.checkout_head(None).unwrap();

        let result = merge_branch(
            repo_path.to_str().unwrap().to_string(),
            "feature".to_string(),
            false,
        );
        assert!(result.is_ok());
        assert!(repo_path.join("file2.txt").exists());
    }

    #[test]
    fn test_merge_already_up_to_date() {
        let (_temp, repo_path) = setup_test_repo();
        let repo = Repository::open(&repo_path).unwrap();
        create_file(&repo_path, "file1.txt", "initial");
        stage_and_commit(&repo, "Initial");

        repo.branch(
            "feature",
            &repo.head().unwrap().peel_to_commit().unwrap(),
            false,
        )
        .unwrap();

        let result = merge_branch(
            repo_path.to_str().unwrap().to_string(),
            "feature".to_string(),
            false,
        );
        assert!(result.is_ok());
        assert!(result.unwrap().contains("최신"));
    }
}
