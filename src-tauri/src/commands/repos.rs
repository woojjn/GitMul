use std::fs;
use std::path::PathBuf;

use super::models::RecentRepo;

fn get_config_dir() -> Result<PathBuf, String> {
    let mut path = dirs::config_dir()
        .ok_or_else(|| "설정 디렉토리를 찾을 수 없습니다".to_string())?;
    path.push("gitflow");

    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| format!("설정 디렉토리 생성 실패: {}", e))?;
    }
    Ok(path)
}

fn get_repos_file() -> Result<PathBuf, String> {
    let mut path = get_config_dir()?;
    path.push("recent_repos.json");
    Ok(path)
}

/// Get recently opened repositories.
#[tauri::command]
pub async fn get_recent_repos() -> Result<Vec<RecentRepo>, String> {
    let repos_file = get_repos_file()?;

    if !repos_file.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&repos_file).map_err(|e| format!("파일 읽기 실패: {}", e))?;
    let mut repos: Vec<RecentRepo> =
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());

    repos.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    Ok(repos)
}

/// Add a repository to recent list.
#[tauri::command]
pub async fn add_recent_repo(path: String) -> Result<(), String> {
    let repos_file = get_repos_file()?;

    let mut repos = if repos_file.exists() {
        let content =
            fs::read_to_string(&repos_file).map_err(|e| format!("파일 읽기 실패: {}", e))?;
        serde_json::from_str::<Vec<RecentRepo>>(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };

    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let now = chrono::Utc::now().timestamp();

    // Remove duplicate
    repos.retain(|r| r.path != path);

    repos.push(RecentRepo {
        path,
        name,
        last_opened: now,
    });

    // Keep only the 20 most recent
    if repos.len() > 20 {
        repos.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
        repos.truncate(20);
    }

    let content =
        serde_json::to_string_pretty(&repos).map_err(|e| format!("JSON 직렬화 실패: {}", e))?;
    fs::write(&repos_file, content).map_err(|e| format!("파일 쓰기 실패: {}", e))?;

    Ok(())
}
