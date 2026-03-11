import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, GitBranch, Tag, Cloud, Archive, FolderOpen, FileText, History, Search, Settings } from 'lucide-react';
import type { BranchInfo, TagInfo, RemoteInfo, StashInfo } from '../types/git';

interface ForkSidebarProps {
  branches: BranchInfo[];
  tags?: TagInfo[];
  remotes?: RemoteInfo[];
  stashes?: StashInfo[];
  fileChangeCount: number;
  recentRepos: { path: string; name: string }[];
  currentRepoName: string | null;
  currentBranch?: string;
  onSelectRepo: (path: string) => void;
  onSwitchBranch?: (branchName: string) => void;
  onDeleteBranch?: (branchName: string) => void;
  onShowChanges: () => void;
  onShowAllCommits: () => void;
  onShowBranches: () => void;
  onShowTags: () => void;
  onShowRemotes: () => void;
  onShowStashes: () => void;
  onSettings?: () => void;
  activeView?: string;
}

interface TreeSectionProps {
  label: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onHeaderDoubleClick?: () => void;
}

function TreeSection({ label, icon, count, defaultOpen = true, children, onHeaderDoubleClick }: TreeSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-px">
      <button
        onClick={() => setOpen(!open)}
        onDoubleClick={onHeaderDoubleClick}
        className="w-full flex items-center gap-1.5 px-2 py-[3px] text-[11px] font-semibold uppercase tracking-wider text-[#888] hover:text-[#ccc] hover:bg-[#2a2d2e] transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] text-[#666] font-normal tabular-nums">{count}</span>
        )}
      </button>
      {open && <div className="ml-1">{children}</div>}
    </div>
  );
}

interface ContextMenuState {
  x: number;
  y: number;
  branchName: string;
  isCurrent: boolean;
}

interface BranchTreeItemProps {
  branch: BranchInfo;
  active?: boolean;
  onClick?: () => void;
  onSwitchBranch?: (name: string) => void;
  onDeleteBranch?: (name: string) => void;
  onShowBranchManager?: () => void;
}

function BranchTreeItem({ branch, active, onClick, onSwitchBranch, onDeleteBranch, onShowBranchManager }: BranchTreeItemProps) {
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctx) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCtx(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ctx]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`w-full flex items-center gap-1.5 px-2 py-[2px] text-[12px] transition-colors truncate ${
          active
            ? 'bg-[#094771] text-white'
            : 'text-[#ccc] hover:bg-[#2a2d2e]'
        }`}
        style={{ paddingLeft: '8px' }}
        title={branch.name}
      >
        <GitBranch size={11} className={branch.is_current ? 'text-green-400' : 'text-[#666]'} />
        <span className="truncate flex-1 text-left">{branch.name}</span>
        {branch.is_current && (
          <span className="text-[9px] text-green-400 flex-shrink-0">&#10003;</span>
        )}
      </button>

      {ctx && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-[#252526] border border-[#454545] rounded shadow-lg py-0.5 min-w-[160px]"
          style={{ left: ctx.x, top: ctx.y }}
        >
          <CtxMenuItem
            label={branch.is_current ? '현재 브랜치' : '체크아웃'}
            disabled={branch.is_current}
            onClick={() => { setCtx(null); if (!branch.is_current) onSwitchBranch?.(branch.name); }}
          />
          <div className="h-px bg-[#454545] my-0.5" />
          <CtxMenuItem
            label="브랜치 관리..."
            onClick={() => { setCtx(null); onShowBranchManager?.(); }}
          />
          <div className="h-px bg-[#454545] my-0.5" />
          <CtxMenuItem
            label="삭제"
            disabled={branch.is_current}
            danger
            onClick={() => {
              setCtx(null);
              if (!branch.is_current && confirm(`브랜치 '${branch.name}'을 삭제하시겠습니까?`)) {
                onDeleteBranch?.(branch.name);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

interface CtxMenuItemProps {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}

function CtxMenuItem({ label, disabled, danger, onClick }: CtxMenuItemProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-full text-left px-3 py-1 text-[12px] transition-colors ${
        disabled
          ? 'text-[#555] cursor-default'
          : danger
          ? 'text-[#e57373] hover:bg-[#3a1e1e]'
          : 'text-[#ccc] hover:bg-[#094771] hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

interface TreeItemProps {
  label: string;
  active?: boolean;
  isCurrent?: boolean;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
  indent?: number;
  trailingInfo?: string;
}

function TreeItem({ label, active, isCurrent, icon, badge, badgeColor = 'bg-green-600', onClick, indent = 0, trailingInfo }: TreeItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-1.5 px-2 py-[2px] text-[12px] transition-colors truncate ${
        active
          ? 'bg-[#094771] text-white'
          : 'text-[#ccc] hover:bg-[#2a2d2e]'
      }`}
      style={{ paddingLeft: `${8 + indent * 14}px` }}
      title={label}
    >
      {icon}
      <span className="truncate flex-1 text-left">{label}</span>
      {isCurrent && (
        <span className="text-[9px] text-green-400 flex-shrink-0">&#10003;</span>
      )}
      {badge && (
        <span className={`text-[9px] px-1 rounded text-white ${badgeColor} flex-shrink-0`}>{badge}</span>
      )}
      {trailingInfo && (
        <span className="text-[10px] text-[#666] flex-shrink-0">{trailingInfo}</span>
      )}
    </button>
  );
}

export default function ForkSidebar({
  branches,
  tags,
  remotes,
  stashes,
  fileChangeCount,
  recentRepos,
  currentRepoName,
  currentBranch,
  onSelectRepo,
  onSwitchBranch,
  onDeleteBranch,
  onShowChanges,
  onShowAllCommits,
  onShowBranches,
  onShowTags,
  onShowRemotes,
  onShowStashes,
  onSettings,
  activeView,
}: ForkSidebarProps) {
  const [filterText, setFilterText] = useState('');

  const localBranches = branches.filter(b => !b.is_remote);
  const remoteBranches = branches.filter(b => b.is_remote);

  // Group remote branches by remote name
  const remoteGroups: Record<string, BranchInfo[]> = {};
  remoteBranches.forEach(b => {
    const parts = b.name.split('/');
    const remoteName = parts[0];
    if (!remoteGroups[remoteName]) remoteGroups[remoteName] = [];
    remoteGroups[remoteName].push(b);
  });

  // Filter branches
  const filteredLocal = filterText
    ? localBranches.filter(b => b.name.toLowerCase().includes(filterText.toLowerCase()))
    : localBranches;

  return (
    <div className="w-full h-full flex flex-col bg-[#252526] border-r border-[#3c3c3c] overflow-hidden select-none">
      {/* Repository name header */}
      {currentRepoName && (
        <div className="px-3 py-2 border-b border-[#3c3c3c] flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <FolderOpen size={13} className="text-[#888] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-white truncate">{currentRepoName}</span>
          </div>
          <Settings size={12} className="text-[#666] hover:text-[#ccc] cursor-pointer flex-shrink-0" onClick={onSettings} />
        </div>
      )}

      {/* Quick nav items */}
      <div className="border-b border-[#3c3c3c] py-1">
        <TreeItem
          label={`Changes${fileChangeCount > 0 ? ` (${fileChangeCount})` : ''}`}
          icon={<FileText size={12} className="text-[#888]" />}
          onClick={onShowChanges}
          active={activeView === 'changes'}
        />
        <TreeItem
          label="All Commits"
          icon={<History size={12} className="text-[#888]" />}
          onClick={onShowAllCommits}
          active={activeView === 'commits'}
        />
      </div>

      {/* Filter */}
      <div className="px-2 py-1.5 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1">
          <Search size={11} className="text-[#666]" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter"
            className="bg-transparent text-[11px] text-[#ccc] placeholder-[#555] outline-none flex-1 min-w-0"
          />
        </div>
      </div>

      {/* Scrollable tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Branches */}
        <TreeSection
          label="Branches"
          icon={<GitBranch size={10} />}
          count={localBranches.length}
          onHeaderDoubleClick={onShowBranches}
        >
          {filteredLocal.map(b => (
            <BranchTreeItem
              key={b.name}
              branch={b}
              onClick={() => onSwitchBranch?.(b.name)}
              onSwitchBranch={onSwitchBranch}
              onDeleteBranch={onDeleteBranch}
              onShowBranchManager={onShowBranches}
            />
          ))}
        </TreeSection>

        {/* Remotes */}
        <TreeSection
          label="Remotes"
          icon={<Cloud size={10} />}
          count={Object.keys(remoteGroups).length}
          defaultOpen={false}
          onHeaderDoubleClick={onShowRemotes}
        >
          {Object.entries(remoteGroups).map(([remoteName, rBranches]) => (
            <TreeSection
              key={remoteName}
              label={remoteName}
              icon={<Cloud size={10} className="text-[#666]" />}
              count={rBranches.length}
              defaultOpen={false}
            >
              {rBranches.map(b => (
                <TreeItem
                  key={b.name}
                  label={b.name.replace(`${remoteName}/`, '')}
                  icon={<GitBranch size={10} className="text-[#666]" />}
                  indent={1}
                />
              ))}
            </TreeSection>
          ))}
          {remotes?.map(r => (
            !remoteGroups[r.name] && (
              <TreeItem
                key={r.name}
                label={r.name}
                icon={<Cloud size={10} className="text-[#666]" />}
                onClick={onShowRemotes}
              />
            )
          ))}
        </TreeSection>

        {/* Tags */}
        <TreeSection
          label="Tags"
          icon={<Tag size={10} />}
          count={tags?.length ?? 0}
          defaultOpen={false}
          onHeaderDoubleClick={onShowTags}
        >
          {tags?.map(t => (
            <TreeItem
              key={t.name}
              label={t.name}
              icon={<Tag size={10} className="text-yellow-500" />}
              onClick={onShowTags}
            />
          )) ?? <TreeItem label="(loading...)" />}
        </TreeSection>

        {/* Stashes */}
        <TreeSection
          label="Stashes"
          icon={<Archive size={10} />}
          count={stashes?.length ?? 0}
          defaultOpen={false}
          onHeaderDoubleClick={onShowStashes}
        >
          {stashes && stashes.length > 0
            ? stashes.map(s => (
                <TreeItem
                  key={s.index}
                  label={`stash@{${s.index}}: ${s.message}`}
                  icon={<Archive size={10} className="text-[#666]" />}
                  onClick={onShowStashes}
                />
              ))
            : <TreeItem label="(no stashes)" />}
        </TreeSection>
      </div>
    </div>
  );
}
