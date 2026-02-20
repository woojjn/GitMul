use git2::Oid;

use super::models::RevertResult;
use super::utils::open_repo;

/// Revert a commit.
#[tauri::command]
pub fn revert_commit(repo_path: String, commit_sha: String) -> Result<RevertResult, String> {
    let repo = open_repo(&repo_path)?;

    let oid = Oid::from_str(&commit_sha).map_err(|e| format!("잘못된 커밋 SHA: {}", e))?;
    let commit = repo
        .find_commit(oid)
        .map_err(|e| format!("커밋 찾기 실패: {}", e))?;

    repo.revert(&commit, None)
        .map_err(|e| format!("리버트 실패: {}", e))?;

    let index = repo
        .index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

    if index.has_conflicts() {
        let mut conflicts = Vec::new();
        if let Ok(conflicts_iter) = index.conflicts() {
            for conflict in conflicts_iter.flatten() {
                if let Some(our) = conflict.our {
                    conflicts.push(String::from_utf8_lossy(&our.path).to_string());
                }
            }
        }
        let num_conflicts = conflicts.len();
        return Ok(RevertResult {
            success: false,
            conflicts,
            message: format!("리버트 중 충돌이 발생했습니다: {} 개 파일", num_conflicts),
        });
    }

    // Auto-commit
    let sig = repo
        .signature()
        .map_err(|e| format!("서명 생성 실패: {}", e))?;
    let mut index = repo
        .index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;
    let tree_oid = index
        .write_tree()
        .map_err(|e| format!("트리 쓰기 실패: {}", e))?;
    let tree = repo
        .find_tree(tree_oid)
        .map_err(|e| format!("트리 찾기 실패: {}", e))?;
    let head = repo
        .head()
        .map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    let parent = head
        .peel_to_commit()
        .map_err(|e| format!("부모 커밋 접근 실패: {}", e))?;

    let original_msg = commit.message().unwrap_or("No message");
    let message = format!(
        "Revert \"{}\"\n\nThis reverts commit {}.",
        original_msg, commit_sha
    );

    repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &[&parent])
        .map_err(|e| format!("커밋 생성 실패: {}", e))?;

    Ok(RevertResult {
        success: true,
        conflicts: vec![],
        message: "리버트가 성공적으로 완료되었습니다".to_string(),
    })
}
