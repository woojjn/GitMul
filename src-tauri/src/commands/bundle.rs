//! Git Bundle operations.
//!
//! Uses `git` CLI because `git2` (libgit2) has no bundle API.
//! Bundle files allow transferring Git objects without a network connection.

use std::path::Path;
use std::process::Command;

use serde::{Deserialize, Serialize};

use super::utils::open_repo;

// ============================================================================
// Models
// ============================================================================

/// Result of a bundle creation.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BundleCreateResult {
    pub success: bool,
    pub output_path: String,
    pub message: String,
    /// Bundle file size in bytes
    pub file_size: u64,
}

/// Result of bundle verification.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BundleVerifyResult {
    pub valid: bool,
    pub message: String,
    /// List of refs contained in the bundle
    pub refs: Vec<String>,
}

/// Info about available refs for bundling.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BundleRefInfo {
    pub name: String,
    pub commit_sha: String,
    pub ref_type: String, // "branch" | "tag"
}

// ============================================================================
// Commands
// ============================================================================

/// List available refs (branches + tags) that can be bundled.
#[tauri::command]
pub async fn list_bundle_refs(repo_path: String) -> Result<Vec<BundleRefInfo>, String> {
    let repo = open_repo(&repo_path)?;
    let mut refs = Vec::new();

    // Local branches
    for branch_result in repo
        .branches(Some(git2::BranchType::Local))
        .map_err(|e| format!("브랜치 목록 조회 실패: {}", e))?
    {
        let (branch, _) = branch_result.map_err(|e| format!("브랜치 읽기 실패: {}", e))?;
        if let Ok(Some(name)) = branch.name() {
            if let Ok(commit) = branch.get().peel_to_commit() {
                refs.push(BundleRefInfo {
                    name: name.to_string(),
                    commit_sha: commit.id().to_string()[..7].to_string(),
                    ref_type: "branch".to_string(),
                });
            }
        }
    }

    // Tags
    for tag_name in repo
        .tag_names(None)
        .map_err(|e| format!("태그 목록 조회 실패: {}", e))?
        .iter()
        .flatten()
    {
        let refname = format!("refs/tags/{}", tag_name);
        if let Ok(reference) = repo.find_reference(&refname) {
            if let Ok(commit) = reference.peel_to_commit() {
                refs.push(BundleRefInfo {
                    name: tag_name.to_string(),
                    commit_sha: commit.id().to_string()[..7].to_string(),
                    ref_type: "tag".to_string(),
                });
            }
        }
    }

    Ok(refs)
}

/// Create a bundle file from the repository.
///
/// - `refs`: List of ref names to include (e.g. ["main", "develop"]). Empty = --all.
/// - `output_path`: Where to write the .bundle file.
#[tauri::command]
pub async fn create_bundle(
    repo_path: String,
    output_path: String,
    refs: Vec<String>,
) -> Result<BundleCreateResult, String> {
    // Validate repo exists
    let _ = open_repo(&repo_path)?;

    let mut cmd = Command::new("git");
    cmd.current_dir(&repo_path);
    cmd.args(["bundle", "create", &output_path]);

    if refs.is_empty() {
        cmd.arg("--all");
    } else {
        for r in &refs {
            cmd.arg(r);
        }
    }

    let output = cmd
        .output()
        .map_err(|e| format!("git bundle 실행 실패: {}", e))?;

    if output.status.success() {
        let file_size = std::fs::metadata(&output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        Ok(BundleCreateResult {
            success: true,
            output_path: output_path.clone(),
            message: format!(
                "번들 생성 완료: {}",
                Path::new(&output_path)
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
            ),
            file_size,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("번들 생성 실패: {}", stderr.trim()))
    }
}

/// Verify a bundle file.
#[tauri::command]
pub async fn verify_bundle(
    repo_path: String,
    bundle_path: String,
) -> Result<BundleVerifyResult, String> {
    if !Path::new(&bundle_path).exists() {
        return Err("번들 파일이 존재하지 않습니다".to_string());
    }

    // Verify
    let verify_output = Command::new("git")
        .current_dir(&repo_path)
        .args(["bundle", "verify", &bundle_path])
        .output()
        .map_err(|e| format!("git bundle verify 실행 실패: {}", e))?;

    let stdout = String::from_utf8_lossy(&verify_output.stdout);
    let stderr = String::from_utf8_lossy(&verify_output.stderr);

    // List refs in bundle
    let list_output = Command::new("git")
        .current_dir(&repo_path)
        .args(["bundle", "list-heads", &bundle_path])
        .output()
        .map_err(|e| format!("git bundle list-heads 실행 실패: {}", e))?;

    let refs: Vec<String> = String::from_utf8_lossy(&list_output.stdout)
        .lines()
        .filter(|l| !l.is_empty())
        .map(|l| {
            // Format: "<sha> <refname>"
            let parts: Vec<&str> = l.splitn(2, ' ').collect();
            if parts.len() == 2 {
                format!("{} ({})", parts[1], &parts[0][..7.min(parts[0].len())])
            } else {
                l.to_string()
            }
        })
        .collect();

    if verify_output.status.success() {
        Ok(BundleVerifyResult {
            valid: true,
            message: format!(
                "번들이 유효합니다 ({}개 ref 포함)",
                refs.len()
            ),
            refs,
        })
    } else {
        Ok(BundleVerifyResult {
            valid: false,
            message: format!(
                "번들 검증 실패: {}",
                if !stderr.is_empty() {
                    stderr.trim().to_string()
                } else {
                    stdout.trim().to_string()
                }
            ),
            refs,
        })
    }
}

/// Fetch from a bundle file (import bundle into existing repo).
#[tauri::command]
pub async fn fetch_from_bundle(
    repo_path: String,
    bundle_path: String,
) -> Result<String, String> {
    if !Path::new(&bundle_path).exists() {
        return Err("번들 파일이 존재하지 않습니다".to_string());
    }

    let _ = open_repo(&repo_path)?;

    let output = Command::new("git")
        .current_dir(&repo_path)
        .args(["fetch", &bundle_path])
        .output()
        .map_err(|e| format!("git fetch (bundle) 실행 실패: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let msg = if !stderr.is_empty() {
            stderr.trim().to_string()
        } else if !stdout.is_empty() {
            stdout.trim().to_string()
        } else {
            "번들에서 페치 완료".to_string()
        };
        Ok(msg)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("번들에서 페치 실패: {}", stderr.trim()))
    }
}

/// Clone from a bundle file into a new directory.
#[tauri::command]
pub async fn clone_from_bundle(
    bundle_path: String,
    target_path: String,
) -> Result<String, String> {
    if !Path::new(&bundle_path).exists() {
        return Err("번들 파일이 존재하지 않습니다".to_string());
    }

    if Path::new(&target_path).exists() {
        return Err("대상 경로가 이미 존재합니다".to_string());
    }

    let output = Command::new("git")
        .args(["clone", &bundle_path, &target_path])
        .output()
        .map_err(|e| format!("git clone (bundle) 실행 실패: {}", e))?;

    if output.status.success() {
        Ok(format!("번들에서 클론 완료: {}", target_path))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("번들에서 클론 실패: {}", stderr.trim()))
    }
}
