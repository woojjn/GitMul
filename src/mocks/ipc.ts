/**
 * Mock IPC handler for browser-based development.
 *
 * When Tauri runtime is not detected (`window.__TAURI_IPC__` is undefined),
 * this module provides a fake `invoke()` that returns mock data,
 * and fake `open()` / `save()` dialogs that return prompt-based paths.
 *
 * This allows full UI testing in any web browser without the Rust backend.
 */

import * as mock from './data';
import { getMockImageDiff } from './imageData';
import type { ParsedDiff } from '../types/git';

// ============================================================================
// Runtime detection
// ============================================================================

export const isTauri = (): boolean =>
  typeof window !== 'undefined' &&
  typeof (window as any).__TAURI_IPC__ === 'function';

// ============================================================================
// In-memory mutable state (simulates backend state changes)
// ============================================================================

let fileChanges = [...mock.MOCK_FILE_CHANGES];
let stashes = [...mock.MOCK_STASHES];
let commits = [...mock.MOCK_COMMITS];
let branches = [...mock.MOCK_BRANCHES];
let tags = [...mock.MOCK_TAGS];
let remotes = [...mock.MOCK_REMOTES];
let hasConflict = false;

// ============================================================================
// Fake delay to simulate IPC latency
// ============================================================================

const delay = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// Status-aware mock diff generators
// ============================================================================

/** Per-file mock content (realistic source for different files) */
const MOCK_FILE_CONTENTS: Record<string, string[]> = {
  'src/old-module.ts': [
    'import { LegacyModule } from "./legacy";',
    'import { DeprecatedUtil } from "../utils/deprecated";',
    '',
    '/**',
    ' * @deprecated Use NewModule instead.',
    ' * This module will be removed in v2.0.',
    ' */',
    'export class OldModule {',
    '  private data: Map<string, unknown>;',
    '',
    '  constructor() {',
    '    this.data = new Map();',
    '  }',
    '',
    '  process(input: string): string {',
    '    return LegacyModule.transform(input);',
    '  }',
    '',
    '  cleanup(): void {',
    '    this.data.clear();',
    '    DeprecatedUtil.dispose(this);',
    '  }',
    '}',
  ],
  'src/assets/old-icon.png': ['(binary file)'],
  'tests/auth.test.ts': [
    'import { describe, it, expect } from "vitest";',
    'import { AuthService } from "../src/services/auth";',
    '',
    'describe("AuthService", () => {',
    '  it("should authenticate a valid user", async () => {',
    '    const auth = new AuthService();',
    '    const token = await auth.login("user@example.com", "password123");',
    '    expect(token).toBeDefined();',
    '    expect(typeof token).toBe("string");',
    '  });',
    '',
    '  it("should reject invalid credentials", async () => {',
    '    const auth = new AuthService();',
    '    await expect(auth.login("bad@user.com", "wrong")).rejects.toThrow();',
    '  });',
    '',
    '  it("should refresh expired tokens", async () => {',
    '    const auth = new AuthService();',
    '    const token = await auth.login("user@example.com", "password123");',
    '    const refreshed = await auth.refresh(token!);',
    '    expect(refreshed).not.toBe(token);',
    '  });',
    '});',
  ],
  'src/assets/logo-kr.png': ['(binary file)'],
  'src/components/NewFeature.tsx': [
    'import { useState } from "react";',
    '',
    'interface NewFeatureProps {',
    '  title: string;',
    '  onActivate?: () => void;',
    '}',
    '',
    'export default function NewFeature({ title, onActivate }: NewFeatureProps) {',
    '  const [active, setActive] = useState(false);',
    '',
    '  const handleToggle = () => {',
    '    setActive(!active);',
    '    if (!active && onActivate) onActivate();',
    '  };',
    '',
    '  return (',
    '    <div className="p-4 rounded-lg border">',
    '      <h3 className="text-lg font-bold">{title}</h3>',
    '      <button onClick={handleToggle}>',
    '        {active ? "Deactivate" : "Activate"}',
    '      </button>',
    '    </div>',
    '  );',
    '}',
  ],
};

/** Modified-file mock content: old version lines vs new version lines */
const MOCK_MODIFIED_DIFFS: Record<string, { old: string[]; new: string[] }> = {
  'src/hooks/useAuth.ts': {
    old: [
      'import { useState } from "react";',
      '',
      'export function useAuth() {',
      '  const [user, setUser] = useState(null);',
      '',
      '  const login = async (email: string, password: string) => {',
      '    const res = await fetch("/api/login", {',
      '      method: "POST",',
      '      body: JSON.stringify({ email, password }),',
      '    });',
      '    const data = await res.json();',
      '    setUser(data.user);',
      '  };',
      '',
      '  return { user, login };',
      '}',
    ],
    new: [
      'import { useState, useCallback } from "react";',
      'import { jwtDecode } from "jwt-decode";',
      '',
      'export function useAuth() {',
      '  const [user, setUser] = useState(null);',
      '  const [token, setToken] = useState<string | null>(null);',
      '',
      '  const login = useCallback(async (email: string, password: string) => {',
      '    const res = await fetch("/api/login", {',
      '      method: "POST",',
      '      headers: { "Content-Type": "application/json" },',
      '      body: JSON.stringify({ email, password }),',
      '    });',
      '    if (!res.ok) throw new Error("Authentication failed");',
      '    const data = await res.json();',
      '    setUser(data.user);',
      '    setToken(data.token);',
      '  }, []);',
      '',
      '  const logout = useCallback(() => {',
      '    setUser(null);',
      '    setToken(null);',
      '  }, []);',
      '',
      '  return { user, token, login, logout };',
      '}',
    ],
  },
  'src/utils/helpers.ts': {
    old: [
      'export function formatDate(ts: number): string {',
      '  const d = new Date(ts * 1000);',
      '  return d.toLocaleDateString();',
      '}',
      '',
      'export function truncate(str: string, len: number): string {',
      '  return str.length > len ? str.slice(0, len) + "..." : str;',
      '}',
    ],
    new: [
      'export function formatDate(ts: number): string {',
      '  const d = new Date(ts * 1000);',
      '  return d.toLocaleDateString("ko-KR", {',
      '    year: "numeric",',
      '    month: "2-digit",',
      '    day: "2-digit",',
      '  });',
      '}',
      '',
      'export function truncate(str: string, len: number): string {',
      '  if (str.length <= len) return str;',
      '  return str.slice(0, len - 1) + "\\u2026";',
      '}',
      '',
      'export function capitalize(str: string): string {',
      '  return str.charAt(0).toUpperCase() + str.slice(1);',
      '}',
    ],
  },
  'README.md': {
    old: [
      '# My Awesome App',
      '',
      'A simple project.',
      '',
      '## Setup',
      '',
      '```bash',
      'npm install',
      'npm start',
      '```',
    ],
    new: [
      '# My Awesome App',
      '',
      'A powerful Git GUI built with Tauri + React + TypeScript.',
      '',
      '## Features',
      '',
      '- Commit history with graph visualization',
      '- File staging and unstaging with tree view',
      '- Image diff support (side-by-side, overlay, onion skin)',
      '- Branch, tag, stash, and remote management',
      '',
      '## Setup',
      '',
      '```bash',
      'npm install',
      'npm run tauri dev',
      '```',
    ],
  },
};

/**
 * Generate realistic diff text based on file status.
 */
function generateMockDiffText(filePath: string, status: string): string {
  const isImage = /\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)$/i.test(filePath);

  if (status === 'deleted') {
    if (isImage) {
      return `diff --git a/${filePath} /dev/null\ndeleted file mode 100644\nBinary files a/${filePath} and /dev/null differ`;
    }
    const lines = MOCK_FILE_CONTENTS[filePath] ?? [
      '// This file has been deleted',
      'export default {};',
    ];
    const delLines = lines.map(l => `-${l}`).join('\n');
    return [
      `diff --git a/${filePath} /dev/null`,
      `deleted file mode 100644`,
      `--- a/${filePath}`,
      `+++ /dev/null`,
      `@@ -1,${lines.length} +0,0 @@`,
      delLines,
    ].join('\n');
  }

  if (status === 'untracked' || status === 'new file') {
    if (isImage) {
      return `diff --git /dev/null b/${filePath}\nnew file mode 100644\nBinary files /dev/null and b/${filePath} differ`;
    }
    const lines = MOCK_FILE_CONTENTS[filePath] ?? [
      '// New file',
      `export default function ${filePath.split('/').pop()?.replace(/\.\w+$/, '') ?? 'Module'}() {}`,
    ];
    const addLines = lines.map(l => `+${l}`).join('\n');
    return [
      `diff --git /dev/null b/${filePath}`,
      `new file mode 100644`,
      `--- /dev/null`,
      `+++ b/${filePath}`,
      `@@ -0,0 +1,${lines.length} @@`,
      addLines,
    ].join('\n');
  }

  // modified (default)
  if (isImage) {
    return `diff --git a/${filePath} b/${filePath}\nBinary files a/${filePath} and b/${filePath} differ`;
  }

  const modData = MOCK_MODIFIED_DIFFS[filePath];
  if (modData) {
    return buildUnifiedDiff(filePath, modData.old, modData.new);
  }

  // Fallback generic modified diff
  return [
    `diff --git a/${filePath} b/${filePath}`,
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -1,5 +1,7 @@`,
    ` import React from "react";`,
    `-import { old } from "old";`,
    `+import { updated } from "updated";`,
    `+import { extra } from "extra";`,
    ` `,
    ` export default function Example() {`,
    `-  return <div>Old</div>;`,
    `+  return <div>Updated</div>;`,
    ` }`,
  ].join('\n');
}

/** Build a simple unified diff from old/new line arrays using LCS-based approach */
function buildUnifiedDiff(filePath: string, oldLines: string[], newLines: string[]): string {
  // Simple line-by-line diff using LCS
  const ops = diffLines(oldLines, newLines);
  const diffBody = ops.map(op => {
    if (op.type === 'equal') return ` ${op.line}`;
    if (op.type === 'delete') return `-${op.line}`;
    return `+${op.line}`;
  }).join('\n');

  return [
    `diff --git a/${filePath} b/${filePath}`,
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
    diffBody,
  ].join('\n');
}

/** Minimal LCS-based diff */
function diffLines(a: string[], b: string[]): Array<{ type: 'equal' | 'delete' | 'add'; line: string }> {
  const m = a.length, n = b.length;
  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // Backtrack
  const result: Array<{ type: 'equal' | 'delete' | 'add'; line: string }> = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: 'equal', line: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'add', line: b[j - 1] });
      j--;
    } else {
      result.push({ type: 'delete', line: a[i - 1] });
      i--;
    }
  }
  return result.reverse();
}

/**
 * Parse raw diff text into ParsedDiff structure.
 * Handles deleted (all -), new (all +), modified (mixed), and binary files.
 */
function parseMockDiff(text: string): ParsedDiff {
  const isBinary = text.includes('Binary files');
  const isDeleted = text.includes('deleted file mode');
  const isNew = text.includes('new file mode');

  // Extract file path
  let filePath = 'unknown';
  const gitLine = text.match(/diff --git (?:a\/)?(\S+) (?:b\/)?(\S+)/);
  if (gitLine) {
    filePath = isDeleted ? gitLine[1].replace(/^a\//, '') : gitLine[2].replace(/^b\//, '');
    if (filePath === '/dev/null' && gitLine[1]) filePath = gitLine[1].replace(/^a\//, '');
  }

  if (isBinary) {
    return {
      file_path: filePath,
      old_path: isNew ? '/dev/null' : filePath,
      new_path: isDeleted ? '/dev/null' : filePath,
      is_binary: true,
      hunks: [],
      additions: 0,
      deletions: 0,
    };
  }

  // Parse hunks
  const hunkRegex = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)$/;
  const bodyLines = text.split('\n');
  const hunks: ParsedDiff['hunks'] = [];
  let currentHunk: ParsedDiff['hunks'][0] | null = null;
  let oldLine = 0, newLine = 0;
  let totalAdd = 0, totalDel = 0;

  for (const raw of bodyLines) {
    const hunkMatch = raw.match(hunkRegex);
    if (hunkMatch) {
      currentHunk = {
        old_start: parseInt(hunkMatch[1]),
        old_lines: parseInt(hunkMatch[2] || '0'),
        new_start: parseInt(hunkMatch[3]),
        new_lines: parseInt(hunkMatch[4] || '0'),
        header: raw,
        lines: [],
      };
      oldLine = currentHunk.old_start;
      newLine = currentHunk.new_start;
      hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) continue;

    if (raw.startsWith('+')) {
      currentHunk.lines.push({
        line_type: 'addition',
        old_line_no: null,
        new_line_no: newLine++,
        content: raw.slice(1),
      });
      totalAdd++;
    } else if (raw.startsWith('-')) {
      currentHunk.lines.push({
        line_type: 'deletion',
        old_line_no: oldLine++,
        new_line_no: null,
        content: raw.slice(1),
      });
      totalDel++;
    } else if (raw.startsWith(' ')) {
      currentHunk.lines.push({
        line_type: 'context',
        old_line_no: oldLine++,
        new_line_no: newLine++,
        content: raw.slice(1),
      });
    }
  }

  return {
    file_path: filePath,
    old_path: isNew ? '/dev/null' : filePath,
    new_path: isDeleted ? '/dev/null' : filePath,
    is_binary: false,
    hunks,
    additions: totalAdd,
    deletions: totalDel,
  };
}

// ============================================================================
// Mock invoke handler
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mockInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  await delay(80 + Math.random() * 150);

  switch (cmd) {
    // ---- Repository Core ----
    case 'open_repository':
      return { ...mock.MOCK_REPO, path: args?.path ?? mock.MOCK_REPO.path } as unknown as T;

    case 'get_commit_history':
      return commits.slice(0, args?.limit ?? 100) as unknown as T;

    case 'get_repository_status':
      return [...fileChanges] as unknown as T;

    case 'stage_file': {
      const p = args?.path as string;
      fileChanges = fileChanges.map(f => f.path === p ? { ...f, staged: true } : f);
      return undefined as unknown as T;
    }

    case 'unstage_file': {
      const p = args?.path as string;
      fileChanges = fileChanges.map(f => f.path === p ? { ...f, staged: false } : f);
      return undefined as unknown as T;
    }

    case 'stage_all':
      fileChanges = fileChanges.map(f => ({ ...f, staged: true }));
      return undefined as unknown as T;

    case 'create_commit': {
      const newSha = Math.random().toString(16).slice(2).padEnd(40, '0');
      const msg = (args?.message as string) ?? 'mock commit';
      commits = [
        {
          sha: newSha,
          author: 'You (mock)',
          email: 'you@mock.dev',
          message: msg,
          timestamp: Math.floor(Date.now() / 1000),
          date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          parent_ids: commits.length > 0 ? [commits[0].sha] : [],
        },
        ...commits,
      ];
      // Remove staged files
      fileChanges = fileChanges.filter(f => !f.staged);
      return newSha as unknown as T;
    }

    // ---- Recent Repos ----
    case 'get_recent_repos':
      return [...mock.MOCK_RECENT_REPOS] as unknown as T;

    case 'add_recent_repo':
      return undefined as unknown as T;

    // ---- Branch ----
    case 'list_branches':
      return [...branches] as unknown as T;

    case 'get_current_branch':
      return (branches.find(b => b.is_current)?.name ?? 'main') as unknown as T;

    case 'create_branch': {
      const name = args?.branchName as string;
      branches = [
        ...branches,
        {
          name,
          is_current: false,
          is_remote: false,
          commit_sha: commits[0]?.sha.slice(0, 7) ?? '0000000',
          commit_message: commits[0]?.message ?? '',
          author: 'You (mock)',
          timestamp: Math.floor(Date.now() / 1000),
        },
      ];
      return `브랜치 '${name}' 생성 완료` as unknown as T;
    }

    case 'switch_branch': {
      const target = args?.branchName as string;
      branches = branches.map(b => ({ ...b, is_current: b.name === target }));
      return `'${target}'(으)로 전환 완료` as unknown as T;
    }

    case 'delete_branch': {
      const del = args?.branchName as string;
      branches = branches.filter(b => b.name !== del);
      return `브랜치 '${del}' 삭제 완료` as unknown as T;
    }

    case 'rename_branch': {
      const old = args?.oldName as string;
      const newN = args?.newName as string;
      branches = branches.map(b => b.name === old ? { ...b, name: newN } : b);
      return `브랜치 '${old}' → '${newN}' 이름 변경 완료` as unknown as T;
    }

    // ---- Diff ----
    case 'get_file_diff': {
      const fp = (args?.filePath as string) ?? '';
      const fileEntry = fileChanges.find(f => f.path === fp);
      const st = fileEntry?.status ?? 'modified';
      return generateMockDiffText(fp, st) as unknown as T;
    }

    case 'get_commit_diff':
      return 'diff --git a/src/example.ts b/src/example.ts\n...(mock commit diff)' as unknown as T;

    case 'get_commit_file_changes':
      return [...mock.MOCK_COMMIT_FILE_CHANGES] as unknown as T;

    case 'parse_diff': {
      const text = (args?.diffText as string) ?? '';
      return parseMockDiff(text) as unknown as T;
    }

    case 'get_file_content':
      return '// Mock file content\nexport default function Hello() {\n  return <div>Hello World</div>;\n}\n' as unknown as T;

    case 'get_diff_stats':
      return [...mock.MOCK_DIFF_STATS] as unknown as T;

    // ---- Image Diff ----
    case 'check_is_image': {
      const fp = (args?.filePath as string) ?? '';
      return /\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)$/i.test(fp) as unknown as T;
    }

    case 'get_image_diff':
      return getMockImageDiff(args?.filePath ?? '') as unknown as T;

    case 'get_image_at_commit':
      return null as unknown as T;

    // ---- Remote ----
    case 'list_remotes':
      return [...remotes] as unknown as T;

    case 'add_remote': {
      const rn = args?.name as string;
      const ru = args?.url as string;
      remotes = [...remotes, { name: rn, url: ru, fetch_url: ru, push_url: ru }];
      return `원격 '${rn}' 추가 완료` as unknown as T;
    }

    case 'remove_remote': {
      const rn = args?.name as string;
      remotes = remotes.filter(r => r.name !== rn);
      return `원격 '${rn}' 삭제 완료` as unknown as T;
    }

    case 'fetch_remote':
      return `'${args?.remoteName}' 페치 완료 (mock)` as unknown as T;

    case 'pull_changes':
      return '풀 성공 (mock - fast-forward)' as unknown as T;

    case 'push_changes':
      return `'${args?.remoteName}/${args?.branchName}' 푸시 완료 (mock)` as unknown as T;

    case 'get_remote_branches':
      return [...mock.MOCK_REMOTE_BRANCHES] as unknown as T;

    case 'get_sync_progress':
      return { ...mock.MOCK_SYNC_PROGRESS } as unknown as T;

    case 'check_remote_connection':
      return true as unknown as T;

    // ---- Amend ----
    case 'amend_commit':
      if (commits.length > 0) {
        commits[0] = { ...commits[0], message: args?.message ?? commits[0].message };
      }
      return (commits[0]?.sha ?? '') as unknown as T;

    case 'get_last_commit_message':
      return (commits[0]?.message ?? '') as unknown as T;

    // ---- Stash ----
    case 'stash_save': {
      const msg = (args?.message as string) || 'WIP on main';
      stashes = [{ index: 0, message: msg, oid: Math.random().toString(16).slice(2, 9) }, ...stashes.map(s => ({ ...s, index: s.index + 1 }))];
      return '스태시 저장 완료 (mock)' as unknown as T;
    }

    case 'stash_list':
      return [...stashes] as unknown as T;

    case 'stash_apply':
      return '스태시 적용 완료 (mock)' as unknown as T;

    case 'stash_pop': {
      const idx = (args?.index as number) ?? 0;
      stashes = stashes.filter(s => s.index !== idx);
      return '스태시 팝 완료 (mock)' as unknown as T;
    }

    case 'stash_drop': {
      const idx = (args?.index as number) ?? 0;
      stashes = stashes.filter(s => s.index !== idx);
      return '스태시 삭제 완료 (mock)' as unknown as T;
    }

    // ---- Merge ----
    case 'merge_branch':
      return '병합 완료 (mock - fast-forward)' as unknown as T;

    case 'can_merge':
      return true as unknown as T;

    case 'get_merge_conflicts':
      return [] as unknown as T;

    // ---- Conflict ----
    case 'get_conflicts':
      return (hasConflict ? mock.MOCK_CONFLICT_INFO : { files: [], merge_head: null, merge_msg: null }) as unknown as T;

    case 'resolve_conflict':
      return undefined as unknown as T;

    case 'abort_merge':
      hasConflict = false;
      return undefined as unknown as T;

    // ---- Cherry-pick ----
    case 'cherry_pick':
      return { success: true, conflicts: [], message: 'Cherry-pick 성공 (mock)' } as unknown as T;

    case 'cherry_pick_continue':
    case 'cherry_pick_abort':
      return undefined as unknown as T;

    // ---- Revert ----
    case 'revert_commit':
      return { success: true, conflicts: [], message: 'Revert 성공 (mock)' } as unknown as T;

    // ---- Tags ----
    case 'list_tags':
      return [...tags] as unknown as T;

    case 'create_tag':
    case 'create_annotated_tag': {
      const tn = args?.tagName as string;
      tags = [...tags, { name: tn, target: commits[0]?.sha ?? '', message: args?.message ?? null, tagger: 'You (mock)', date: Math.floor(Date.now() / 1000) }];
      return undefined as unknown as T;
    }

    case 'delete_tag': {
      const tn = args?.tagName as string;
      tags = tags.filter(t => t.name !== tn);
      return undefined as unknown as T;
    }

    case 'push_tag':
      return undefined as unknown as T;

    // ---- File History ----
    case 'get_file_history':
      return [...mock.MOCK_FILE_HISTORY] as unknown as T;

    case 'get_file_at_commit':
      return '// File content at commit (mock)\nexport const value = 42;\n' as unknown as T;

    // ---- Rebase ----
    case 'start_rebase':
      return { success: true, conflicts: [], message: '리베이스 완료 (mock)' } as unknown as T;

    case 'rebase_continue':
    case 'rebase_abort':
      return undefined as unknown as T;

    case 'get_rebase_status':
      return { in_progress: false, current_operation: null, total_operations: null } as unknown as T;

    // ---- Reflog ----
    case 'get_reflog':
      return [...mock.MOCK_REFLOG] as unknown as T;

    case 'reset_to_reflog':
      return undefined as unknown as T;

    // ---- Bundle ----
    case 'list_bundle_refs':
      return [...mock.MOCK_BUNDLE_REFS] as unknown as T;

    case 'create_bundle':
      return {
        success: true,
        output_path: args?.outputPath ?? '/tmp/repo.bundle',
        message: '번들 생성 완료 (mock)',
        file_size: 1024 * 256,
      } as unknown as T;

    case 'verify_bundle':
      return {
        valid: true,
        message: '번들이 유효합니다 (mock, 5개 ref 포함)',
        refs: ['refs/heads/main (abc1234)', 'refs/heads/develop (def5678)', 'refs/tags/v0.1.0 (111aaaa)'],
      } as unknown as T;

    case 'fetch_from_bundle':
      return '번들에서 페치 완료 (mock)' as unknown as T;

    case 'clone_from_bundle':
      return `번들에서 클론 완료: ${args?.targetPath ?? '/tmp/cloned'}` as unknown as T;

    // ---- Shell / System Integration ----
    case 'open_in_explorer':
      console.log(`[Mock] Open in Explorer: ${args?.repoPath}`);
      return undefined as unknown as T;

    case 'open_terminal':
      console.log(`[Mock] Open Terminal at: ${args?.repoPath}`);
      return undefined as unknown as T;

    default:
      console.warn(`[Mock IPC] Unknown command: ${cmd}`, args);
      return undefined as unknown as T;
  }
}

// ============================================================================
// Mock Dialog APIs
// ============================================================================

export async function mockOpenDialog(options?: any): Promise<string | string[] | null> {
  const isDir = options?.directory === true;
  const title = options?.title ?? (isDir ? 'Select directory' : 'Select file');

  // When inside an automated/headless browser (or if prompt is suppressed),
  // return sensible defaults so the UI can be exercised without user input.
  if (isDir) {
    // For directory dialogs, return the mock repo path
    const result = window.prompt(
      `[Mock Dialog] ${title}\n\n경로를 입력하세요 (취소하려면 빈칸):`,
      '/home/user/projects/my-awesome-app'
    );
    // If prompt returns null (headless browser), still return default
    return result ?? '/home/user/projects/my-awesome-app';
  }

  const result = window.prompt(
    `[Mock Dialog] ${title}\n\n파일 경로를 입력하세요:`,
    '/home/user/file.bundle'
  );
  return result ?? '/home/user/file.bundle';
}

export async function mockSaveDialog(options?: any): Promise<string | null> {
  const title = options?.title ?? 'Save file';
  const defaultPath = options?.defaultPath ?? 'output.bundle';
  const result = window.prompt(
    `[Mock Dialog] ${title}\n\n저장 경로를 입력하세요:`,
    `/home/user/${defaultPath}`
  );
  return result ?? `/home/user/${defaultPath}`;
}
