use git2::{Repository, Oid, Time, DiffOptions};
use serde::{Deserialize, Serialize};
use std::path::Path;
use chrono::{DateTime, Utc, TimeZone};
use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Serialize, Deserialize)]
pub struct CommitInfo {
    pub id: String,
    pub author: String,
    pub email: String,
    pub message: String,
    pub timestamp: i64,
    pub date: String,
    pub parent_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepositoryInfo {
    pub path: String,
    pub branch: String,
    pub remote_url: Option<String>,
}

/// 유니코드 정규화 (macOS NFD → NFC)
fn normalize_path(path: &str) -> String {
    path.nfc().collect::<String>()
}

/// Git 설정 자동 체크 (한글 지원)
fn ensure_utf8_config(repo: &Repository) -> Result<(), String> {
    let mut config = repo.config().map_err(|e| e.to_string())?;
    
    // core.quotepath = false (한글 파일명 표시)
    if config.get_bool("core.quotepath").unwrap_or(true) {
        config.set_bool("core.quotepath", false)
            .map_err(|e| e.to_string())?;
    }
    
    // 인코딩 설정
    config.set_str("i18n.commitEncoding", "utf-8")
        .map_err(|e| e.to_string())?;
    config.set_str("i18n.logOutputEncoding", "utf-8")
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// 레포지토리 열기
#[tauri::command]
pub async fn open_repository(path: String) -> Result<RepositoryInfo, String> {
    let repo = Repository::open(&path)
        .map_err(|e| format!("레포지토리를 열 수 없습니다: {}", e))?;
    
    // UTF-8 설정 자동 적용
    ensure_utf8_config(&repo)?;
    
    // 현재 브랜치
    let head = repo.head().map_err(|e| e.to_string())?;
    let branch = head.shorthand().unwrap_or("detached").to_string();
    
    // 리모트 URL
    let remote_url = repo.find_remote("origin")
        .ok()
        .and_then(|remote| remote.url().map(|s| s.to_string()));
    
    Ok(RepositoryInfo {
        path: normalize_path(&path),
        branch,
        remote_url,
    })
}

/// 커밋 히스토리 가져오기
#[tauri::command]
pub async fn get_commit_history(path: String, limit: usize) -> Result<Vec<CommitInfo>, String> {
    let repo = Repository::open(&path)
        .map_err(|e| format!("레포지토리를 열 수 없습니다: {}", e))?;
    
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;
    revwalk.set_sorting(git2::Sort::TIME).map_err(|e| e.to_string())?;
    
    let mut commits = Vec::new();
    
    for (idx, oid_result) in revwalk.enumerate() {
        if idx >= limit {
            break;
        }
        
        let oid = oid_result.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        
        let time = commit.time();
        let timestamp = time.seconds();
        let datetime = Utc.timestamp_opt(timestamp, 0).unwrap();
        
        let parent_ids: Vec<String> = commit.parent_ids()
            .map(|oid| oid.to_string())
            .collect();
        
        commits.push(CommitInfo {
            id: oid.to_string(),
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

/// 레포지토리 상태 가져오기 (변경된 파일 목록)
#[tauri::command]
pub async fn get_repository_status(path: String) -> Result<Vec<FileStatus>, String> {
    let repo = Repository::open(&path)
        .map_err(|e| format!("레포지토리를 열 수 없습니다: {}", e))?;
    
    let statuses = repo.statuses(None).map_err(|e| e.to_string())?;
    
    let mut files = Vec::new();
    
    for entry in statuses.iter() {
        let status = entry.status();
        let path = normalize_path(entry.path().unwrap_or(""));
        
        let status_str = if status.is_index_new() || status.is_index_modified() || status.is_index_deleted() {
            "staged"
        } else if status.is_wt_new() {
            "untracked"
        } else if status.is_wt_modified() {
            "modified"
        } else if status.is_wt_deleted() {
            "deleted"
        } else {
            "unknown"
        };
        
        files.push(FileStatus {
            path,
            status: status_str.to_string(),
            staged: status.is_index_new() || status.is_index_modified() || status.is_index_deleted(),
        });
    }
    
    Ok(files)
}

/// 파일 Stage (인덱스에 추가)
#[tauri::command]
pub async fn stage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리를 열 수 없습니다: {}", e))?;
    
    let mut index = repo.index().map_err(|e| e.to_string())?;
    
    // 파일을 인덱스에 추가
    index.add_path(Path::new(&file_path))
        .map_err(|e| format!("파일 스테이징 실패: {}", e))?;
    
    index.write().map_err(|e| e.to_string())?;
    
    Ok(())
}

/// 파일 Unstage (인덱스에서 제거)
#[tauri::command]
pub async fn unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리를 열 수 없습니다: {}", e))?;
    
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    let head_tree = head_commit.tree().map_err(|e| e.to_string())?;
    
    let mut index = repo.index().map_err(|e| e.to_string())?;
    
    // HEAD의 상태로 되돌림
    let path = Path::new(&file_path);
    if let Ok(entry) = head_tree.get_path(path) {
        let blob = repo.find_blob(entry.id())
            .map_err(|e| e.to_string())?;
        // Reset index entry to HEAD state
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
            path: file_path.as_bytes().to_vec(),
        };
        index.add_frombuffer(&index_entry, blob.content())
            .map_err(|e| e.to_string())?;
    } else {
        // 새 파일인 경우 인덱스에서 제거
        index.remove_path(path).map_err(|e| e.to_string())?;
    }
    
    index.write().map_err(|e| e.to_string())?;
    
    Ok(())
}

/// 모든 파일 Stage
#[tauri::command]
pub async fn stage_all(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리를 열 수 없습니다: {}", e))?;
    
    let mut index = repo.index().map_err(|e| e.to_string())?;
    
    // 모든 변경사항을 인덱스에 추가
    index.add_all(["."].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("전체 스테이징 실패: {}", e))?;
    
    index.write().map_err(|e| e.to_string())?;
    
    Ok(())
}

/// 커밋 생성
#[tauri::command]
pub async fn create_commit(repo_path: String, message: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("레포지토리를 열 수 없습니다: {}", e))?;
    
    // UTF-8 설정 확인
    ensure_utf8_config(&repo)?;
    
    let signature = repo.signature()
        .map_err(|e| format!("Git 사용자 정보를 찾을 수 없습니다: {}", e))?;
    
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    
    // 부모 커밋 찾기
    let parent_commit = match repo.head() {
        Ok(head) => {
            Some(head.peel_to_commit().map_err(|e| e.to_string())?)
        }
        Err(_) => None, // 첫 커밋
    };
    
    let parents = if let Some(ref parent) = parent_commit {
        vec![parent]
    } else {
        vec![]
    };
    
    // 커밋 생성
    let oid = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        &message,
        &tree,
        &parents,
    ).map_err(|e| format!("커밋 생성 실패: {}", e))?;
    
    Ok(format!("커밋 성공: {}", oid))
}
