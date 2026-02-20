use git2::{Repository, Oid};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagInfo {
    pub name: String,
    pub target: String,
    pub message: Option<String>,
    pub tagger: Option<String>,
    pub date: Option<i64>,
}

/// List all tags
#[tauri::command]
pub fn list_tags(repo_path: String) -> Result<Vec<TagInfo>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let mut tags = Vec::new();
    let tag_names = repo.tag_names(None)
        .map_err(|e| format!("태그 목록 가져오기 실패: {}", e))?;

    for tag_name in tag_names.iter() {
        if let Some(name) = tag_name {
            if let Ok(obj) = repo.revparse_single(&format!("refs/tags/{}", name)) {
                let target = obj.id().to_string();
                
                // Try to get annotated tag info
                let (message, tagger, date) = if let Ok(tag) = obj.as_tag() {
                    (
                        tag.message().map(|s| s.to_string()),
                        tag.tagger().map(|t| format!("{} <{}>", t.name().unwrap_or(""), t.email().unwrap_or(""))),
                        tag.tagger().map(|t| t.when().seconds()),
                    )
                } else {
                    (None, None, None)
                };

                tags.push(TagInfo {
                    name: name.to_string(),
                    target,
                    message,
                    tagger,
                    date,
                });
            }
        }
    }

    // Sort by date (newest first)
    tags.sort_by(|a, b| {
        match (b.date, a.date) {
            (Some(b_date), Some(a_date)) => b_date.cmp(&a_date),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => a.name.cmp(&b.name),
        }
    });

    Ok(tags)
}

/// Create a lightweight tag
#[tauri::command]
pub fn create_tag(
    repo_path: String,
    tag_name: String,
    target: Option<String>,
) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    // Get target object
    let target_obj = if let Some(target_ref) = target {
        repo.revparse_single(&target_ref)
            .map_err(|e| format!("타겟 찾기 실패: {}", e))?
    } else {
        repo.head()
            .and_then(|h| h.peel(git2::ObjectType::Commit))
            .map_err(|e| format!("HEAD 찾기 실패: {}", e))?
    };

    // Create lightweight tag
    repo.tag_lightweight(&tag_name, &target_obj, false)
        .map_err(|e| format!("태그 생성 실패: {}", e))?;

    Ok(())
}

/// Create an annotated tag
#[tauri::command]
pub fn create_annotated_tag(
    repo_path: String,
    tag_name: String,
    message: String,
    target: Option<String>,
) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    // Get target object
    let target_obj = if let Some(target_ref) = target {
        repo.revparse_single(&target_ref)
            .map_err(|e| format!("타겟 찾기 실패: {}", e))?
    } else {
        repo.head()
            .and_then(|h| h.peel(git2::ObjectType::Commit))
            .map_err(|e| format!("HEAD 찾기 실패: {}", e))?
    };

    let sig = repo.signature()
        .map_err(|e| format!("서명 생성 실패: {}", e))?;

    // Create annotated tag
    repo.tag(&tag_name, &target_obj, &sig, &message, false)
        .map_err(|e| format!("태그 생성 실패: {}", e))?;

    Ok(())
}

/// Delete a tag
#[tauri::command]
pub fn delete_tag(repo_path: String, tag_name: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    repo.tag_delete(&tag_name)
        .map_err(|e| format!("태그 삭제 실패: {}", e))?;

    Ok(())
}

/// Push tag to remote
#[tauri::command]
pub fn push_tag(
    repo_path: String,
    remote_name: String,
    tag_name: String,
) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리 열기 실패: {}", e))?;

    let mut remote = repo.find_remote(&remote_name)
        .map_err(|e| format!("원격 찾기 실패: {}", e))?;

    let refspec = format!("refs/tags/{}:refs/tags/{}", tag_name, tag_name);
    
    remote.push(&[&refspec], None)
        .map_err(|e| format!("태그 푸시 실패: {}", e))?;

    Ok(())
}
