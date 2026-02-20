import { 
  FolderOpen, RefreshCw, GitBranch, GitCommit, Network, Package, 
  Tag, RotateCcw, Eye, Keyboard, Settings2, Moon, Sun 
} from 'lucide-react';
import type { TabUIState } from '../types/tab';

interface ToolbarProps {
  activeTabId: string;
  uiState: TabUIState | undefined;
  hasRepo: boolean;
  darkMode: boolean;
  onOpenRepo: () => void;
  onRefresh: () => void;
  onToggleDarkMode: () => void;
  onUpdateUIState: (tabId: string, updates: Partial<TabUIState>) => void;
}

/**
 * Toolbar Component
 * 
 * Main toolbar with repository actions, view toggles, and settings.
 */
export default function Toolbar({
  activeTabId,
  uiState,
  hasRepo,
  darkMode,
  onOpenRepo,
  onRefresh,
  onToggleDarkMode,
  onUpdateUIState,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      {/* Open Repository */}
      <button
        onClick={onOpenRepo}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="레포지토리 열기 (Ctrl+O)"
      >
        <FolderOpen size={18} />
      </button>

      {hasRepo && (
        <>
          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="새로고침 (Ctrl+R)"
          >
            <RefreshCw size={18} />
          </button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Branch Manager */}
          <button
            onClick={() => onUpdateUIState(activeTabId, {
              showBranchManager: !uiState?.showBranchManager,
              showRemoteManager: false,
              showCommitGraph: false,
              showStashManager: false,
              showTagManager: false,
              showReflogViewer: false,
            })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              uiState?.showBranchManager
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="브랜치 관리 (Ctrl+B)"
          >
            <GitBranch size={18} />
          </button>

          {/* Merge */}
          <button
            onClick={() => onUpdateUIState(activeTabId, { showMergeDialog: true })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="병합"
          >
            <GitCommit size={18} />
          </button>

          {/* Stash Manager */}
          <button
            onClick={() => onUpdateUIState(activeTabId, {
              showStashManager: !uiState?.showStashManager,
              showBranchManager: false,
              showRemoteManager: false,
              showCommitGraph: false,
              showTagManager: false,
              showReflogViewer: false,
            })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              uiState?.showStashManager
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Stash"
          >
            <Package size={18} />
          </button>

          {/* Tag Manager */}
          <button
            onClick={() => onUpdateUIState(activeTabId, {
              showTagManager: !uiState?.showTagManager,
              showBranchManager: false,
              showRemoteManager: false,
              showCommitGraph: false,
              showStashManager: false,
              showReflogViewer: false,
            })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              uiState?.showTagManager
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="태그"
          >
            <Tag size={18} />
          </button>

          {/* Reflog */}
          <button
            onClick={() => onUpdateUIState(activeTabId, {
              showReflogViewer: !uiState?.showReflogViewer,
              showBranchManager: false,
              showRemoteManager: false,
              showCommitGraph: false,
              showStashManager: false,
              showTagManager: false,
            })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              uiState?.showReflogViewer
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Reflog"
          >
            <RotateCcw size={18} />
          </button>

          {/* Remote Manager */}
          <button
            onClick={() => onUpdateUIState(activeTabId, {
              showRemoteManager: !uiState?.showRemoteManager,
              showBranchManager: false,
              showCommitGraph: false,
              showStashManager: false,
              showTagManager: false,
              showReflogViewer: false,
            })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              uiState?.showRemoteManager
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="원격 저장소 (Ctrl+M)"
          >
            <Network size={18} />
          </button>

          {/* Commit Graph */}
          <button
            onClick={() => onUpdateUIState(activeTabId, {
              showCommitGraph: !uiState?.showCommitGraph,
              showBranchManager: false,
              showRemoteManager: false,
              showStashManager: false,
              showTagManager: false,
              showReflogViewer: false,
            })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              uiState?.showCommitGraph
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="커밋 그래프"
          >
            <Eye size={18} />
          </button>
        </>
      )}

      <div className="flex-1" />

      {/* Keyboard Shortcuts */}
      <button
        onClick={() => onUpdateUIState(activeTabId, { showShortcutHelp: true })}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="단축키 도움말"
      >
        <Keyboard size={18} />
      </button>

      {/* Accessibility Settings */}
      <button
        onClick={() => onUpdateUIState(activeTabId, { showAccessibilitySettings: true })}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="접근성 설정"
      >
        <Settings2 size={18} />
      </button>

      {/* Dark Mode Toggle */}
      <button
        onClick={onToggleDarkMode}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="테마 전환"
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}
