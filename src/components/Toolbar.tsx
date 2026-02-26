import { Download, Upload, RefreshCw, GitBranch, GitMerge, Archive, Tag, RotateCcw, Package, Terminal, ExternalLink, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import type { TabUIState } from '../types/tab';

interface ToolbarProps {
  activeTabId: string;
  uiState: TabUIState | undefined;
  hasRepo: boolean;
  repoName?: string;
  currentBranch?: string;
  onRefresh: () => void;
  onUpdateUIState: (tabId: string, state: Partial<TabUIState>) => void;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onOpenIn: () => void;
  onConsole: () => void;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  badge?: string;
}

function ToolbarButton({ icon, label, onClick, disabled, active, badge }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center px-3 py-1 min-w-[52px] rounded transition-colors relative ${
        active
          ? 'bg-[#094771] text-white'
          : disabled
          ? 'text-[#555] cursor-not-allowed'
          : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
      }`}
      title={label}
    >
      <div className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-2 text-[8px] bg-blue-500 text-white px-1 rounded-full leading-tight">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] mt-0.5 leading-tight whitespace-nowrap">{label}</span>
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-[36px] bg-[#3c3c3c] mx-1 self-center" />;
}

export default function Toolbar({
  activeTabId,
  uiState,
  hasRepo,
  repoName,
  currentBranch,
  onRefresh,
  onUpdateUIState,
  onFetch,
  onPull,
  onPush,
  onOpenIn,
  onConsole,
}: ToolbarProps) {
  const resetViews = () => ({
    showBranchManager: false,
    showRemoteManager: false,
    showCommitGraph: false,
    showStashManager: false,
    showTagManager: false,
    showReflogViewer: false,
    showConflictResolver: false,
    showBundleManager: false,
    showMergeDialog: false,
    selectedFile: null,
    fileHistoryPath: null,
  });

  const toggleView = (key: keyof TabUIState) => {
    const current = uiState?.[key];
    onUpdateUIState(activeTabId, {
      ...resetViews(),
      [key]: !current,
    });
  };

  return (
    <div
      className="flex items-center px-2 py-0.5 bg-[#252526] border-b border-[#3c3c3c] min-h-[48px]"
    >
      {/* Left group: Fetch, Pull, Push, Stash */}
      <ToolbarButton
        icon={<RefreshCw size={16} />}
        label="Fetch"
        onClick={onFetch}
        disabled={!hasRepo}
      />
      <ToolbarButton
        icon={<ArrowDownToLine size={16} />}
        label="Pull"
        onClick={onPull}
        disabled={!hasRepo}
      />
      <ToolbarButton
        icon={<ArrowUpFromLine size={16} />}
        label="Push"
        onClick={onPush}
        disabled={!hasRepo}
      />
      <ToolbarButton
        icon={<Archive size={16} />}
        label="Stash"
        onClick={() => toggleView('showStashManager')}
        disabled={!hasRepo}
        active={uiState?.showStashManager}
      />

      <ToolbarSeparator />

      {/* Center: Repository info */}
      {hasRepo && repoName && (
        <div className="flex flex-col items-center justify-center px-4 min-w-[120px]">
          <span className="text-[13px] font-semibold text-white leading-tight">{repoName}</span>
          {currentBranch && (
            <div className="flex items-center gap-1 mt-0.5">
              <GitBranch size={11} className="text-[#888]" />
              <span className="text-[11px] text-[#888]">{currentBranch}</span>
            </div>
          )}
        </div>
      )}

      <ToolbarSeparator />

      {/* Right group: Branch, Merge, Tag, Open in, Console */}
      <ToolbarButton
        icon={<GitBranch size={16} />}
        label="Branch"
        onClick={() => toggleView('showBranchManager')}
        disabled={!hasRepo}
        active={uiState?.showBranchManager}
      />
      <ToolbarButton
        icon={<GitMerge size={16} />}
        label="Merge"
        onClick={() => toggleView('showMergeDialog')}
        disabled={!hasRepo}
        active={uiState?.showMergeDialog}
      />
      <ToolbarButton
        icon={<Tag size={16} />}
        label="Tag"
        onClick={() => toggleView('showTagManager')}
        disabled={!hasRepo}
        active={uiState?.showTagManager}
      />

      <ToolbarSeparator />

      {/* Open in + Console (Fork-style) */}
      <ToolbarButton
        icon={<ExternalLink size={16} />}
        label="Open in"
        onClick={onOpenIn}
        disabled={!hasRepo}
      />
      <ToolbarButton
        icon={<Terminal size={16} />}
        label="Console"
        onClick={onConsole}
        disabled={!hasRepo}
      />

      <ToolbarSeparator />

      {/* Utility group */}
      <ToolbarButton
        icon={<RotateCcw size={16} />}
        label="Reflog"
        onClick={() => toggleView('showReflogViewer')}
        disabled={!hasRepo}
        active={uiState?.showReflogViewer}
      />
      <ToolbarButton
        icon={<Package size={16} />}
        label="Bundle"
        onClick={() => toggleView('showBundleManager')}
        disabled={!hasRepo}
        active={uiState?.showBundleManager}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Far right: Refresh */}
      <ToolbarButton
        icon={<RefreshCw size={16} />}
        label="Refresh"
        onClick={onRefresh}
        disabled={!hasRepo}
      />
    </div>
  );
}
