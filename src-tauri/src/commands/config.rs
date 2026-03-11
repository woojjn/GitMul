use std::collections::HashMap;
use super::utils::open_repo;

/// Get git config entries for the repository.
/// Returns local config values for common keys.
#[tauri::command]
pub async fn get_git_config(repo_path: String) -> Result<HashMap<String, String>, String> {
    let repo = open_repo(&repo_path)?;
    let mut config = repo.config().map_err(|e| format!("Git 설정 접근 실패: {}", e))?;
    let snapshot = config.snapshot().map_err(|e| format!("Git 설정 스냅샷 실패: {}", e))?;

    let keys = [
        "user.name",
        "user.email",
        "core.autocrlf",
        "core.eol",
        "core.ignorecase",
        "core.quotepath",
        "core.filemode",
        "i18n.commitEncoding",
        "i18n.logOutputEncoding",
        "pull.rebase",
        "push.default",
        "merge.ff",
    ];

    let mut result = HashMap::new();
    for key in &keys {
        if let Ok(val) = snapshot.get_str(key) {
            result.insert(key.to_string(), val.to_string());
        }
    }

    Ok(result)
}

/// Set a git config value (local scope).
#[tauri::command]
pub async fn set_git_config(repo_path: String, key: String, value: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut config = repo.config().map_err(|e| format!("Git 설정 접근 실패: {}", e))?;

    // Handle boolean-like values
    match value.to_lowercase().as_str() {
        "true" => config.set_bool(&key, true).map_err(|e| format!("설정 변경 실패: {}", e))?,
        "false" => config.set_bool(&key, false).map_err(|e| format!("설정 변경 실패: {}", e))?,
        _ => config.set_str(&key, &value).map_err(|e| format!("설정 변경 실패: {}", e))?,
    }

    Ok(())
}

/// Remove a git config key (local scope).
#[tauri::command]
pub async fn remove_git_config(repo_path: String, key: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut config = repo.config().map_err(|e| format!("Git 설정 접근 실패: {}", e))?;

    config.remove(&key).map_err(|e| format!("설정 삭제 실패: {}", e))?;
    Ok(())
}

/// Get the remote URL for a given remote name.
#[tauri::command]
pub async fn get_remote_url(repo_path: String, remote_name: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let remote = repo.find_remote(&remote_name).map_err(|e| format!("리모트 조회 실패: {}", e))?;
    Ok(remote.url().unwrap_or("").to_string())
}

/// Set the remote URL for a given remote name.
#[tauri::command]
pub async fn set_remote_url(repo_path: String, remote_name: String, url: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    repo.remote_set_url(&remote_name, &url)
        .map_err(|e| format!("리모트 URL 변경 실패: {}", e))?;
    Ok(())
}

/// List git hooks and their enabled status.
/// Returns a map of hook name -> (exists, content_preview).
#[tauri::command]
pub async fn list_git_hooks(repo_path: String) -> Result<Vec<HookInfo>, String> {
    let repo = open_repo(&repo_path)?;
    let hooks_dir = repo.path().join("hooks");

    let hook_names = [
        "pre-commit",
        "prepare-commit-msg",
        "commit-msg",
        "post-commit",
        "pre-push",
        "pre-rebase",
        "post-merge",
        "post-checkout",
    ];

    let mut hooks = Vec::new();
    for name in &hook_names {
        let hook_path = hooks_dir.join(name);
        let sample_path = hooks_dir.join(format!("{}.sample", name));
        let exists = hook_path.exists();
        let has_sample = sample_path.exists();

        hooks.push(HookInfo {
            name: name.to_string(),
            enabled: exists,
            has_sample,
        });
    }

    Ok(hooks)
}

/// Toggle a git hook (rename to/from .sample).
#[tauri::command]
pub async fn toggle_git_hook(repo_path: String, hook_name: String, enable: bool) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let hooks_dir = repo.path().join("hooks");
    let hook_path = hooks_dir.join(&hook_name);
    let sample_path = hooks_dir.join(format!("{}.sample", hook_name));

    if enable {
        // Enable: rename .sample to active
        if sample_path.exists() && !hook_path.exists() {
            std::fs::rename(&sample_path, &hook_path)
                .map_err(|e| format!("Hook 활성화 실패: {}", e))?;
        } else if !hook_path.exists() {
            return Err("Hook 파일을 찾을 수 없습니다".to_string());
        }
    } else {
        // Disable: rename active to .sample
        if hook_path.exists() {
            std::fs::rename(&hook_path, &sample_path)
                .map_err(|e| format!("Hook 비활성화 실패: {}", e))?;
        }
    }

    Ok(())
}

#[derive(serde::Serialize)]
pub struct HookInfo {
    pub name: String,
    pub enabled: bool,
    pub has_sample: bool,
}
