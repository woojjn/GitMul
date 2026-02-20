use git2::{Repository};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReflogEntry {
    pub index: usize,
    pub old_oid: String,
    pub new_oid: String,
    pub message: String,
    pub committer: String,
    pub timestamp: i64,
}

/// Get reflog entries
#[tauri::command]
pub fn get_reflog(
    repo_path: String,
    ref_name: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<ReflogEntry>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let reference = ref_name.unwrap_or_else(|| "HEAD".to_string());
    
    let reflog = repo.reflog(&reference)
        .map_err(|e| format!("Reflog 접근 실패: {}", e))?;

    let max_entries = limit.unwrap_or(100);
    let mut entries = Vec::new();

    for (index, entry) in reflog.iter().enumerate().take(max_entries) {
        entries.push(ReflogEntry {
            index,
            old_oid: entry.id_old().to_string(),
            new_oid: entry.id_new().to_string(),
            message: entry.message().unwrap_or("No message").to_string(),
            committer: format!("{} <{}>",
                entry.committer().name().unwrap_or("Unknown"),
                entry.committer().email().unwrap_or("unknown@example.com")
            ),
            timestamp: entry.committer().when().seconds(),
        });
    }

    Ok(entries)
}

/// Reset to a reflog entry
#[tauri::command]
pub fn reset_to_reflog(
    repo_path: String,
    ref_name: String,
    reset_type: String, // "soft", "mixed", "hard"
) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let obj = repo.revparse_single(&ref_name)
        .map_err(|e| format!("참조 찾기 실패: {}", e))?;

    let reset_type = match reset_type.as_str() {
        "soft" => git2::ResetType::Soft,
        "mixed" => git2::ResetType::Mixed,
        "hard" => git2::ResetType::Hard,
        _ => return Err(format!("알 수 없는 리셋 타입: {}", reset_type)),
    };

    repo.reset(&obj, reset_type, None)
        .map_err(|e| format!("리셋 실패: {}", e))?;

    Ok(())
}
