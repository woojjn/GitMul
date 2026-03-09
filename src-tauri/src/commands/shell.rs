/// Open the repository directory in the system file explorer.
#[tauri::command]
pub async fn open_in_explorer(repo_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(&repo_path)
        .spawn()
        .map_err(|e| format!("탐색기 열기 실패: {}", e))?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&repo_path)
        .spawn()
        .map_err(|e| format!("Finder 열기 실패: {}", e))?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&repo_path)
        .spawn()
        .map_err(|e| format!("파일 관리자 열기 실패: {}", e))?;

    Ok(())
}

/// Open a terminal window at the repository directory.
#[tauri::command]
pub async fn open_terminal(repo_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/c", "start", "cmd"])
        .current_dir(&repo_path)
        .spawn()
        .map_err(|e| format!("터미널 열기 실패: {}", e))?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .args(["-a", "Terminal", &repo_path])
        .spawn()
        .map_err(|e| format!("터미널 열기 실패: {}", e))?;

    #[cfg(target_os = "linux")]
    {
        let terminals = ["gnome-terminal", "xterm", "konsole"];
        let mut opened = false;
        for term in terminals {
            if std::process::Command::new(term)
                .current_dir(&repo_path)
                .spawn()
                .is_ok()
            {
                opened = true;
                break;
            }
        }
        if !opened {
            return Err("터미널을 찾을 수 없습니다".to_string());
        }
    }

    Ok(())
}
