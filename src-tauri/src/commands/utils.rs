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

/// Ensure UTF-8 related git config is set (Korean file name support).
pub fn ensure_utf8_config(repo: &Repository) -> Result<(), String> {
    let mut config = repo.config().map_err(|e| format!("Git 설정 접근 실패: {}", e))?;

    // core.quotepath = false → show Korean file names properly
    if config.get_bool("core.quotepath").unwrap_or(true) {
        config
            .set_bool("core.quotepath", false)
            .map_err(|e| format!("Git 설정 변경 실패: {}", e))?;
    }

    // Encoding
    config
        .set_str("i18n.commitEncoding", "utf-8")
        .map_err(|e| format!("Git 설정 변경 실패: {}", e))?;
    config
        .set_str("i18n.logOutputEncoding", "utf-8")
        .map_err(|e| format!("Git 설정 변경 실패: {}", e))?;

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
