import type { CommitInfo, RepositoryInfo, FileStatus, BranchInfo } from './git';

/**
 * 탭별 UI 상태
 */
export interface TabUIState {
  // View managers
  showBranchManager: boolean;
  showRemoteManager: boolean;
  showCommitGraph: boolean;
  showStashManager: boolean;
  showTagManager: boolean;
  showReflogViewer: boolean;
  showConflictResolver: boolean;
  showMergeDialog: boolean;
  showBundleManager: boolean;
  showCherryPickDialog: boolean;
  showRevertDialog: boolean;
  
  // Dialogs
  commitDialogOpen: boolean;
  showShortcutHelp: boolean;
  showAccessibilitySettings: boolean;
  
  // File views
  fileHistoryPath: string | null;
  selectedFile: { path: string; staged: boolean } | null;
  
  // Commit detail view
  selectedCommitSha: string | null;
  
  // Cherry-pick/Revert state
  cherryPickCommit: { sha: string; message: string } | null;
  revertCommit: { sha: string; message: string } | null;
}

/**
 * 탭별 데이터 상태
 */
export interface TabDataState {
  currentRepo: RepositoryInfo | null;
  commits: CommitInfo[];
  fileChanges: FileStatus[];
  branches: BranchInfo[];
  loading: boolean;
}

/**
 * 개별 탭
 */
export interface Tab {
  id: string;                    // 고유 ID (UUID)
  title: string;                 // 탭 제목 (레포 이름)
  repoPath: string;              // 레포지토리 경로
  uiState: TabUIState;           // UI 상태
  dataState: TabDataState;       // 데이터 상태
  lastActive: number;            // 마지막 활성 시간 (timestamp)
}

/**
 * localStorage에 저장할 탭 데이터 (간소화)
 */
export interface SavedTab {
  id: string;
  title: string;
  repoPath: string;
  lastActive: number;
}

/**
 * 탭 컨텍스트 메뉴 옵션
 */
export type TabContextMenuAction = 
  | 'close'
  | 'close-others'
  | 'close-all'
  | 'close-right';

/**
 * 초기 TabUIState
 */
export const createInitialUIState = (): TabUIState => ({
  showBranchManager: false,
  showRemoteManager: false,
  showCommitGraph: false,
  showStashManager: false,
  showTagManager: false,
  showReflogViewer: false,
  showConflictResolver: false,
  showMergeDialog: false,
  showBundleManager: false,
  showCherryPickDialog: false,
  showRevertDialog: false,
  commitDialogOpen: false,
  showShortcutHelp: false,
  showAccessibilitySettings: false,
  fileHistoryPath: null,
  selectedFile: null,
  selectedCommitSha: null,
  cherryPickCommit: null,
  revertCommit: null,
});

/**
 * 초기 TabDataState
 */
export const createInitialDataState = (): TabDataState => ({
  currentRepo: null,
  commits: [],
  fileChanges: [],
  branches: [],
  loading: false,
});

/**
 * 새 탭 생성
 */
export const createNewTab = (repoPath: string, title: string): Tab => ({
  id: crypto.randomUUID(),
  title,
  repoPath,
  uiState: createInitialUIState(),
  dataState: createInitialDataState(),
  lastActive: Date.now(),
});
