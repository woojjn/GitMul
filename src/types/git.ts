// ============================================================================
// Git Data Models (match Rust backend models 1:1)
// ============================================================================

/** Repository metadata. */
export interface RepositoryInfo {
  path: string;
  name: string;
  current_branch: string;
  remote_url?: string;
}

/** A single commit. */
export interface CommitInfo {
  sha: string;
  author: string;
  email?: string;
  message: string;
  timestamp: number;
  date: string;
  parent_ids: string[];
}

/** Working tree / index file status. */
export interface FileStatus {
  path: string;
  status: string;
  staged: boolean;
}

/** Recently opened repository. */
export interface RecentRepo {
  path: string;
  name: string;
  last_opened?: number;
}

/** Local or remote branch information. */
export interface BranchInfo {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  commit_sha: string;
  commit_message?: string;
  author?: string;
  timestamp?: number;
}

// ============================================================================
// Diff
// ============================================================================

/** A single line inside a diff hunk. */
export interface DiffLine {
  line_type: string; // "context" | "addition" | "deletion"
  old_line_no: number | null;
  new_line_no: number | null;
  content: string;
}

/** A diff hunk. */
export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}

/** Parsed diff for a single file. */
export interface ParsedDiff {
  file_path: string;
  old_path: string;
  new_path: string;
  is_binary: boolean;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

/** Per-file diff statistics. */
export interface DiffStat {
  file_path: string;
  additions: number;
  deletions: number;
  is_binary: boolean;
}

// ============================================================================
// Image Diff
// ============================================================================

/** Base64-encoded image data. */
export interface ImageData {
  data: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

/** Result of comparing two image versions. */
export interface ImageDiffResult {
  old_image: ImageData | null;
  new_image: ImageData | null;
  is_image: boolean;
  file_path: string;
}

// ============================================================================
// Remote
// ============================================================================

/** Remote repository information. */
export interface RemoteInfo {
  name: string;
  url: string;
  fetch_url: string;
  push_url: string;
}

/** A branch on a remote. */
export interface RemoteBranchInfo {
  name: string;
  full_name: string;
  commit_sha: string;
  commit_message: string;
  is_head: boolean;
}

/** Sync operation progress. */
export interface SyncProgress {
  phase: string; // "idle" | "fetching" | "pulling" | "pushing"
  current: number;
  total: number;
  bytes: number;
  message: string;
}

// ============================================================================
// Conflict Resolution
// ============================================================================

/** A conflicted file with content from each side. */
export interface ConflictFile {
  path: string;
  our_content: string | null;
  their_content: string | null;
  base_content: string | null;
}

/** Merge conflict summary. */
export interface ConflictInfo {
  files: ConflictFile[];
  merge_head: string | null;
  merge_msg: string | null;
}

export type ResolutionChoice = 'ours' | 'theirs' | 'both' | 'manual';

// ============================================================================
// Cherry-pick / Revert / Rebase
// ============================================================================

/** Cherry-pick result. */
export interface CherryPickResult {
  success: boolean;
  conflicts: string[];
  message: string;
}

/** Revert result. */
export interface RevertResult {
  success: boolean;
  conflicts: string[];
  message: string;
}

/** Rebase status. */
export interface RebaseInfo {
  in_progress: boolean;
  current_operation: number | null;
  total_operations: number | null;
}

/** Rebase result. */
export interface RebaseResult {
  success: boolean;
  conflicts: string[];
  message: string;
}

// ============================================================================
// Stash
// ============================================================================

/** A stash entry. */
export interface StashInfo {
  index: number;
  message: string;
  oid: string;
}

// ============================================================================
// Tags
// ============================================================================

/** Tag information (lightweight or annotated). */
export interface TagInfo {
  name: string;
  target: string;
  message: string | null;
  tagger: string | null;
  date: number | null;
}

// ============================================================================
// File History
// ============================================================================

/** A file's commit history entry. */
export interface FileHistoryEntry {
  commit_sha: string;
  message: string;
  author: string;
  date: number;
  changes: string; // "added" | "modified" | "deleted" | "renamed"
  old_path: string | null;
}

// ============================================================================
// Reflog
// ============================================================================

/** A reflog entry. */
export interface ReflogEntry {
  index: number;
  old_oid: string;
  new_oid: string;
  message: string;
  committer: string;
  timestamp: number;
}
