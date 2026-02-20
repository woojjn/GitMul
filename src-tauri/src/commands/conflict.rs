use git2::{Repository, Index, IndexEntry, Oid};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConflictFile {
    pub path: String,
    pub our_content: Option<String>,
    pub their_content: Option<String>,
    pub base_content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConflictInfo {
    pub files: Vec<ConflictFile>,
    pub merge_head: Option<String>,
    pub merge_msg: Option<String>,
}

/// Get list of conflicted files
#[tauri::command]
pub fn get_conflicts(repo_path: String) -> Result<ConflictInfo, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let index = repo.index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

    if !index.has_conflicts() {
        return Ok(ConflictInfo {
            files: vec![],
            merge_head: None,
            merge_msg: None,
        });
    }

    let mut conflicts = Vec::new();
    let conflicts_iter = index.conflicts()
        .map_err(|e| format!("충돌 정보 접근 실패: {}", e))?;

    for conflict in conflicts_iter {
        let conflict = conflict.map_err(|e| format!("충돌 항목 읽기 실패: {}", e))?;
        
        let path = if let Some(our) = &conflict.our {
            String::from_utf8_lossy(&our.path).to_string()
        } else if let Some(their) = &conflict.their {
            String::from_utf8_lossy(&their.path).to_string()
        } else if let Some(ancestor) = &conflict.ancestor {
            String::from_utf8_lossy(&ancestor.path).to_string()
        } else {
            continue;
        };

        let our_content = conflict.our.as_ref()
            .and_then(|entry| read_blob_content(&repo, &entry.id));
        
        let their_content = conflict.their.as_ref()
            .and_then(|entry| read_blob_content(&repo, &entry.id));
        
        let base_content = conflict.ancestor.as_ref()
            .and_then(|entry| read_blob_content(&repo, &entry.id));

        conflicts.push(ConflictFile {
            path,
            our_content,
            their_content,
            base_content,
        });
    }

    // Read MERGE_HEAD
    let merge_head = repo.path().join("MERGE_HEAD");
    let merge_head_content = std::fs::read_to_string(merge_head)
        .ok()
        .map(|s| s.trim().to_string());

    // Read MERGE_MSG
    let merge_msg = repo.path().join("MERGE_MSG");
    let merge_msg_content = std::fs::read_to_string(merge_msg)
        .ok()
        .map(|s| s.trim().to_string());

    Ok(ConflictInfo {
        files: conflicts,
        merge_head: merge_head_content,
        merge_msg: merge_msg_content,
    })
}

/// Resolve conflict by choosing a side
#[tauri::command]
pub fn resolve_conflict(
    repo_path: String,
    file_path: String,
    resolution: String, // "ours", "theirs", or "manual"
    content: Option<String>,
) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let file_full_path = Path::new(&repo_path).join(&file_path);

    match resolution.as_str() {
        "ours" => {
            // Keep our version
            let mut index = repo.index()
                .map_err(|e| format!("인덱스 접근 실패: {}", e))?;
            
            let conflict = index.conflicts()
                .map_err(|e| format!("충돌 접근 실패: {}", e))?
                .find(|c| {
                    if let Ok(conflict) = c {
                        if let Some(our) = &conflict.our {
                            return String::from_utf8_lossy(&our.path) == file_path;
                        }
                    }
                    false
                })
                .ok_or("충돌 파일을 찾을 수 없습니다")?
                .map_err(|e| format!("충돌 정보 읽기 실패: {}", e))?;

            if let Some(our) = conflict.our {
                let content = read_blob_content(&repo, &our.id)
                    .ok_or("우리 측 콘텐츠를 읽을 수 없습니다")?;
                std::fs::write(&file_full_path, content)
                    .map_err(|e| format!("파일 쓰기 실패: {}", e))?;
            }
        },
        "theirs" => {
            // Keep their version
            let mut index = repo.index()
                .map_err(|e| format!("인덱스 접근 실패: {}", e))?;
            
            let conflict = index.conflicts()
                .map_err(|e| format!("충돌 접근 실패: {}", e))?
                .find(|c| {
                    if let Ok(conflict) = c {
                        if let Some(their) = &conflict.their {
                            return String::from_utf8_lossy(&their.path) == file_path;
                        }
                    }
                    false
                })
                .ok_or("충돌 파일을 찾을 수 없습니다")?
                .map_err(|e| format!("충돌 정보 읽기 실패: {}", e))?;

            if let Some(their) = conflict.their {
                let content = read_blob_content(&repo, &their.id)
                    .ok_or("상대방 측 콘텐츠를 읽을 수 없습니다")?;
                std::fs::write(&file_full_path, content)
                    .map_err(|e| format!("파일 쓰기 실패: {}", e))?;
            }
        },
        "manual" => {
            // Use provided content
            if let Some(content) = content {
                std::fs::write(&file_full_path, content)
                    .map_err(|e| format!("파일 쓰기 실패: {}", e))?;
            } else {
                return Err("수동 해결 시 콘텐츠가 필요합니다".to_string());
            }
        },
        _ => return Err(format!("알 수 없는 해결 방법: {}", resolution)),
    }

    // Stage the resolved file
    let mut index = repo.index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;
    
    index.add_path(Path::new(&file_path))
        .map_err(|e| format!("파일 스테이징 실패: {}", e))?;
    
    index.write()
        .map_err(|e| format!("인덱스 쓰기 실패: {}", e))?;

    Ok(())
}

/// Abort merge
#[tauri::command]
pub fn abort_merge(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    // Reset to HEAD
    let head = repo.head()
        .map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    
    let commit = head.peel_to_commit()
        .map_err(|e| format!("커밋 접근 실패: {}", e))?;

    repo.reset(&commit.as_object(), git2::ResetType::Hard, None)
        .map_err(|e| format!("리셋 실패: {}", e))?;

    // Remove merge files
    let git_dir = repo.path();
    let _ = std::fs::remove_file(git_dir.join("MERGE_HEAD"));
    let _ = std::fs::remove_file(git_dir.join("MERGE_MSG"));
    let _ = std::fs::remove_file(git_dir.join("MERGE_MODE"));

    Ok(())
}

fn read_blob_content(repo: &Repository, oid: &Oid) -> Option<String> {
    repo.find_blob(*oid)
        .ok()
        .and_then(|blob| String::from_utf8(blob.content().to_vec()).ok())
}
