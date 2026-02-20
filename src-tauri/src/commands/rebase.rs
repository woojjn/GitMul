use git2::{Repository, RebaseOptions};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct RebaseInfo {
    pub in_progress: bool,
    pub current_operation: Option<usize>,
    pub total_operations: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RebaseResult {
    pub success: bool,
    pub conflicts: Vec<String>,
    pub message: String,
}

/// Start interactive rebase
#[tauri::command]
pub fn start_rebase(
    repo_path: String,
    onto: String,
) -> Result<RebaseResult, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let onto_commit = repo.revparse_single(&onto)
        .and_then(|obj| obj.peel_to_commit())
        .map_err(|e| format!("Onto 커밋 찾기 실패: {}", e))?;

    let head = repo.head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| format!("HEAD 접근 실패: {}", e))?;

    let annotated_head = repo.find_annotated_commit(head.id())
        .map_err(|e| format!("Annotated commit 생성 실패: {}", e))?;
    let annotated_onto = repo.find_annotated_commit(onto_commit.id())
        .map_err(|e| format!("Annotated commit 생성 실패: {}", e))?;

    let mut opts = RebaseOptions::new();
    let mut rebase = repo.rebase(Some(&annotated_head), Some(&annotated_onto), None, Some(&mut opts))
        .map_err(|e| format!("Rebase 시작 실패: {}", e))?;

    // Perform rebase operations
    let mut conflicts = Vec::new();
    while let Some(op) = rebase.next() {
        match op {
            Ok(_) => {
                if let Err(e) = rebase.commit(None, &repo.signature().unwrap(), None) {
                    conflicts.push(format!("커밋 중 오류: {}", e));
                }
            },
            Err(e) => {
                conflicts.push(format!("Rebase 작업 실패: {}", e));
                break;
            }
        }
    }

    if conflicts.is_empty() {
        rebase.finish(None)
            .map_err(|e| format!("Rebase 완료 실패: {}", e))?;

        Ok(RebaseResult {
            success: true,
            conflicts: vec![],
            message: "Rebase가 성공적으로 완료되었습니다".to_string(),
        })
    } else {
        Ok(RebaseResult {
            success: false,
            conflicts,
            message: "Rebase 중 충돌이 발생했습니다".to_string(),
        })
    }
}

/// Continue rebase after resolving conflicts
#[tauri::command]
pub fn rebase_continue(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let mut rebase = repo.open_rebase(None)
        .map_err(|e| format!("Rebase 상태 열기 실패: {}", e))?;

    let sig = repo.signature()
        .map_err(|e| format!("서명 생성 실패: {}", e))?;

    rebase.commit(None, &sig, None)
        .map_err(|e| format!("커밋 실패: {}", e))?;

    // Continue remaining operations
    while let Some(op) = rebase.next() {
        op.map_err(|e| format!("Rebase 작업 실패: {}", e))?;
        rebase.commit(None, &sig, None)
            .map_err(|e| format!("커밋 실패: {}", e))?;
    }

    rebase.finish(None)
        .map_err(|e| format!("Rebase 완료 실패: {}", e))?;

    Ok(())
}

/// Abort rebase
#[tauri::command]
pub fn rebase_abort(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let mut rebase = repo.open_rebase(None)
        .map_err(|e| format!("Rebase 상태 열기 실패: {}", e))?;

    rebase.abort()
        .map_err(|e| format!("Rebase 중단 실패: {}", e))?;

    Ok(())
}

/// Get rebase status
#[tauri::command]
pub fn get_rebase_status(repo_path: String) -> Result<RebaseInfo, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let result = match repo.open_rebase(None) {
        Ok(mut rebase) => {
            RebaseInfo {
                in_progress: true,
                current_operation: Some(rebase.operation_current().unwrap_or(0)),
                total_operations: Some(rebase.len()),
            }
        },
        Err(_) => {
            RebaseInfo {
                in_progress: false,
                current_operation: None,
                total_operations: None,
            }
        }
    };

    Ok(result)
}
