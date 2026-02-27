/**
 * Mock data for browser-based UI development.
 *
 * Provides realistic sample data so every panel/component
 * can be previewed without the Tauri backend.
 */

import type {
  RepositoryInfo,
  CommitInfo,
  FileStatus,
  BranchInfo,
  RecentRepo,
  ParsedDiff,
  DiffStat,
  CommitFileChange,
  RemoteInfo,
  RemoteBranchInfo,
  SyncProgress,
  ConflictInfo,
  StashInfo,
  TagInfo,
  FileHistoryEntry,
  ReflogEntry,
  BundleRefInfo,
} from '../types/git';

// ============================================================================
// Helper
// ============================================================================

const ts = (daysAgo: number) => Math.floor(Date.now() / 1000) - daysAgo * 86400;
const date = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
};
const sha = (n: number) => {
  // Generate realistic-looking hex SHAs with good distribution.
  // Uses a better hash mixing to ensure distinct first 7+ chars.
  const hex = '0123456789abcdef';
  let result = '';
  let h = n;
  // Mix the seed thoroughly
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  let state = (h | 0) >>> 0;
  for (let i = 0; i < 40; i++) {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state >>> 0;
    result += hex[state % 16];
  }
  return result;
};

// ============================================================================
// Repository
// ============================================================================

export const MOCK_REPO: RepositoryInfo = {
  path: '/home/user/projects/my-awesome-app',
  name: 'my-awesome-app',
  current_branch: 'main',
  remote_url: 'https://github.com/user/my-awesome-app.git',
};

// ============================================================================
// Commits
// ============================================================================

/**
 * Realistic commit graph topology:
 *
 *  sha(1)  ─ main HEAD (latest)
 *  sha(2)  ─ Merge feature/auth into main  [merge: sha(3), sha(20)]
 *  sha(3)  ─ main: code review fix
 *  sha(4)  ─ Merge feature/dark-mode into main  [merge: sha(5), sha(10)]
 *  sha(5)  ─ main: update deps
 *  sha(20) ─ feature/auth: JWT implementation  (lane 1)
 *  sha(21) ─ feature/auth: add login UI  (lane 1)
 *  sha(6)  ─ Merge hotfix/encoding into main  [merge: sha(7), sha(30)]
 *  sha(7)  ─ main: refactor API layer
 *  sha(10) ─ feature/dark-mode: toggle + persistence  (lane 2)
 *  sha(11) ─ feature/dark-mode: CSS variables  (lane 2)
 *  sha(30) ─ hotfix/encoding: fix Korean filenames  (lane 3)
 *  sha(8)  ─ Merge feature/image-diff into main  [merge: sha(9), sha(40)]
 *  sha(9)  ─ main: add branch management UI
 *  sha(40) ─ feature/image-diff: side-by-side view  (lane 2)
 *  sha(41) ─ feature/image-diff: overlay blend mode  (lane 2)
 *  sha(12) ─ main: add README
 *  sha(13) ─ main: fix commit dialog
 *  sha(14) ─ main: initial project setup (root)
 */
export const MOCK_COMMITS: CommitInfo[] = [
  // ── main HEAD ──
  {
    sha: sha(1),
    author: 'Kim Minjun',
    email: 'minjun@example.com',
    message: 'feat: add user authentication with JWT tokens',
    timestamp: ts(0),
    date: date(0),
    parent_ids: [sha(2)],
  },
  // ── Merge feature/auth into main ──
  {
    sha: sha(2),
    author: 'Park Jihoon',
    email: 'jihoon@example.com',
    message: 'Merge branch \'feature/auth\' into main',
    timestamp: ts(1),
    date: date(1),
    parent_ids: [sha(3), sha(20)],
  },
  // ── main: code review fix ──
  {
    sha: sha(3),
    author: 'Lee Soyeon',
    email: 'soyeon@example.com',
    message: 'fix: address code review comments on API layer',
    timestamp: ts(2),
    date: date(2),
    parent_ids: [sha(4)],
  },
  // ── Merge feature/dark-mode into main ──
  {
    sha: sha(4),
    author: 'Park Jihoon',
    email: 'jihoon@example.com',
    message: 'Merge branch \'feature/dark-mode\' into main',
    timestamp: ts(3),
    date: date(3),
    parent_ids: [sha(5), sha(10)],
  },
  // ── main: update deps ──
  {
    sha: sha(5),
    author: 'Kim Minjun',
    email: 'minjun@example.com',
    message: 'chore: update dependencies to latest stable versions',
    timestamp: ts(4),
    date: date(4),
    parent_ids: [sha(6)],
  },
  // ── feature/auth: JWT (branch point was sha(5)) ──
  {
    sha: sha(20),
    author: 'Choi Eunji',
    email: 'eunji@example.com',
    message: 'feat: implement JWT token refresh and validation',
    timestamp: ts(2),
    date: date(2),
    parent_ids: [sha(21)],
  },
  {
    sha: sha(21),
    author: 'Choi Eunji',
    email: 'eunji@example.com',
    message: 'feat: add login/register UI screens',
    timestamp: ts(3),
    date: date(3),
    parent_ids: [sha(5)],
  },
  // ── Merge hotfix/encoding into main ──
  {
    sha: sha(6),
    author: 'Lee Soyeon',
    email: 'soyeon@example.com',
    message: 'Merge branch \'hotfix/encoding\' into main',
    timestamp: ts(5),
    date: date(5),
    parent_ids: [sha(7), sha(30)],
  },
  // ── main: refactor API ──
  {
    sha: sha(7),
    author: 'Park Jihoon',
    email: 'jihoon@example.com',
    message: 'refactor: centralize API service layer with typed invoke wrappers',
    timestamp: ts(6),
    date: date(6),
    parent_ids: [sha(8)],
  },
  // ── feature/dark-mode (branch point was sha(7)) ──
  {
    sha: sha(10),
    author: 'Lee Soyeon',
    email: 'soyeon@example.com',
    message: 'feat: add dark mode toggle with localStorage persistence',
    timestamp: ts(4),
    date: date(4),
    parent_ids: [sha(11)],
  },
  {
    sha: sha(11),
    author: 'Lee Soyeon',
    email: 'soyeon@example.com',
    message: 'feat: add CSS custom properties for theming',
    timestamp: ts(5),
    date: date(5),
    parent_ids: [sha(7)],
  },
  // ── hotfix/encoding (branch point was sha(9)) ──
  {
    sha: sha(30),
    author: 'Kim Minjun',
    email: 'minjun@example.com',
    message: 'fix: resolve Korean filename encoding issue in diff viewer',
    timestamp: ts(6),
    date: date(6),
    parent_ids: [sha(9)],
  },
  // ── Merge feature/image-diff into main ──
  {
    sha: sha(8),
    author: 'Park Jihoon',
    email: 'jihoon@example.com',
    message: 'Merge branch \'feature/image-diff\' into main',
    timestamp: ts(7),
    date: date(7),
    parent_ids: [sha(9), sha(40)],
  },
  // ── main: add branch management ──
  {
    sha: sha(9),
    author: 'Park Jihoon',
    email: 'jihoon@example.com',
    message: 'feat: add branch management UI with create/delete/switch',
    timestamp: ts(8),
    date: date(8),
    parent_ids: [sha(12)],
  },
  // ── feature/image-diff (branch point was sha(12)) ──
  {
    sha: sha(40),
    author: 'Choi Eunji',
    email: 'eunji@example.com',
    message: 'feat: implement image diff comparison with side-by-side view',
    timestamp: ts(8),
    date: date(8),
    parent_ids: [sha(41)],
  },
  {
    sha: sha(41),
    author: 'Choi Eunji',
    email: 'eunji@example.com',
    message: 'feat: add overlay blend mode for image comparison',
    timestamp: ts(9),
    date: date(9),
    parent_ids: [sha(12)],
  },
  // ── main: docs ──
  {
    sha: sha(12),
    author: 'Lee Soyeon',
    email: 'soyeon@example.com',
    message: 'docs: add comprehensive README with setup instructions',
    timestamp: ts(10),
    date: date(10),
    parent_ids: [sha(13)],
  },
  // ── main: fix ──
  {
    sha: sha(13),
    author: 'Kim Minjun',
    email: 'minjun@example.com',
    message: 'fix: prevent commit dialog from closing when staged files are empty',
    timestamp: ts(12),
    date: date(12),
    parent_ids: [sha(14)],
  },
  // ── initial (root) ──
  {
    sha: sha(14),
    author: 'Choi Eunji',
    email: 'eunji@example.com',
    message: 'feat: initial project setup with Tauri + React + TypeScript',
    timestamp: ts(14),
    date: date(14),
    parent_ids: [],
  },
];

// ============================================================================
// File Changes (working tree)
// ============================================================================

export const MOCK_FILE_CHANGES: FileStatus[] = [
  { path: 'src/components/CommitHistory.tsx', status: 'modified', staged: true },
  { path: 'src/services/api.ts', status: 'modified', staged: true },
  { path: 'src/components/NewFeature.tsx', status: 'new file', staged: true },
  { path: 'src/assets/icon.png', status: 'modified', staged: true },
  { path: 'src/hooks/useAuth.ts', status: 'modified', staged: false },
  { path: 'src/utils/helpers.ts', status: 'modified', staged: false },
  { path: 'README.md', status: 'modified', staged: false },
  { path: 'tests/auth.test.ts', status: 'new file', staged: false },
  { path: 'src/old-module.ts', status: 'deleted', staged: false },
  { path: 'src/assets/logo-kr.png', status: 'new file', staged: false },
  { path: 'src/assets/banner.jpg', status: 'modified', staged: false },
  { path: 'src/assets/old-icon.png', status: 'deleted', staged: false },
  { path: 'src/components/한글컴포넌트.tsx', status: 'modified', staged: false },
];

// ============================================================================
// Branches
// ============================================================================

export const MOCK_BRANCHES: BranchInfo[] = [
  {
    name: 'main',
    is_current: true,
    is_remote: false,
    commit_sha: sha(1),
    commit_message: 'feat: add user authentication with JWT tokens',
    author: 'Kim Minjun',
    timestamp: ts(0),
  },
  {
    name: 'develop',
    is_current: false,
    is_remote: false,
    commit_sha: sha(3),
    commit_message: 'fix: address code review comments on API layer',
    author: 'Lee Soyeon',
    timestamp: ts(2),
  },
  {
    name: 'feature/auth',
    is_current: false,
    is_remote: false,
    commit_sha: sha(20),
    commit_message: 'feat: implement JWT token refresh and validation',
    author: 'Choi Eunji',
    timestamp: ts(2),
  },
  {
    name: 'feature/image-diff',
    is_current: false,
    is_remote: false,
    commit_sha: sha(40),
    commit_message: 'feat: implement image diff comparison',
    author: 'Choi Eunji',
    timestamp: ts(8),
  },
  {
    name: 'hotfix/encoding-fix',
    is_current: false,
    is_remote: false,
    commit_sha: sha(30),
    commit_message: 'fix: resolve Korean filename encoding issue',
    author: 'Kim Minjun',
    timestamp: ts(6),
  },
  {
    name: 'origin/main',
    is_current: false,
    is_remote: true,
    commit_sha: sha(4),
    commit_message: 'Merge branch feature/dark-mode into main',
    author: 'Park Jihoon',
    timestamp: ts(3),
  },
  {
    name: 'origin/develop',
    is_current: false,
    is_remote: true,
    commit_sha: sha(3),
    commit_message: 'fix: address code review comments on API layer',
    author: 'Lee Soyeon',
    timestamp: ts(2),
  },
];

// ============================================================================
// Recent Repos
// ============================================================================

export const MOCK_RECENT_REPOS: RecentRepo[] = [
  { path: '/home/user/projects/my-awesome-app', name: 'my-awesome-app', last_opened: ts(0) },
  { path: '/home/user/projects/gitmul', name: 'gitmul', last_opened: ts(1) },
  { path: '/home/user/projects/blog-engine', name: 'blog-engine', last_opened: ts(5) },
  { path: '/home/user/projects/도서관-시스템', name: '도서관-시스템', last_opened: ts(10) },
];

// ============================================================================
// Diff
// ============================================================================

export const MOCK_PARSED_DIFF: ParsedDiff = {
  file_path: 'src/components/CommitHistory.tsx',
  old_path: 'src/components/CommitHistory.tsx',
  new_path: 'src/components/CommitHistory.tsx',
  is_binary: false,
  hunks: [
    {
      old_start: 10,
      old_lines: 7,
      new_start: 10,
      new_lines: 12,
      header: '@@ -10,7 +10,12 @@ import React from "react";',
      lines: [
        { line_type: 'context', old_line_no: 10, new_line_no: 10, content: 'import React from "react";' },
        { line_type: 'context', old_line_no: 11, new_line_no: 11, content: 'import * as api from "../services/api";' },
        { line_type: 'deletion', old_line_no: 12, new_line_no: null, content: 'import { CommitInfo } from "../types";' },
        { line_type: 'addition', old_line_no: null, new_line_no: 12, content: 'import type { CommitInfo } from "../types/git";' },
        { line_type: 'addition', old_line_no: null, new_line_no: 13, content: 'import type { CommitFileChange } from "../types/git";' },
        { line_type: 'context', old_line_no: 13, new_line_no: 14, content: '' },
        { line_type: 'context', old_line_no: 14, new_line_no: 15, content: 'interface CommitHistoryProps {' },
        { line_type: 'context', old_line_no: 15, new_line_no: 16, content: '  commits: CommitInfo[];' },
        { line_type: 'addition', old_line_no: null, new_line_no: 17, content: '  onSelectCommit?: (sha: string) => void;' },
        { line_type: 'addition', old_line_no: null, new_line_no: 18, content: '  selectedCommitSha?: string | null;' },
        { line_type: 'context', old_line_no: 16, new_line_no: 19, content: '  onRefresh: () => void;' },
      ],
    },
    {
      old_start: 45,
      old_lines: 5,
      new_start: 50,
      new_lines: 8,
      header: '@@ -45,5 +50,8 @@ export default function CommitHistory({',
      lines: [
        { line_type: 'context', old_line_no: 45, new_line_no: 50, content: '  return (' },
        { line_type: 'context', old_line_no: 46, new_line_no: 51, content: '    <div className="flex flex-col h-full">' },
        { line_type: 'deletion', old_line_no: 47, new_line_no: null, content: '      <h3>Commit History</h3>' },
        { line_type: 'addition', old_line_no: null, new_line_no: 52, content: '      <div className="flex items-center justify-between p-3">' },
        { line_type: 'addition', old_line_no: null, new_line_no: 53, content: '        <h3 className="font-semibold">커밋 히스토리</h3>' },
        { line_type: 'addition', old_line_no: null, new_line_no: 54, content: '        <button onClick={onRefresh}>새로고침</button>' },
        { line_type: 'addition', old_line_no: null, new_line_no: 55, content: '      </div>' },
        { line_type: 'context', old_line_no: 48, new_line_no: 56, content: '      {commits.map(commit => (' },
        { line_type: 'context', old_line_no: 49, new_line_no: 57, content: '        <CommitRow key={commit.sha} commit={commit} />' },
      ],
    },
  ],
  additions: 7,
  deletions: 2,
};

export const MOCK_DIFF_STATS: DiffStat[] = [
  { file_path: 'src/components/CommitHistory.tsx', additions: 7, deletions: 2, is_binary: false },
  { file_path: 'src/services/api.ts', additions: 15, deletions: 3, is_binary: false },
  { file_path: 'src/components/NewFeature.tsx', additions: 42, deletions: 0, is_binary: false },
];

export const MOCK_COMMIT_FILE_CHANGES: CommitFileChange[] = [
  { path: 'src/components/CommitHistory.tsx', status: 'modified', additions: 25, deletions: 8, is_binary: false, old_path: null },
  { path: 'src/services/api.ts', status: 'modified', additions: 15, deletions: 3, is_binary: false, old_path: null },
  { path: 'src/components/NewFeature.tsx', status: 'added', additions: 42, deletions: 0, is_binary: false, old_path: null },
  { path: 'src/old-module.ts', status: 'deleted', additions: 0, deletions: 85, is_binary: false, old_path: null },
  { path: 'src/assets/logo.png', status: 'modified', additions: 0, deletions: 0, is_binary: true, old_path: null },
  { path: 'src/utils/renamed.ts', status: 'renamed', additions: 3, deletions: 1, is_binary: false, old_path: 'src/utils/old-name.ts' },
];

// ============================================================================
// Remote
// ============================================================================

export const MOCK_REMOTES: RemoteInfo[] = [
  { name: 'origin', url: 'https://github.com/user/my-awesome-app.git', fetch_url: 'https://github.com/user/my-awesome-app.git', push_url: 'https://github.com/user/my-awesome-app.git' },
  { name: 'upstream', url: 'https://github.com/original/my-awesome-app.git', fetch_url: 'https://github.com/original/my-awesome-app.git', push_url: 'https://github.com/original/my-awesome-app.git' },
];

export const MOCK_REMOTE_BRANCHES: RemoteBranchInfo[] = [
  { name: 'main', full_name: 'origin/main', commit_sha: sha(4).slice(0, 7), commit_message: 'Merge feature/dark-mode into main', is_head: true },
  { name: 'develop', full_name: 'origin/develop', commit_sha: sha(3).slice(0, 7), commit_message: 'fix: address code review comments', is_head: false },
  { name: 'release/v1.0', full_name: 'origin/release/v1.0', commit_sha: sha(8).slice(0, 7), commit_message: 'Merge feature/image-diff into main', is_head: false },
];

export const MOCK_SYNC_PROGRESS: SyncProgress = {
  phase: 'idle',
  current: 0,
  total: 0,
  bytes: 0,
  message: '',
};

// ============================================================================
// Stash
// ============================================================================

export const MOCK_STASHES: StashInfo[] = [
  { index: 0, message: 'WIP on main: auth 작업 중', oid: sha(1).slice(0, 7) },
  { index: 1, message: 'WIP on feature/dark-mode: 다크 모드 테스트', oid: sha(10).slice(0, 7) },
];

// ============================================================================
// Tags
// ============================================================================

export const MOCK_TAGS: TagInfo[] = [
  { name: 'v0.2.0', target: sha(1), message: 'Release with auth and dark mode', tagger: 'Kim Minjun', date: ts(0) },
  { name: 'v0.1.0-beta', target: sha(8), message: 'Beta release with image diff', tagger: 'Park Jihoon', date: ts(7) },
  { name: 'v0.0.1', target: sha(14), message: 'Initial release', tagger: 'Choi Eunji', date: ts(14) },
];

// ============================================================================
// Reflog
// ============================================================================

export const MOCK_REFLOG: ReflogEntry[] = [
  { index: 0, old_oid: sha(2).slice(0, 7), new_oid: sha(1).slice(0, 7), message: 'commit: feat: add user authentication', committer: 'Kim Minjun', timestamp: ts(0) },
  { index: 1, old_oid: sha(3).slice(0, 7), new_oid: sha(2).slice(0, 7), message: 'merge: Merge feature/auth into main', committer: 'Park Jihoon', timestamp: ts(1) },
  { index: 2, old_oid: sha(4).slice(0, 7), new_oid: sha(3).slice(0, 7), message: 'commit: fix: address code review comments', committer: 'Lee Soyeon', timestamp: ts(2) },
  { index: 3, old_oid: sha(5).slice(0, 7), new_oid: sha(4).slice(0, 7), message: 'merge: Merge feature/dark-mode into main', committer: 'Park Jihoon', timestamp: ts(3) },
  { index: 4, old_oid: sha(6).slice(0, 7), new_oid: sha(5).slice(0, 7), message: 'commit: chore: update dependencies', committer: 'Kim Minjun', timestamp: ts(4) },
  { index: 5, old_oid: sha(7).slice(0, 7), new_oid: sha(6).slice(0, 7), message: 'merge: Merge hotfix/encoding into main', committer: 'Lee Soyeon', timestamp: ts(5) },
];

// ============================================================================
// Bundle Refs
// ============================================================================

export const MOCK_BUNDLE_REFS: BundleRefInfo[] = [
  { name: 'main', commit_sha: sha(1).slice(0, 7), ref_type: 'branch' },
  { name: 'develop', commit_sha: sha(3).slice(0, 7), ref_type: 'branch' },
  { name: 'feature/auth', commit_sha: sha(20).slice(0, 7), ref_type: 'branch' },
  { name: 'feature/image-diff', commit_sha: sha(40).slice(0, 7), ref_type: 'branch' },
  { name: 'v0.2.0', commit_sha: sha(1).slice(0, 7), ref_type: 'tag' },
  { name: 'v0.1.0-beta', commit_sha: sha(8).slice(0, 7), ref_type: 'tag' },
  { name: 'v0.0.1', commit_sha: sha(14).slice(0, 7), ref_type: 'tag' },
];

// ============================================================================
// Conflict (empty by default)
// ============================================================================

export const MOCK_CONFLICT_INFO: ConflictInfo = {
  files: [
    {
      path: 'src/utils/helpers.ts',
      our_content: '// Our version\nexport function greet(name: string) {\n  return `Hello, ${name}!`;\n}\n',
      their_content: '// Their version\nexport function greet(name: string) {\n  return `안녕하세요, ${name}!`;\n}\n',
      base_content: '// Base version\nexport function greet(name: string) {\n  return `Hi, ${name}!`;\n}\n',
    },
  ],
  merge_head: sha(20).slice(0, 7),
  merge_msg: 'Merge branch "feature/auth" into main',
};

// ============================================================================
// File History
// ============================================================================

export const MOCK_FILE_HISTORY: FileHistoryEntry[] = [
  { commit_sha: sha(1), message: 'feat: add authentication', author: 'Kim Minjun', date: ts(0), changes: 'modified', old_path: null },
  { commit_sha: sha(5), message: 'chore: update deps', author: 'Kim Minjun', date: ts(4), changes: 'modified', old_path: null },
  { commit_sha: sha(9), message: 'feat: branch management UI', author: 'Park Jihoon', date: ts(8), changes: 'modified', old_path: null },
  { commit_sha: sha(14), message: 'initial setup', author: 'Choi Eunji', date: ts(14), changes: 'added', old_path: null },
];
