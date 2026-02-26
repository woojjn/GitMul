import { useState, useRef, useEffect } from 'react';
import { GitBranch, Undo2, Copy, CherryIcon } from 'lucide-react';
import type { CommitInfo } from '../types/git';

interface CommitHistoryProps {
  commits: CommitInfo[];
  repoPath: string;
  onRefresh: () => void;
  onCherryPick?: (commitSha: string, commitMessage: string) => void;
  onRevert?: (commitSha: string, commitMessage: string) => void;
  onSelectCommit?: (sha: string) => void;
  selectedCommitSha?: string | null;
  branches?: { name: string; is_current: boolean; sha?: string }[];
  tags?: { name: string; sha?: string }[];
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  commit: CommitInfo | null;
}

// Graph colors matching Fork's palette
const GRAPH_COLORS = [
  '#ffb74d', '#4fc3f7', '#81c784', '#e57373', '#ba68c8',
  '#4dd0e1', '#aed581', '#ff8a65', '#f06292', '#7986cb',
];

export default function CommitHistory({
  commits,
  repoPath,
  onRefresh,
  onCherryPick,
  onRevert,
  onSelectCommit,
  selectedCommitSha,
  branches,
  tags,
}: CommitHistoryProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false, x: 0, y: 0, commit: null,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, show: false }));
      }
    };
    if (contextMenu.show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.show]);

  const handleContextMenu = (e: React.MouseEvent, commit: CommitInfo) => {
    e.preventDefault();
    setContextMenu({ show: true, x: e.clientX, y: e.clientY, commit });
  };

  const getGraphColor = (idx: number) => GRAPH_COLORS[idx % GRAPH_COLORS.length];

  // Find branch labels for a commit
  const getBranchLabels = (sha: string) => {
    const labels: { name: string; type: 'branch' | 'tag'; isCurrent: boolean }[] = [];
    branches?.forEach(b => {
      if (b.sha === sha || (commits[0]?.sha === sha && b.is_current)) {
        labels.push({ name: b.name, type: 'branch', isCurrent: b.is_current });
      }
    });
    tags?.forEach(t => {
      if (t.sha === sha) {
        labels.push({ name: t.name, type: 'tag', isCurrent: false });
      }
    });
    return labels;
  };

  // Format date to shorter form
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const h = d.getHours().toString().padStart(2,'0');
      const m = d.getMinutes().toString().padStart(2,'0');
      return `${day} ${month} ${year} ${h}:${m}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Column headers */}
      <div className="flex items-center h-[24px] bg-[#252526] border-b border-[#3c3c3c] text-[10px] font-semibold text-[#888] uppercase tracking-wider select-none flex-shrink-0">
        <div className="w-[50px] text-center">Graph</div>
        <div className="flex-1 px-2">Description</div>
        <div className="w-[120px] px-2">Author</div>
        <div className="w-[140px] px-2">Date</div>
        <div className="w-[70px] px-2 text-right">SHA</div>
      </div>

      {/* Commit rows */}
      <div className="flex-1 overflow-y-auto">
        {commits.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#555] text-[12px]">
            No commits
          </div>
        ) : (
          commits.map((commit, idx) => {
            const isSelected = selectedCommitSha === commit.sha;
            const isMerge = commit.parent_ids.length > 1;
            const color = getGraphColor(idx % 3 === 0 ? 0 : idx % 3 === 1 ? 2 : 1);
            const branchLabels = getBranchLabels(commit.sha);

            return (
              <div
                key={commit.sha}
                onClick={() => onSelectCommit?.(commit.sha)}
                onContextMenu={(e) => handleContextMenu(e, commit)}
                className={`flex items-center h-[26px] text-[12px] cursor-pointer border-b border-[#2a2a2a] ${
                  isSelected
                    ? 'bg-[#094771] text-white'
                    : 'text-[#ccc] hover:bg-[#2a2d2e]'
                }`}
              >
                {/* Graph column */}
                <div className="w-[50px] flex items-center justify-center flex-shrink-0">
                  <div className="relative flex items-center justify-center w-[50px] h-[26px]">
                    {/* Vertical line */}
                    {idx > 0 && (
                      <div className="absolute top-0 w-px h-[13px]" style={{ left: '50%', backgroundColor: color + '60' }} />
                    )}
                    {idx < commits.length - 1 && (
                      <div className="absolute bottom-0 w-px h-[13px]" style={{ left: '50%', backgroundColor: color + '60' }} />
                    )}
                    {/* Merge line (right side) */}
                    {isMerge && idx > 0 && (
                      <div className="absolute top-[13px] h-px w-[10px]" style={{ left: '50%', backgroundColor: GRAPH_COLORS[2] + '80' }} />
                    )}
                    {/* Commit dot */}
                    <div
                      className={`relative z-10 rounded-full ${isMerge ? 'w-[8px] h-[8px]' : 'w-[7px] h-[7px]'}`}
                      style={{
                        backgroundColor: isMerge ? color : 'transparent',
                        border: `2px solid ${isSelected ? '#fff' : color}`,
                      }}
                    />
                  </div>
                </div>

                {/* Description + branch labels */}
                <div className="flex-1 px-2 truncate min-w-0 flex items-center gap-1.5">
                  {/* Branch / tag labels */}
                  {branchLabels.map((lbl, li) => (
                    <span
                      key={li}
                      className={`text-[10px] px-1.5 py-0 rounded-sm font-medium flex-shrink-0 leading-[16px] ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : lbl.isCurrent
                          ? 'bg-green-700/80 text-green-100'
                          : lbl.type === 'tag'
                          ? 'bg-yellow-700/60 text-yellow-200'
                          : 'bg-blue-700/60 text-blue-200'
                      }`}
                    >
                      {lbl.type === 'branch' ? (
                        <span className="flex items-center gap-0.5">
                          <GitBranch size={9} />
                          {lbl.name}
                        </span>
                      ) : (
                        lbl.name
                      )}
                    </span>
                  ))}
                  {/* First commit gets HEAD label */}
                  {idx === 0 && branchLabels.length === 0 && (
                    <span className={`text-[10px] px-1.5 py-0 rounded-sm font-medium flex-shrink-0 leading-[16px] ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-green-700/80 text-green-100'
                    }`}>
                      <span className="flex items-center gap-0.5">
                        <GitBranch size={9} />
                        HEAD
                      </span>
                    </span>
                  )}
                  {isMerge && (
                    <span className={`text-[9px] px-1 rounded-sm font-bold flex-shrink-0 ${
                      isSelected ? 'bg-white/15 text-white/80' : 'bg-purple-800/50 text-purple-300'
                    }`}>
                      M
                    </span>
                  )}
                  <span className="truncate">{commit.message}</span>
                </div>

                {/* Author */}
                <div className={`w-[120px] px-2 truncate flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-[#888]'}`}>
                  {commit.author}
                </div>

                {/* Date */}
                <div className={`w-[140px] px-2 truncate flex-shrink-0 font-mono text-[11px] ${isSelected ? 'text-white/70' : 'text-[#666]'}`}>
                  {formatDate(commit.date)}
                </div>

                {/* SHA */}
                <div className={`w-[70px] px-2 font-mono text-[11px] flex-shrink-0 text-right ${isSelected ? 'text-white/60' : 'text-[#555]'}`}>
                  {commit.sha.slice(0, 7)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          ref={menuRef}
          className="fixed bg-[#252526] border border-[#3c3c3c] rounded shadow-xl py-1 z-50 min-w-[200px]"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <button
            onClick={() => {
              if (contextMenu.commit) {
                navigator.clipboard.writeText(contextMenu.commit.sha);
                setContextMenu(prev => ({ ...prev, show: false }));
              }
            }}
            className="w-full px-4 py-1.5 text-left text-[13px] hover:bg-[#094771] flex items-center gap-2 text-[#ccc]"
          >
            <Copy size={13} />
            Copy SHA
          </button>

          {onCherryPick && (
            <>
              <div className="h-px bg-[#3c3c3c] my-0.5 mx-2" />
              <button
                onClick={() => {
                  if (contextMenu.commit) {
                    onCherryPick(contextMenu.commit.sha, contextMenu.commit.message);
                    setContextMenu(prev => ({ ...prev, show: false }));
                  }
                }}
                className="w-full px-4 py-1.5 text-left text-[13px] hover:bg-[#094771] flex items-center gap-2 text-[#81c784]"
              >
                <GitBranch size={13} />
                Cherry-pick
              </button>
            </>
          )}

          {onRevert && (
            <button
              onClick={() => {
                if (contextMenu.commit) {
                  onRevert(contextMenu.commit.sha, contextMenu.commit.message);
                  setContextMenu(prev => ({ ...prev, show: false }));
                }
              }}
              className="w-full px-4 py-1.5 text-left text-[13px] hover:bg-[#094771] flex items-center gap-2 text-[#ffb74d]"
            >
              <Undo2 size={13} />
              Revert
            </button>
          )}
        </div>
      )}
    </div>
  );
}
