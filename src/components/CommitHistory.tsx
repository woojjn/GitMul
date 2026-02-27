import { useState, useRef, useEffect, useMemo } from 'react';
import { GitBranch, Undo2, Copy } from 'lucide-react';
import type { CommitInfo } from '../types/git';

interface CommitHistoryProps {
  commits: CommitInfo[];
  repoPath: string;
  onRefresh: () => void;
  onCherryPick?: (commitSha: string, commitMessage: string) => void;
  onRevert?: (commitSha: string, commitMessage: string) => void;
  onSelectCommit?: (sha: string) => void;
  selectedCommitSha?: string | null;
  branches?: { name: string; is_current: boolean; sha?: string; commit_sha?: string }[];
  tags?: { name: string; sha?: string; target?: string }[];
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  commit: CommitInfo | null;
}

// ── Graph layout types ──────────────────────────────────────────────────

/** A line segment connecting two points in the graph. */
interface GraphLine {
  fromCol: number;
  toCol: number;
  colorIdx: number;
}

/** Per-row layout info produced by the lane algorithm. */
interface GraphRow {
  /** Column (0-based) this commit sits in. */
  column: number;
  /** Color index for this commit dot. */
  colorIdx: number;
  /** Lines going DOWN from this row (bottom half: midY → ROW_H).
   *  toCol is where the line arrives at the top of the NEXT row. */
  linesDown: GraphLine[];
  /** Lines coming INTO this row (top half: 0 → midY).
   *  These are copied from the previous row's linesDown. */
  linesIn: GraphLine[];
  /** Total lane count at this row. */
  laneCount: number;
}

// Graph colors matching Fork / GitKraken palette
const GRAPH_COLORS = [
  '#ffb74d', '#4fc3f7', '#81c784', '#e57373', '#ba68c8',
  '#4dd0e1', '#aed581', '#ff8a65', '#f06292', '#7986cb',
];

// ── Lane assignment algorithm ───────────────────────────────────────────

function buildGraphLayout(commits: CommitInfo[]): GraphRow[] {
  if (commits.length === 0) return [];

  const rows: GraphRow[] = [];

  // activeLanes[col] = SHA that lane is waiting for, or null if free.
  let activeLanes: (string | null)[] = [];
  // Track which color each lane uses so colors stay stable while lane lives.
  let laneColors: number[] = [];
  let nextColor = 0;

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const commitSha = commit.sha;

    // ── Snapshot the incoming lanes (before processing this commit) ──
    const incomingLanes = activeLanes.slice();
    const incomingColors = laneColors.slice();

    // 1. Find which column this commit lands in.
    let col = activeLanes.indexOf(commitSha);
    let colorIdx: number;

    if (col === -1) {
      // Not expected in any lane — allocate a new one.
      const free = activeLanes.indexOf(null);
      if (free !== -1) {
        col = free;
      } else {
        col = activeLanes.length;
        activeLanes.push(null);
        laneColors.push(0);
      }
      colorIdx = nextColor++;
      laneColors[col] = colorIdx;
    } else {
      colorIdx = laneColors[col];
    }

    // 2. Mark this lane as "arrived" (clear it).
    activeLanes[col] = null;

    // 3. Collapse any duplicate lanes waiting for the same SHA.
    for (let l = 0; l < activeLanes.length; l++) {
      if (l !== col && activeLanes[l] === commitSha) {
        activeLanes[l] = null;
      }
    }

    // 4. Assign parents to lanes.
    commit.parent_ids.forEach((parentSha, pIdx) => {
      const existing = activeLanes.indexOf(parentSha);
      if (existing !== -1) {
        // Parent already has a lane reserved — keep it.
        return;
      }
      if (pIdx === 0) {
        // First parent: continue in same column.
        activeLanes[col] = parentSha;
        laneColors[col] = colorIdx;
      } else {
        // Additional parents (merge source): allocate a lane.
        const free = activeLanes.indexOf(null);
        const pColor = nextColor++;
        if (free !== -1) {
          activeLanes[free] = parentSha;
          laneColors[free] = pColor;
        } else {
          activeLanes.push(parentSha);
          laneColors.push(pColor);
        }
      }
    });

    // 5. Build lines going DOWN from this row.
    //    For every active lane after processing, draw a line from
    //    where that lane's SHA was BEFORE (fromCol) to where it is NOW (toCol).
    const linesDown: GraphLine[] = [];
    const usedFrom = new Set<number>();

    for (let l = 0; l < activeLanes.length; l++) {
      if (activeLanes[l] === null) continue;
      const laneSha = activeLanes[l]!;
      const lColor = laneColors[l];

      // Where was this SHA before? Check incoming lanes.
      let fromCol = -1;
      for (let k = 0; k < incomingLanes.length; k++) {
        if (incomingLanes[k] === laneSha && !usedFrom.has(k)) {
          fromCol = k;
          usedFrom.add(k);
          break;
        }
      }

      if (fromCol === -1) {
        // New lane originated from this commit's column.
        fromCol = col;
      }

      linesDown.push({ fromCol, toCol: l, colorIdx: lColor });
    }

    // 6. Build lines coming IN (top half).
    //    These connect from the previous row's toCol to this row's fromCol.
    //    For the first row, no incoming lines.
    const linesIn: GraphLine[] = [];
    if (i > 0) {
      const prevRow = rows[i - 1];
      // Each line from the previous row arrives at toCol.
      // Draw a line from toCol at y=0 to toCol at y=midY.
      // But we also need to handle merging lanes:
      // If a lane in prevRow.linesDown goes to toCol, and that toCol
      // is now the column of a different lane (or this commit), we need
      // to draw the arriving line.
      for (const prevLine of prevRow.linesDown) {
        linesIn.push({
          fromCol: prevLine.toCol,
          toCol: prevLine.toCol,
          colorIdx: prevLine.colorIdx,
        });
      }
    }

    // 7. Trim trailing null lanes.
    while (activeLanes.length > 0 && activeLanes[activeLanes.length - 1] === null) {
      activeLanes.pop();
      laneColors.pop();
    }

    rows.push({
      column: col,
      colorIdx,
      linesDown,
      linesIn,
      laneCount: Math.max(activeLanes.length, col + 1),
    });
  }

  return rows;
}

// ── Constants ───────────────────────────────────────────────────────────

const ROW_H = 26;
const LANE_W = 14;
const PAD_LEFT = 10;
const DOT_R = 3.5;
const DOT_R_MERGE = 4;

// ── Component ───────────────────────────────────────────────────────────

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

  const graphRows = useMemo(() => buildGraphLayout(commits), [commits]);

  const maxLanes = useMemo(
    () => graphRows.reduce((m, r) => Math.max(m, r.laneCount), 1),
    [graphRows],
  );
  const graphColWidth = Math.max(50, PAD_LEFT + maxLanes * LANE_W + 8);

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

  const getColor = (idx: number) => GRAPH_COLORS[idx % GRAPH_COLORS.length];

  // ── Branch / tag labels ───────────────────────────────────────────────

  const getBranchLabels = (sha: string) => {
    const labels: { name: string; type: 'branch' | 'tag'; isCurrent: boolean }[] = [];

    const shaMatch = (a: string, b: string) => {
      if (!a || !b) return false;
      if (a === b) return true;
      const min = Math.min(a.length, b.length);
      if (min >= 7) return a.slice(0, min) === b.slice(0, min);
      return false;
    };

    branches?.forEach(b => {
      const bSha = b.sha || b.commit_sha || '';
      if (shaMatch(bSha, sha) || (commits[0]?.sha === sha && b.is_current)) {
        labels.push({ name: b.name, type: 'branch', isCurrent: b.is_current });
      }
    });
    tags?.forEach(t => {
      const tSha = t.sha || t.target || '';
      if (shaMatch(tSha, sha)) {
        labels.push({ name: t.name, type: 'tag', isCurrent: false });
      }
    });
    return labels;
  };

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

  // ── SVG graph cell for one row ────────────────────────────────────────

  const laneX = (lane: number) => PAD_LEFT + lane * LANE_W + LANE_W / 2;
  const midY = ROW_H / 2;

  const renderGraphCell = (row: GraphRow, idx: number) => {
    const isMerge = commits[idx].parent_ids.length > 1;
    const isSelected = selectedCommitSha === commits[idx].sha;
    const cx = laneX(row.column);
    const dotColor = getColor(row.colorIdx);

    return (
      <svg
        width={graphColWidth}
        height={ROW_H}
        className="flex-shrink-0"
        style={{ display: 'block' }}
      >
        {/* ── Top half: incoming lines (0 → midY) ── */}
        {row.linesIn.map((line, li) => {
          const x = laneX(line.fromCol);
          const color = getColor(line.colorIdx);
          return (
            <line
              key={`in-${li}`}
              x1={x} y1={0}
              x2={x} y2={midY}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.75}
            />
          );
        })}

        {/* ── Bottom half: outgoing lines (midY → ROW_H) ── */}
        {row.linesDown.map((line, li) => {
          const x1 = laneX(line.fromCol);
          const x2 = laneX(line.toCol);
          const color = getColor(line.colorIdx);

          if (x1 === x2) {
            return (
              <line
                key={`out-${li}`}
                x1={x1} y1={midY}
                x2={x2} y2={ROW_H}
                stroke={color}
                strokeWidth={2}
                strokeOpacity={0.75}
              />
            );
          } else {
            // Curved line for branch/merge
            const cpY1 = midY + (ROW_H - midY) * 0.6;
            const cpY2 = ROW_H - (ROW_H - midY) * 0.2;
            return (
              <path
                key={`out-${li}`}
                d={`M ${x1} ${midY} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${ROW_H}`}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeOpacity={0.75}
              />
            );
          }
        })}

        {/* ── Commit dot ── */}
        <circle
          cx={cx}
          cy={midY}
          r={isMerge ? DOT_R_MERGE : DOT_R}
          fill={isMerge ? dotColor : '#1e1e1e'}
          stroke={isSelected ? '#fff' : dotColor}
          strokeWidth={2}
        />
      </svg>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Column headers */}
      <div className="flex items-center h-[24px] bg-[#252526] border-b border-[#3c3c3c] text-[10px] font-semibold text-[#888] uppercase tracking-wider select-none flex-shrink-0">
        <div style={{ width: graphColWidth }} className="text-center flex-shrink-0">Graph</div>
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
            const branchLabels = getBranchLabels(commit.sha);
            const row = graphRows[idx];

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
                {/* Graph column (SVG) */}
                {row && renderGraphCell(row, idx)}

                {/* Description + branch labels */}
                <div className="flex-1 px-2 truncate min-w-0 flex items-center gap-1.5">
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
