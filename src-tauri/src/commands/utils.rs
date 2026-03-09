//! Shared utility functions for all command modules.
//!
//! Eliminates duplicate `normalize_unicode` and `Repository::open` boilerplate.

use git2::Repository;
use unicode_normalization::UnicodeNormalization;

/// Normalize a Unicode string to NFC form.
///
/// macOS stores file paths in NFD; this converts them to NFC
/// for consistent cross-platform behaviour.
pub fn normalize_unicode(s: &str) -> String {
    s.nfc().collect()
}

/// Open a git repository with a standard Korean error message.
pub fn open_repo(path: &str) -> Result<Repository, String> {
    Repository::open(path).map_err(|e| format!("레포지토리 열기 실패: {}", e))
}

/// Ensure UTF-8 / Korean related git config is set for the local repository.
///
/// This is best-effort: callers should use `let _ = ensure_utf8_config(...)` so that
/// a transient config-write failure never blocks a commit, checkout, or push.
///
/// Settings applied:
/// - `core.quotepath = false`      – show non-ASCII (Korean) file names as-is
/// - `i18n.commitEncoding = utf-8` – store commit messages in UTF-8
/// - `i18n.logOutputEncoding = utf-8` – display log output in UTF-8
/// - `core.precomposeunicode = true`  – macOS: normalise NFD → NFC for file names
/// - `core.autocrlf = false`          – Windows: don't corrupt binary / Korean files with CRLF
pub fn ensure_utf8_config(repo: &Repository) -> Result<(), String> {
    let mut config = repo
        .config()
        .map_err(|e| format!("Git 설정 접근 실패: {}", e))?;

    // core.quotepath = false → Korean file names shown without \uXXXX escaping
    config
        .set_bool("core.quotepath", false)
        .map_err(|e| format!("Git 설정 변경 실패(quotepath): {}", e))?;

    // Commit / log encoding
    config
        .set_str("i18n.commitEncoding", "utf-8")
        .map_err(|e| format!("Git 설정 변경 실패(commitEncoding): {}", e))?;
    config
        .set_str("i18n.logOutputEncoding", "utf-8")
        .map_err(|e| format!("Git 설정 변경 실패(logOutputEncoding): {}", e))?;

    // macOS: git stores file names in NFD; precomposeunicode makes git normalise to NFC
    // on read so that `git status` / `git diff` work correctly with Korean file names.
    #[cfg(target_os = "macos")]
    config
        .set_bool("core.precomposeunicode", true)
        .map_err(|e| format!("Git 설정 변경 실패(precomposeunicode): {}", e))?;

    // Windows: prevent CRLF conversion which can corrupt files and confuse diffs
    #[cfg(target_os = "windows")]
    config
        .set_str("core.autocrlf", "false")
        .map_err(|e| format!("Git 설정 변경 실패(autocrlf): {}", e))?;

    Ok(())
}

/// Read a blob identified by OID and return its content as a UTF-8 String.
///
/// Returns `None` if the blob cannot be found or is not valid UTF-8.
pub fn read_blob_content(repo: &Repository, oid: &git2::Oid) -> Option<String> {
    repo.find_blob(*oid)
        .ok()
        .and_then(|blob| String::from_utf8(blob.content().to_vec()).ok())
}
