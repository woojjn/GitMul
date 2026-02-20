use std::path::Path;
use chrono::{Utc, TimeZone};

use super::models::{CommitInfo, FileStatus, RepositoryInfo};
use super::utils::{normalize_unicode, open_repo, ensure_utf8_config};

/// Open a repository and return its metadata.
#[tauri::command]
pub async fn open_repository(path: String) -> Result<RepositoryInfo, String> {
    let repo = open_repo(&path)?;
    ensure_utf8_config(&repo)?;

    let head = repo.head().map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    let branch = head.shorthand().unwrap_or("detached").to_string();

    let remote_url = repo
        .find_remote("origin")
        .ok()
        .and_then(|remote| remote.url().map(|s| s.to_string()));

    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    Ok(RepositoryInfo {
        path: normalize_unicode(&path),
        name,
        current_branch: branch,
        remote_url,
    })
}

/// Get commit history (most recent first).
#[tauri::command]
pub async fn get_commit_history(
    repo_path: String,
    limit: usize,
) -> Result<Vec<CommitInfo>, String> {
    let repo = open_repo(&repo_path)?;

    let mut revwalk = repo.revwalk().map_err(|e| format!("Revwalk 생성 실패: {}", e))?;
    revwalk.push_head().map_err(|e| format!("HEAD 접근 실패: {}", e))?;
    revwalk
        .set_sorting(git2::Sort::TIME)
        .map_err(|e| format!("정렬 설정 실패: {}", e))?;

    let mut commits = Vec::new();

    for (idx, oid_result) in revwalk.enumerate() {
        if idx >= limit {
            break;
        }

        let oid = oid_result.map_err(|e| format!("OID 읽기 실패: {}", e))?;
        let commit = repo.find_commit(oid).map_err(|e| format!("커밋 찾기 실패: {}", e))?;

        let timestamp = commit.time().seconds();
        let datetime = Utc.timestamp_opt(timestamp, 0).unwrap();

        let parent_ids: Vec<String> = commit.parent_ids().map(|oid| oid.to_string()).collect();

        commits.push(CommitInfo {
            sha: oid.to_string(),
            author: commit.author().name().unwrap_or("Unknown").to_string(),
            email: commit.author().email().unwrap_or("").to_string(),
            message: commit.message().unwrap_or("").to_string(),
            timestamp,
            date: datetime.format("%Y-%m-%d %H:%M:%S").to_string(),
            parent_ids,
        });
    }

    Ok(commits)
}

/// Get repository status (changed files list).
#[tauri::command]
pub async fn get_repository_status(repo_path: String) -> Result<Vec<FileStatus>, String> {
    let repo = open_repo(&repo_path)?;
    let statuses = repo
        .statuses(None)
        .map_err(|e| format!("상태 조회 실패: {}", e))?;

    let mut files = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let file_path = normalize_unicode(entry.path().unwrap_or(""));

        let is_index_changed =
            status.is_index_new() || status.is_index_modified() || status.is_index_deleted();
        let is_wt_changed =
            status.is_wt_new() || status.is_wt_modified() || status.is_wt_deleted();

        if is_index_changed {
            let staged_status = if status.is_index_new() {
                "added"
            } else if status.is_index_modified() {
                "modified"
            } else if status.is_index_deleted() {
                "deleted"
            } else {
                "staged"
            };
            files.push(FileStatus {
                path: file_path.clone(),
                status: staged_status.to_string(),
                staged: true,
            });
        }

        if is_wt_changed {
            let unstaged_status = if status.is_wt_new() {
                "untracked"
            } else if status.is_wt_modified() {
                "modified"
            } else if status.is_wt_deleted() {
                "deleted"
            } else {
                "unknown"
            };
            files.push(FileStatus {
                path: file_path,
                status: unstaged_status.to_string(),
                staged: false,
            });
        }
    }

    Ok(files)
}

/// Stage a file (add to index).
#[tauri::command]
pub async fn stage_file(repo_path: String, path: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut index = repo
        .index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

    let full_path = std::path::Path::new(&repo_path).join(&path);

    if full_path.exists() {
        index
            .add_path(Path::new(&path))
            .map_err(|e| format!("파일 스테이징 실패: {}", e))?;
    } else {
        index
            .remove_path(Path::new(&path))
            .map_err(|e| format!("삭제된 파일 스테이징 실패: {}", e))?;
    }

    index
        .write()
        .map_err(|e| format!("인덱스 쓰기 실패: {}", e))?;
    Ok(())
}

/// Unstage a file (remove from index).
#[tauri::command]
pub async fn unstage_file(repo_path: String, path: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut index = repo
        .index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;
    let file_path = Path::new(&path);

    match repo.head() {
        Ok(head) => {
            let head_commit = head
                .peel_to_commit()
                .map_err(|e| format!("HEAD 커밋 접근 실패: {}", e))?;
            let head_tree = head_commit
                .tree()
                .map_err(|e| format!("트리 접근 실패: {}", e))?;

            if let Ok(entry) = head_tree.get_path(file_path) {
                let blob = repo
                    .find_blob(entry.id())
                    .map_err(|e| format!("Blob 접근 실패: {}", e))?;
                let index_entry = git2::IndexEntry {
                    ctime: git2::IndexTime::new(0, 0),
                    mtime: git2::IndexTime::new(0, 0),
                    dev: 0,
                    ino: 0,
                    mode: entry.filemode() as u32,
                    uid: 0,
                    gid: 0,
                    file_size: blob.content().len() as u32,
                    id: entry.id(),
                    flags: 0,
                    flags_extended: 0,
                    path: path.as_bytes().to_vec(),
                };
                index
                    .add_frombuffer(&index_entry, blob.content())
                    .map_err(|e| format!("인덱스 항목 복원 실패: {}", e))?;
            } else {
                index
                    .remove_path(file_path)
                    .map_err(|e| format!("인덱스 항목 제거 실패: {}", e))?;
            }
        }
        Err(_) => {
            // No HEAD yet (before first commit)
            index
                .remove_path(file_path)
                .map_err(|e| format!("인덱스 항목 제거 실패: {}", e))?;
        }
    }

    index
        .write()
        .map_err(|e| format!("인덱스 쓰기 실패: {}", e))?;
    Ok(())
}

/// Stage all modified files.
#[tauri::command]
pub async fn stage_all(repo_path: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut index = repo
        .index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;

    index
        .add_all(
            ["."].iter(),
            git2::IndexAddOption::DEFAULT | git2::IndexAddOption::CHECK_PATHSPEC,
            None,
        )
        .map_err(|e| format!("전체 스테이징 실패: {}", e))?;

    index
        .update_all(["."].iter(), None)
        .map_err(|e| format!("삭제된 파일 업데이트 실패: {}", e))?;

    index
        .write()
        .map_err(|e| format!("인덱스 쓰기 실패: {}", e))?;
    Ok(())
}

/// Create a new commit.
#[tauri::command]
pub async fn create_commit(repo_path: String, message: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    ensure_utf8_config(&repo)?;

    let signature = repo
        .signature()
        .map_err(|e| format!("Git 사용자 정보를 찾을 수 없습니다: {}", e))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("인덱스 접근 실패: {}", e))?;
    let tree_id = index
        .write_tree()
        .map_err(|e| format!("트리 쓰기 실패: {}", e))?;
    let tree = repo
        .find_tree(tree_id)
        .map_err(|e| format!("트리 찾기 실패: {}", e))?;

    let parent_commit = match repo.head() {
        Ok(head) => Some(
            head.peel_to_commit()
                .map_err(|e| format!("HEAD 커밋 접근 실패: {}", e))?,
        ),
        Err(_) => None,
    };

    let parents = if let Some(ref parent) = parent_commit {
        vec![parent]
    } else {
        vec![]
    };

    let oid = repo
        .commit(
            Some("HEAD"),
            &signature,
            &signature,
            &message,
            &tree,
            &parents,
        )
        .map_err(|e| format!("커밋 생성 실패: {}", e))?;

    Ok(format!("커밋 성공: {}", oid))
}
