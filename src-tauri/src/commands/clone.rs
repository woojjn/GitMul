use git2::{AutotagOption, Cred, FetchOptions, RemoteCallbacks, Repository};

/// Clone a remote repository into the given local path.
///
/// Supports both HTTPS (credential helper) and SSH (key files).
/// Returns the absolute path to the cloned repository.
#[tauri::command]
pub async fn clone_repository(url: String, target_path: String) -> Result<String, String> {
    let tried_count = std::cell::Cell::new(0u32);

    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, username_from_url, allowed_types| {
        let username = username_from_url.unwrap_or("git");
        let attempt = tried_count.get();
        tried_count.set(attempt + 1);

        if allowed_types.is_ssh_key() {
            let home = dirs::home_dir().unwrap_or_default();
            let key_files = ["id_ed25519", "id_ecdsa", "id_rsa", "id_dsa"];
            let existing_keys: Vec<_> = key_files
                .iter()
                .map(|k| home.join(".ssh").join(k))
                .filter(|p| p.exists())
                .collect();

            if let Some(key_path) = existing_keys.get(attempt as usize) {
                return Cred::ssh_key(username, None, key_path, None);
            }
            return Cred::ssh_key_from_agent(username);
        }

        if allowed_types.is_user_pass_plaintext() {
            return Cred::credential_helper(
                &git2::Config::open_default().unwrap_or_else(|_| git2::Config::new().unwrap()),
                _url,
                username_from_url,
            );
        }

        if allowed_types.is_default() {
            return Cred::default();
        }

        Err(git2::Error::from_str(
            "인증 방법을 찾을 수 없습니다. SSH 키를 ~/.ssh/에 설치하거나 Git Credential Manager를 설정하세요.",
        ))
    });

    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);
    fetch_options.download_tags(AutotagOption::All);

    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fetch_options);

    let target = std::path::Path::new(&target_path);

    // Create target directory if it doesn't exist
    if !target.exists() {
        std::fs::create_dir_all(target)
            .map_err(|e| format!("대상 디렉토리 생성 실패: {}", e))?;
    }

    let _repo = builder
        .clone(&url, target)
        .map_err(|e| format!("클론 실패: {}", e))?;

    // Return canonical (absolute) path
    let canonical = target
        .canonicalize()
        .map_err(|e| format!("경로 정규화 실패: {}", e))?;

    Ok(canonical.to_string_lossy().to_string())
}
