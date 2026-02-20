/**
 * Centralized Tauri API service.
 *
 * All `invoke()` calls go through this module so that:
 *   1. Command names are defined in one place (no typos).
 *   2. Return types are declared alongside the call.
 *   3. Components stay free of direct Tauri imports.
 */
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';

import type {
  RepositoryInfo,
  CommitInfo,
  FileStatus,
  BranchInfo,
  RecentRepo,
  ParsedDiff,
  DiffStat,
  ImageDiffResult,
  RemoteInfo,
  RemoteBranchInfo,
  SyncProgress,
  ConflictInfo,
  CherryPickResult,
  RevertResult,
  RebaseInfo,
  RebaseResult,
  StashInfo,
  TagInfo,
  FileHistoryEntry,
  ReflogEntry,
} from '../types/git';

// ============================================================================
// Repository Core
// ============================================================================

export const openRepository = (path: string) =>
  invoke<RepositoryInfo>('open_repository', { path });

export const getCommitHistory = (repoPath: string, limit = 100) =>
  invoke<CommitInfo[]>('get_commit_history', { repoPath, limit });

export const getRepositoryStatus = (repoPath: string) =>
  invoke<FileStatus[]>('get_repository_status', { repoPath });

export const stageFile = (repoPath: string, path: string) =>
  invoke<void>('stage_file', { repoPath, path });

export const unstageFile = (repoPath: string, path: string) =>
  invoke<void>('unstage_file', { repoPath, path });

export const stageAll = (repoPath: string) =>
  invoke<void>('stage_all', { repoPath });

export const createCommit = (repoPath: string, message: string) =>
  invoke<string>('create_commit', { repoPath, message });

// ============================================================================
// Recent Repos
// ============================================================================

export const getRecentRepos = () =>
  invoke<RecentRepo[]>('get_recent_repos');

export const addRecentRepo = (path: string) =>
  invoke<void>('add_recent_repo', { path });

// ============================================================================
// Branch
// ============================================================================

export const listBranches = (repoPath: string) =>
  invoke<BranchInfo[]>('list_branches', { repoPath });

export const getCurrentBranch = (repoPath: string) =>
  invoke<string>('get_current_branch', { repoPath });

export const createBranch = (repoPath: string, branchName: string) =>
  invoke<string>('create_branch', { repoPath, branchName });

export const switchBranch = (repoPath: string, branchName: string) =>
  invoke<string>('switch_branch', { repoPath, branchName });

export const deleteBranch = (repoPath: string, branchName: string) =>
  invoke<string>('delete_branch', { repoPath, branchName });

export const renameBranch = (repoPath: string, oldName: string, newName: string) =>
  invoke<string>('rename_branch', { repoPath, oldName, newName });

// ============================================================================
// Diff
// ============================================================================

export const getFileDiff = (repoPath: string, filePath: string, staged: boolean) =>
  invoke<string>('get_file_diff', { repoPath, filePath, staged });

export const getCommitDiff = (repoPath: string, commitId: string) =>
  invoke<string>('get_commit_diff', { repoPath, commitId });

export const parseDiff = (diffText: string) =>
  invoke<ParsedDiff>('parse_diff', { diffText });

export const getFileContent = (repoPath: string, filePath: string, commitId?: string) =>
  invoke<string>('get_file_content', { repoPath, filePath, commitId: commitId ?? null });

export const getDiffStats = (repoPath: string, staged: boolean) =>
  invoke<DiffStat[]>('get_diff_stats', { repoPath, staged });

// ============================================================================
// Image Diff
// ============================================================================

export const checkIsImage = (filePath: string) =>
  invoke<boolean>('check_is_image', { filePath });

export const getImageDiff = (repoPath: string, filePath: string, staged: boolean) =>
  invoke<ImageDiffResult>('get_image_diff', { repoPath, filePath, staged });

export const getImageAtCommit = (repoPath: string, filePath: string, commitId: string) =>
  invoke<ImageDiffResult | null>('get_image_at_commit', { repoPath, filePath, commitId });

// ============================================================================
// Remote
// ============================================================================

export const listRemotes = (repoPath: string) =>
  invoke<RemoteInfo[]>('list_remotes', { repoPath });

export const addRemote = (repoPath: string, name: string, url: string) =>
  invoke<string>('add_remote', { repoPath, name, url });

export const removeRemote = (repoPath: string, name: string) =>
  invoke<string>('remove_remote', { repoPath, name });

export const fetchRemote = (repoPath: string, remoteName: string) =>
  invoke<string>('fetch_remote', { repoPath, remoteName });

export const pullChanges = (repoPath: string, remoteName: string, branchName: string) =>
  invoke<string>('pull_changes', { repoPath, remoteName, branchName });

export const pushChanges = (repoPath: string, remoteName: string, branchName: string, force = false) =>
  invoke<string>('push_changes', { repoPath, remoteName, branchName, force });

export const getRemoteBranches = (repoPath: string, remoteName: string) =>
  invoke<RemoteBranchInfo[]>('get_remote_branches', { repoPath, remoteName });

export const getSyncProgress = (repoPath: string) =>
  invoke<SyncProgress>('get_sync_progress', { repoPath });

export const checkRemoteConnection = (repoPath: string, remoteName: string) =>
  invoke<boolean>('check_remote_connection', { repoPath, remoteName });

// ============================================================================
// Amend
// ============================================================================

export const amendCommit = (repoPath: string, message: string) =>
  invoke<string>('amend_commit', { repoPath, message });

export const getLastCommitMessage = (repoPath: string) =>
  invoke<string>('get_last_commit_message', { repoPath });

// ============================================================================
// Stash
// ============================================================================

export const stashSave = (repoPath: string, message?: string, includeUntracked = false) =>
  invoke<string>('stash_save', { repoPath, message: message ?? null, includeUntracked });

export const stashList = (repoPath: string) =>
  invoke<StashInfo[]>('stash_list', { repoPath });

export const stashApply = (repoPath: string, index: number) =>
  invoke<string>('stash_apply', { repoPath, index });

export const stashPop = (repoPath: string, index: number) =>
  invoke<string>('stash_pop', { repoPath, index });

export const stashDrop = (repoPath: string, index: number) =>
  invoke<string>('stash_drop', { repoPath, index });

// ============================================================================
// Merge
// ============================================================================

export const mergeBranch = (repoPath: string, sourceBranch: string, noFastForward = false) =>
  invoke<string>('merge_branch', { repoPath, sourceBranch, noFastForward });

export const canMerge = (repoPath: string, sourceBranch: string) =>
  invoke<boolean>('can_merge', { repoPath, sourceBranch });

export const getMergeConflicts = (repoPath: string) =>
  invoke<string[]>('get_merge_conflicts', { repoPath });

// ============================================================================
// Conflict Resolution
// ============================================================================

export const getConflicts = (repoPath: string) =>
  invoke<ConflictInfo>('get_conflicts', { repoPath });

export const resolveConflict = (repoPath: string, filePath: string, resolution: string, content?: string) =>
  invoke<void>('resolve_conflict', { repoPath, filePath, resolution, content: content ?? null });

export const abortMerge = (repoPath: string) =>
  invoke<void>('abort_merge', { repoPath });

// ============================================================================
// Cherry-pick
// ============================================================================

export const cherryPick = (repoPath: string, commitSha: string) =>
  invoke<CherryPickResult>('cherry_pick', { repoPath, commitSha });

export const cherryPickContinue = (repoPath: string) =>
  invoke<void>('cherry_pick_continue', { repoPath });

export const cherryPickAbort = (repoPath: string) =>
  invoke<void>('cherry_pick_abort', { repoPath });

// ============================================================================
// Revert
// ============================================================================

export const revertCommit = (repoPath: string, commitSha: string) =>
  invoke<RevertResult>('revert_commit', { repoPath, commitSha });

// ============================================================================
// Tags
// ============================================================================

export const listTags = (repoPath: string) =>
  invoke<TagInfo[]>('list_tags', { repoPath });

export const createTag = (repoPath: string, tagName: string, target?: string) =>
  invoke<void>('create_tag', { repoPath, tagName, target: target ?? null });

export const createAnnotatedTag = (repoPath: string, tagName: string, message: string, target?: string) =>
  invoke<void>('create_annotated_tag', { repoPath, tagName, message, target: target ?? null });

export const deleteTag = (repoPath: string, tagName: string) =>
  invoke<void>('delete_tag', { repoPath, tagName });

export const pushTag = (repoPath: string, remoteName: string, tagName: string) =>
  invoke<void>('push_tag', { repoPath, remoteName, tagName });

// ============================================================================
// File History
// ============================================================================

export const getFileHistory = (repoPath: string, filePath: string, limit?: number) =>
  invoke<FileHistoryEntry[]>('get_file_history', { repoPath, filePath, limit: limit ?? null });

export const getFileAtCommit = (repoPath: string, commitSha: string, filePath: string) =>
  invoke<string>('get_file_at_commit', { repoPath, commitSha, filePath });

// ============================================================================
// Rebase
// ============================================================================

export const startRebase = (repoPath: string, onto: string) =>
  invoke<RebaseResult>('start_rebase', { repoPath, onto });

export const rebaseContinue = (repoPath: string) =>
  invoke<void>('rebase_continue', { repoPath });

export const rebaseAbort = (repoPath: string) =>
  invoke<void>('rebase_abort', { repoPath });

export const getRebaseStatus = (repoPath: string) =>
  invoke<RebaseInfo>('get_rebase_status', { repoPath });

// ============================================================================
// Reflog
// ============================================================================

export const getReflog = (repoPath: string, refName?: string, limit?: number) =>
  invoke<ReflogEntry[]>('get_reflog', { repoPath, refName: refName ?? null, limit: limit ?? null });

export const resetToReflog = (repoPath: string, refName: string, resetType: string) =>
  invoke<void>('reset_to_reflog', { repoPath, refName, resetType });

// ============================================================================
// Dialog Helpers (Tauri Dialog API)
// ============================================================================

export const openDirectoryDialog = (title = '레포지토리 선택') =>
  open({ directory: true, multiple: false, title });
