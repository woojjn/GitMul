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
    case 'get_file_diff':
      return `diff --git a/src/example.ts b/src/example.ts
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,5 +1,7 @@
 import React from "react";
-import { old } from "old";
+import { new } from "new";
+import { extra } from "extra";
 
 export default function Example() {
-  return <div>Old</div>;
+  return <div>New</div>;
 }` as unknown as T;

    case 'get_commit_diff':
      return 'diff --git a/src/example.ts b/src/example.ts\n...(mock commit diff)' as unknown as T;

    case 'get_commit_file_changes':
      return [...mock.MOCK_COMMIT_FILE_CHANGES] as unknown as T;

    case 'parse_diff': {
      const text = (args?.diffText as string) ?? '';
      // Return realistic parsed diff if we have one, otherwise minimal
      if (text.includes('example.ts')) {
        return {
          file_path: 'src/example.ts',
          old_path: 'src/example.ts',
          new_path: 'src/example.ts',
          is_binary: false,
          hunks: [{
            old_start: 1, old_lines: 5, new_start: 1, new_lines: 7,
            header: '@@ -1,5 +1,7 @@',
            lines: [
              { line_type: 'context', old_line_no: 1, new_line_no: 1, content: 'import React from "react";' },
              { line_type: 'deletion', old_line_no: 2, new_line_no: null, content: 'import { old } from "old";' },
              { line_type: 'addition', old_line_no: null, new_line_no: 2, content: 'import { new } from "new";' },
              { line_type: 'addition', old_line_no: null, new_line_no: 3, content: 'import { extra } from "extra";' },
              { line_type: 'context', old_line_no: 3, new_line_no: 4, content: '' },
              { line_type: 'context', old_line_no: 4, new_line_no: 5, content: 'export default function Example() {' },
              { line_type: 'deletion', old_line_no: 5, new_line_no: null, content: '  return <div>Old</div>;' },
              { line_type: 'addition', old_line_no: null, new_line_no: 6, content: '  return <div>New</div>;' },
              { line_type: 'context', old_line_no: null, new_line_no: 7, content: '}' },
            ],
          }],
          additions: 3,
          deletions: 2,
        } satisfies ParsedDiff as unknown as T;
      }
      return mock.MOCK_PARSED_DIFF as unknown as T;
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
      return { old_image: null, new_image: null, is_image: true, file_path: args?.filePath ?? '' } as unknown as T;

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
