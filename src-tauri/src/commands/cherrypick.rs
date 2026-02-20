use git2::{Repository, Oid};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CherryPickResult {
    pub success: bool,
    pub conflicts: Vec<String>,
    pub message: String,
}

/// Cherry-pick a commit
#[tauri::command]
pub fn cherry_pick(repo_path: String, commit_sha: String) -> Result<CherryPickResult, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let oid = Oid::from_str(&commit_sha)
        .map_err(|e| format!("잘못된 커밋 SHA: {}", e))?;

    let commit = repo.find_commit(oid)
        .map_err(|e| format!("커밋 찾기 실패: {}", e))?;

    // Perform cherry-pick
    let result = repo.cherrypick(&commit, None);

    match result {
        Ok(()) => {
            let index = repo.index()
                .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

            if index.has_conflicts() {
                let mut conflicts = Vec::new();
                if let Ok(conflicts_iter) = index.conflicts() {
                    for conflict in conflicts_iter {
                        if let Ok(c) = conflict {
                            if let Some(our) = c.our {
                                conflicts.push(String::from_utf8_lossy(&our.path).to_string());
                            }
                        }
                    }
                }

                let num_conflicts = conflicts.len();
                Ok(CherryPickResult {
                    success: false,
                    conflicts,
                    message: format!("체리픽 중 충돌이 발생했습니다: {} 개 파일", num_conflicts),
                })
            } else {
                // Auto-commit if no conflicts
                let sig = repo.signature()
                    .map_err(|e| format!("서명 생성 실패: {}", e))?;

                let mut index = repo.index()
                    .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

                let tree_oid = index.write_tree()
                    .map_err(|e| format!("트리 쓰기 실패: {}", e))?;

                let tree = repo.find_tree(tree_oid)
                    .map_err(|e| format!("트리 찾기 실패: {}", e))?;

                let head = repo.head()
                    .map_err(|e| format!("HEAD 접근 실패: {}", e))?;
                
                let parent = head.peel_to_commit()
                    .map_err(|e| format!("부모 커밋 접근 실패: {}", e))?;

                let message = format!("Cherry-pick: {}", commit.message().unwrap_or("No message"));

                repo.commit(
                    Some("HEAD"),
                    &sig,
                    &sig,
                    &message,
                    &tree,
                    &[&parent],
                )
                .map_err(|e| format!("커밋 생성 실패: {}", e))?;

                Ok(CherryPickResult {
                    success: true,
                    conflicts: vec![],
                    message: "체리픽이 성공적으로 완료되었습니다".to_string(),
                })
            }
        },
        Err(e) => Err(format!("체리픽 실패: {}", e)),
    }
}

/// Continue cherry-pick after resolving conflicts
#[tauri::command]
pub fn cherry_pick_continue(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let index = repo.index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

    if index.has_conflicts() {
        return Err("아직 해결되지 않은 충돌이 있습니다".to_string());
    }

    let sig = repo.signature()
        .map_err(|e| format!("서명 생성 실패: {}", e))?;

    let mut index = repo.index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

    let tree_oid = index.write_tree()
        .map_err(|e| format!("트리 쓰기 실패: {}", e))?;

    let tree = repo.find_tree(tree_oid)
        .map_err(|e| format!("트리 찾기 실패: {}", e))?;

    let head = repo.head()
        .map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    
    let parent = head.peel_to_commit()
        .map_err(|e| format!("부모 커밋 접근 실패: {}", e))?;

    // Read CHERRY_PICK_HEAD for message
    let git_dir = repo.path();
    let cherry_msg = git_dir.join("MERGE_MSG");
    let message = std::fs::read_to_string(cherry_msg)
        .unwrap_or_else(|_| "Cherry-pick commit".to_string());

    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &message,
        &tree,
        &[&parent],
    )
    .map_err(|e| format!("커밋 생성 실패: {}", e))?;

    // Cleanup
    let _ = std::fs::remove_file(git_dir.join("CHERRY_PICK_HEAD"));
    let _ = std::fs::remove_file(git_dir.join("MERGE_MSG"));

    Ok(())
}

/// Abort cherry-pick
#[tauri::command]
pub fn cherry_pick_abort(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let head = repo.head()
        .map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    
    let commit = head.peel_to_commit()
        .map_err(|e| format!("커밋 접근 실패: {}", e))?;

    repo.reset(&commit.as_object(), git2::ResetType::Hard, None)
        .map_err(|e| format!("리셋 실패: {}", e))?;

    // Cleanup
    let git_dir = repo.path();
    let _ = std::fs::remove_file(git_dir.join("CHERRY_PICK_HEAD"));
    let _ = std::fs::remove_file(git_dir.join("MERGE_MSG"));

    Ok(())
}
