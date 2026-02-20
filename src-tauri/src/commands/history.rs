use git2::{DiffOptions, Oid};

use super::models::FileHistoryEntry;
use super::utils::open_repo;

/// Get file history (commits that modified a specific file).
#[tauri::command]
pub fn get_file_history(
    repo_path: String,
    file_path: String,
    limit: Option<usize>,
) -> Result<Vec<FileHistoryEntry>, String> {
    let repo = open_repo(&repo_path)?;

    let mut revwalk = repo
        .revwalk()
        .map_err(|e| format!("Revwalk 생성 실패: {}", e))?;
    revwalk
        .push_head()
        .map_err(|e| format!("HEAD 접근 실패: {}", e))?;

    let max_commits = limit.unwrap_or(100);
    let mut history = Vec::new();

    for oid in revwalk {
        if history.len() >= max_commits {
            break;
        }

        let oid = oid.map_err(|e| format!("OID 읽기 실패: {}", e))?;
        let commit = repo
            .find_commit(oid)
            .map_err(|e| format!("커밋 찾기 실패: {}", e))?;

        let tree = commit
            .tree()
            .map_err(|e| format!("트리 접근 실패: {}", e))?;

        let parent_tree = if commit.parent_count() > 0 {
            Some(
                commit
                    .parent(0)
                    .and_then(|p| p.tree())
                    .map_err(|e| format!("부모 트리 접근 실패: {}", e))?,
            )
        } else {
            None
        };

        let mut opts = DiffOptions::new();
        opts.pathspec(&file_path);

        let diff = repo
            .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut opts))
            .map_err(|e| format!("Diff 생성 실패: {}", e))?;

        if diff.deltas().len() > 0 {
            let delta = diff.deltas().next().unwrap();
            let status = match delta.status() {
                git2::Delta::Added => "added",
                git2::Delta::Deleted => "deleted",
                git2::Delta::Modified => "modified",
                git2::Delta::Renamed => "renamed",
                _ => "unknown",
            };

            let old_path = if status == "renamed" {
                delta
                    .old_file()
                    .path()
                    .map(|p| p.to_string_lossy().to_string())
            } else {
                None
            };

            history.push(FileHistoryEntry {
                commit_sha: oid.to_string(),
                message: commit.message().unwrap_or("No message").to_string(),
                author: format!(
                    "{} <{}>",
                    commit.author().name().unwrap_or("Unknown"),
                    commit.author().email().unwrap_or("unknown@example.com")
                ),
                date: commit.time().seconds(),
                changes: status.to_string(),
                old_path,
            });
        }
    }

    Ok(history)
}

/// Get file content at specific commit.
#[tauri::command]
pub fn get_file_at_commit(
    repo_path: String,
    commit_sha: String,
    file_path: String,
) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;

    let oid = Oid::from_str(&commit_sha).map_err(|e| format!("잘못된 커밋 SHA: {}", e))?;
    let commit = repo
        .find_commit(oid)
        .map_err(|e| format!("커밋 찾기 실패: {}", e))?;
    let tree = commit
        .tree()
        .map_err(|e| format!("트리 접근 실패: {}", e))?;

    let entry = tree
        .get_path(std::path::Path::new(&file_path))
        .map_err(|e| format!("파일 찾기 실패: {}", e))?;
    let blob = repo
        .find_blob(entry.id())
        .map_err(|e| format!("Blob 찾기 실패: {}", e))?;

    String::from_utf8(blob.content().to_vec()).map_err(|e| format!("UTF-8 변환 실패: {}", e))
}
