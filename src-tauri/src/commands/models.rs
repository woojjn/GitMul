//! Centralized data models for all Tauri commands.
//!
//! All serializable structs used across command modules are defined here
//! to eliminate duplication and ensure consistency.

use serde::{Deserialize, Serialize};

// ============================================================================
// Repository & Core
// ============================================================================

/// Repository metadata returned when opening a repository.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RepositoryInfo {
    pub path: String,
    pub name: String,
    pub current_branch: String,
    pub remote_url: Option<String>,
}

/// A single commit from the repository history.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommitInfo {
    pub sha: String,
    pub author: String,
    pub email: String,
    pub message: String,
    pub timestamp: i64,
    pub date: String,
    pub parent_ids: Vec<String>,
}

/// Working tree / index file status.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

/// Recently opened repository entry (persisted to disk).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentRepo {
    pub path: String,
    pub name: String,
    pub last_opened: i64,
}

// ============================================================================
// Branch
// ============================================================================

/// Local or remote branch information.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub commit_sha: String,
    pub commit_message: String,
    pub author: String,
    pub timestamp: i64,
}

// ============================================================================
// Diff
// ============================================================================

/// A single line inside a diff hunk.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffLine {
    /// "context", "addition", or "deletion"
    pub line_type: String,
    pub old_line_no: Option<u32>,
    pub new_line_no: Option<u32>,
    pub content: String,
}

/// A diff hunk containing one or more lines.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<DiffLine>,
}

/// Fully parsed diff for a single file.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedDiff {
    pub file_path: String,
    pub old_path: String,
    pub new_path: String,
    pub is_binary: bool,
    pub hunks: Vec<DiffHunk>,
    pub additions: u32,
    pub deletions: u32,
}

/// Per-file diff statistics.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffStat {
    pub file_path: String,
    pub additions: u32,
    pub deletions: u32,
    pub is_binary: bool,
}

// ============================================================================
// Image Diff
// ============================================================================

/// Base64-encoded image data with metadata.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageData {
    /// Base64-encoded image data
    pub data: String,
    /// MIME type (e.g., "image/png", "image/jpeg")
    pub mime_type: String,
    /// File size in bytes
    pub size: u64,
    /// Image width in pixels (0 if not determinable)
    pub width: u32,
    /// Image height in pixels (0 if not determinable)
    pub height: u32,
    /// File format (e.g., "PNG", "JPEG", "GIF", "SVG", "WebP")
    pub format: String,
}

/// Result of comparing two image versions.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageDiffResult {
    /// Old (previous) image data (None if file is newly added)
    pub old_image: Option<ImageData>,
    /// New (current) image data (None if file is deleted)
    pub new_image: Option<ImageData>,
    /// Whether the file is recognized as an image
    pub is_image: bool,
    /// File path
    pub file_path: String,
}

// ============================================================================
// Remote
// ============================================================================

/// Remote repository information.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
    pub fetch_url: String,
    pub push_url: String,
}

/// A branch on a remote.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteBranchInfo {
    pub name: String,
    pub full_name: String,
    pub commit_sha: String,
    pub commit_message: String,
    pub is_head: bool,
}

/// Progress of a sync operation (fetch / pull / push).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncProgress {
    /// "idle", "fetching", "pulling", "pushing"
    pub phase: String,
    pub current: u32,
    pub total: u32,
    pub bytes: u64,
    pub message: String,
}

// ============================================================================
// Conflict Resolution
// ============================================================================

/// A single conflicted file with content from each side.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConflictFile {
    pub path: String,
    pub our_content: Option<String>,
    pub their_content: Option<String>,
    pub base_content: Option<String>,
}

/// Merge conflict summary.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConflictInfo {
    pub files: Vec<ConflictFile>,
    pub merge_head: Option<String>,
    pub merge_msg: Option<String>,
}

// ============================================================================
// Cherry-pick / Revert / Rebase
// ============================================================================

/// Result of a cherry-pick operation.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CherryPickResult {
    pub success: bool,
    pub conflicts: Vec<String>,
    pub message: String,
}

/// Result of a revert operation.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RevertResult {
    pub success: bool,
    pub conflicts: Vec<String>,
    pub message: String,
}

/// Current rebase status information.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RebaseInfo {
    pub in_progress: bool,
    pub current_operation: Option<usize>,
    pub total_operations: Option<usize>,
}

/// Result of a rebase operation.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RebaseResult {
    pub success: bool,
    pub conflicts: Vec<String>,
    pub message: String,
}

// ============================================================================
// Stash
// ============================================================================

/// A single stash entry.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StashInfo {
    pub index: usize,
    pub message: String,
    pub oid: String,
}

// ============================================================================
// Tags
// ============================================================================

/// Tag information (lightweight or annotated).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagInfo {
    pub name: String,
    pub target: String,
    pub message: Option<String>,
    pub tagger: Option<String>,
    pub date: Option<i64>,
}

// ============================================================================
// File History
// ============================================================================

/// A single entry in a file's commit history.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileHistoryEntry {
    pub commit_sha: String,
    pub message: String,
    pub author: String,
    pub date: i64,
    /// "added", "modified", "deleted", "renamed"
    pub changes: String,
    pub old_path: Option<String>,
}

// ============================================================================
// Reflog
// ============================================================================

/// A single reflog entry.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReflogEntry {
    pub index: usize,
    pub old_oid: String,
    pub new_oid: String,
    pub message: String,
    pub committer: String,
    pub timestamp: i64,
}
