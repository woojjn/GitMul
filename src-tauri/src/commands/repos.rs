use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentRepo {
    pub path: String,
    pub name: String,
    pub last_opened: i64,
}

fn get_config_dir() -> Result<PathBuf, String> {
    let mut path = dirs::config_dir()
        .ok_or_else(|| "설정 디렉토리를 찾을 수 없습니다".to_string())?;
    path.push("gitflow");
    
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    
    Ok(path)
}

fn get_repos_file() -> Result<PathBuf, String> {
    let mut path = get_config_dir()?;
    path.push("recent_repos.json");
    Ok(path)
}

#[tauri::command]
pub async fn get_recent_repos() -> Result<Vec<RecentRepo>, String> {
    let repos_file = get_repos_file()?;
    
    if !repos_file.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&repos_file).map_err(|e| e.to_string())?;
    let mut repos: Vec<RecentRepo> = serde_json::from_str(&content)
        .unwrap_or_else(|_| Vec::new());
    
    // 최근 순으로 정렬
    repos.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    
    Ok(repos)
}

#[tauri::command]
pub async fn add_recent_repo(path: String) -> Result<(), String> {
    let repos_file = get_repos_file()?;
    
    let mut repos = if repos_file.exists() {
        let content = fs::read_to_string(&repos_file).map_err(|e| e.to_string())?;
        serde_json::from_str::<Vec<RecentRepo>>(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    // 레포지토리 이름 추출
    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();
    
    let now = chrono::Utc::now().timestamp();
    
    // 중복 제거
    repos.retain(|r| r.path != path);
    
    // 새 레포 추가
    repos.push(RecentRepo {
        path,
        name,
        last_opened: now,
    });
    
    // 최대 20개만 유지
    if repos.len() > 20 {
        repos.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
        repos.truncate(20);
    }
    
    // 저장
    let content = serde_json::to_string_pretty(&repos).map_err(|e| e.to_string())?;
    fs::write(&repos_file, content).map_err(|e| e.to_string())?;
    
    Ok(())
}
