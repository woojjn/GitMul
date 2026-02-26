import { useState, useCallback, useRef, useMemo } from 'react';
import {
  FileText, FilePlus, FileX, ChevronDown, ChevronRight,
  ArrowDown, ArrowUp, List, FolderTree, Folder, FolderOpen,
  CheckSquare, Square,
} from 'lucide-react';
import type { FileStatus } from '../types/git';

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

interface FileChangesProps {
  files: FileStatus[];
  onRefresh: () => void;
  onStage: (path: string) => Promise<void>;
  onUnstage: (path: string) => Promise<void>;
  onStageAll: () => Promise<void>;
  onFileClick: (path: string, staged: boolean) => void;
  onCommit?: (message: string) => void;
}

type ViewMode = 'tree' | 'list';

interface TreeNode {
  name: string;
  path: string;          // full path
  isFolder: boolean;
  status?: string;
  file?: FileStatus;
  children: TreeNode[];
}

/* ================================================================== */
/* Unified status colors                                               */
/* ================================================================== */

const STATUS_COLORS: Record<string, string> = {
  modified: '#e2b93d',
  untracked: '#73c991',
  'new file': '#73c991',
  deleted: '#e57373',
  renamed: '#64b5f6',
  copied: '#64b5f6',
};
const DEFAULT_COLOR = '#888';
const statusColor = (s: string) => STATUS_COLORS[s] ?? DEFAULT_COLOR;
const statusLabel = (s: string) => {
  switch (s) {
    case 'modified': return 'M';
    case 'untracked': return 'U';
    case 'new file': return 'A';
    case 'deleted': return 'D';
    case 'renamed': return 'R';
    case 'copied': return 'C';
    default: return '?';
  }
};

/* ================================================================== */
/* Small presentational helpers                                        */
/* ================================================================== */

function StatusIcon({ status }: { status: string }) {
  const c = statusColor(status);
  switch (status) {
    case 'modified': return <FileText size={13} style={{ color: c }} />;
    case 'untracked':
    case 'new file':  return <FilePlus size={13} style={{ color: c }} />;
    case 'deleted':   return <FileX size={13} style={{ color: c }} />;
    default:          return <FileText size={13} style={{ color: c }} />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <span
      className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-[3px] text-[9px] font-bold flex-shrink-0 leading-none"
      style={{ backgroundColor: c + '33', color: c }}
    >
      {statusLabel(status)}
    </span>
  );
}

/* ================================================================== */
/* Tree builder                                                        */
/* ================================================================== */

function buildTree(fileList: FileStatus[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of fileList) {
    const parts = file.path.split('/');
    let level = root;
    let cur = '';
    for (let i = 0; i < parts.length; i++) {
      cur = cur ? `${cur}/${parts[i]}` : parts[i];
      const isLast = i === parts.length - 1;
      let node = level.find(n => n.name === parts[i] && n.isFolder === !isLast);
      if (!node) {
        node = {
          name: parts[i], path: cur, isFolder: !isLast, children: [],
          ...(isLast ? { status: file.status, file } : {}),
        };
        level.push(node);
      }
      level = node.children;
    }
  }
  const sort = (ns: TreeNode[]) => {
    ns.sort((a, b) => (a.isFolder !== b.isFolder ? (a.isFolder ? -1 : 1) : a.name.localeCompare(b.name)));
    ns.forEach(n => { if (n.isFolder) sort(n.children); });
  };
  sort(root);
  return root;
}

/** Collect all file paths under a node */
function collectFilePaths(node: TreeNode): string[] {
  if (!node.isFolder && node.file) return [node.file.path];
  return node.children.flatMap(collectFilePaths);
}

/** Flatten tree into visual order of file paths (for shift-range) */
function flattenTreePaths(nodes: TreeNode[], expanded: Set<string>, prefix: string): string[] {
  const result: string[] = [];
  for (const n of nodes) {
    if (n.isFolder) {
      const key = `${prefix}/${n.path}`;
      if (expanded.has(key)) {
        result.push(...flattenTreePaths(n.children, expanded, prefix));
      }
    } else if (n.file) {
      result.push(n.file.path);
    }
  }
  return result;
}

/* ================================================================== */
/* Main component                                                      */
/* ================================================================== */

export default function FileChanges({
  files, onRefresh, onStage, onUnstage, onStageAll, onFileClick, onCommit,
}: FileChangesProps) {
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [commitMsg, setCommitMsg] = useState('');
  const [isAmend, setIsAmend] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  /* --- Selection state (separate per section) --- */
  const [selUnstaged, setSelUnstaged] = useState<Set<string>>(new Set());
  const [selStaged, setSelStaged] = useState<Set<string>>(new Set());
  // "anchor" = the last file that was Ctrl-clicked (used as Shift range origin)
  const anchorUnstaged = useRef<string | null>(null);
  const anchorStaged = useRef<string | null>(null);

  /* --- Which file is currently being *viewed* (diff preview) --- */
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  /* --- Tree expand state --- */
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const stagedFiles = useMemo(() => files.filter(f => f.staged), [files]);
  const unstagedFiles = useMemo(() => files.filter(f => !f.staged), [files]);
  const stagedTree = useMemo(() => buildTree(stagedFiles), [stagedFiles]);
  const unstagedTree = useMemo(() => buildTree(unstagedFiles), [unstagedFiles]);

  /* --- Auto-expand new folders --- */
  const prevKeysRef = useRef('');
  const curKeys = [...unstagedFiles, ...stagedFiles].map(f => f.path).join('|');
  if (prevKeysRef.current !== curKeys) {
    prevKeysRef.current = curKeys;
    const all = new Set<string>();
    const gather = (ns: TreeNode[], pfx: string) => {
      for (const n of ns) {
        if (n.isFolder) { all.add(`${pfx}/${n.path}`); gather(n.children, pfx); }
      }
    };
    gather(unstagedTree, 'unstaged');
    gather(stagedTree, 'staged');
    setExpandedFolders(prev => { const next = new Set(prev); all.forEach(p => next.add(p)); return next; });
  }

  /* --- Visible-order file paths (respects tree collapse) --- */
  const visibleUnstaged = useMemo(
    () => viewMode === 'tree'
      ? flattenTreePaths(unstagedTree, expandedFolders, 'unstaged')
      : unstagedFiles.map(f => f.path),
    [viewMode, unstagedTree, expandedFolders, unstagedFiles],
  );
  const visibleStaged = useMemo(
    () => viewMode === 'tree'
      ? flattenTreePaths(stagedTree, expandedFolders, 'staged')
      : stagedFiles.map(f => f.path),
    [viewMode, stagedTree, expandedFolders, stagedFiles],
  );

  /* --- Toggle folder expand/collapse --- */
  const toggleFolder = useCallback((key: string) => {
    setExpandedFolders(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);

  /* ================================================================ */
  /* Selection logic (Windows Explorer / Fork style)                   */
  /*                                                                   */
  /* Plain click       → view file diff (no selection change)          */
  /* Ctrl+click file   → toggle that file's selection                  */
  /* Ctrl+click folder → toggle all children's selection               */
  /* Shift+click       → range select/deselect from anchor            */
  /* ================================================================ */

  const handleItemClick = useCallback((
    paths: string[],           // the file paths this click represents (1 for file, N for folder)
    e: React.MouseEvent,
    visibleOrder: string[],
    selected: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    anchor: React.MutableRefObject<string | null>,
    staged: boolean,
  ) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const clickedPath = paths[0]; // representative path (first in array)

    if (isCtrl) {
      /* ---- Ctrl+click: toggle individual / folder ---- */
      setSelected(prev => {
        const next = new Set(prev);
        // If ALL paths are already selected → deselect all; else select all
        const allSelected = paths.every(p => prev.has(p));
        if (allSelected) {
          paths.forEach(p => next.delete(p));
        } else {
          paths.forEach(p => next.add(p));
        }
        return next;
      });
      // The clicked path becomes the new anchor for shift
      anchor.current = clickedPath;
      return; // Ctrl-click does NOT change the viewed file
    }

    if (isShift && anchor.current) {
      /* ---- Shift+click: range select from anchor ---- */
      const anchorIdx = visibleOrder.indexOf(anchor.current);
      const targetIdx = visibleOrder.indexOf(clickedPath);
      if (anchorIdx >= 0 && targetIdx >= 0) {
        const lo = Math.min(anchorIdx, targetIdx);
        const hi = Math.max(anchorIdx, targetIdx);
        const rangePaths = visibleOrder.slice(lo, hi + 1);

        setSelected(prev => {
          const next = new Set(prev);
          // If the target is already selected, this is a deselect-range
          const targetAlreadySelected = prev.has(clickedPath);
          if (targetAlreadySelected) {
            rangePaths.forEach(p => next.delete(p));
          } else {
            rangePaths.forEach(p => next.add(p));
          }
          return next;
        });
      }
      // Do NOT update anchor on shift-click (anchor stays at original Ctrl-click point)
      return;
    }

    /* ---- Plain click: just view the file (no selection change) ---- */
    if (paths.length === 1) {
      onFileClick(clickedPath, staged);
      setViewingFile(clickedPath);
    }
    // Plain click on folder → just expand/collapse (handled separately)
  }, [onFileClick]);

  /* ---- Batch actions ---- */
  const stageSelected = useCallback(async () => {
    for (const p of selUnstaged) { try { await onStage(p); } catch {} }
    setSelUnstaged(new Set());
    anchorUnstaged.current = null;
  }, [selUnstaged, onStage]);

  const unstageSelected = useCallback(async () => {
    for (const p of selStaged) { try { await onUnstage(p); } catch {} }
    setSelStaged(new Set());
    anchorStaged.current = null;
  }, [selStaged, onUnstage]);

  const selectAll = useCallback((
    fileList: FileStatus[],
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) => {
    setSelected(new Set(fileList.map(f => f.path)));
  }, []);

  const deselectAll = useCallback((
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    anchor: React.MutableRefObject<string | null>,
  ) => {
    setSelected(new Set());
    anchor.current = null;
  }, []);

  const handleCommit = () => {
    if (commitMsg.trim() && onCommit) { onCommit(commitMsg.trim()); setCommitMsg(''); }
  };

  /* ================================================================ */
  /* Render: List row                                                  */
  /* ================================================================ */

  const renderListRow = (
    file: FileStatus, staged: boolean,
    selected: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    anchor: React.MutableRefObject<string | null>,
    visibleOrder: string[],
  ) => {
    const isSel = selected.has(file.path);
    const isViewing = viewingFile === file.path;
    return (
      <div
        key={`${staged ? 's' : 'u'}-${file.path}`}
        onClick={(e) =>
          handleItemClick([file.path], e, visibleOrder, selected, setSelected, anchor, staged)
        }
        className={`group flex items-center gap-1.5 px-3 py-[3px] text-[12px] cursor-pointer transition-colors select-none
          ${isSel
            ? 'bg-[#094771] text-white'
            : isViewing
              ? 'bg-[#37373d] text-white'
              : 'text-[#ccc] hover:bg-[#2a2d2e]'
          }`}
      >
        {/* Selection checkbox indicator */}
        {isSel
          ? <CheckSquare size={12} className="text-[#4fc1ff] flex-shrink-0" />
          : <Square size={12} className="text-[#555] flex-shrink-0 opacity-0 group-hover:opacity-50" />
        }
        <StatusBadge status={file.status} />
        <StatusIcon status={file.status} />
        <span className="truncate flex-1 font-mono text-[11px]" title={file.path}>{file.path}</span>
        {staged ? (
          <button
            onClick={(e) => { e.stopPropagation(); onUnstage(file.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#555] transition-all flex-shrink-0"
            title="Unstage"
          ><ArrowUp size={12} className="text-[#e57373]" /></button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onStage(file.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#555] transition-all flex-shrink-0"
            title="Stage"
          ><ArrowDown size={12} className="text-[#73c991]" /></button>
        )}
      </div>
    );
  };

  /* ================================================================ */
  /* Render: Tree node                                                 */
  /* ================================================================ */

  const renderTreeNode = (
    node: TreeNode, depth: number, staged: boolean,
    selected: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    anchor: React.MutableRefObject<string | null>,
    visibleOrder: string[],
    sectionPrefix: string,
  ): React.ReactNode => {
    const folderKey = `${sectionPrefix}/${node.path}`;

    /* ---- Folder row ---- */
    if (node.isFolder) {
      const isExpanded = expandedFolders.has(folderKey);
      const childPaths = collectFilePaths(node);
      const allChildrenSelected = childPaths.length > 0 && childPaths.every(p => selected.has(p));
      const someChildrenSelected = childPaths.some(p => selected.has(p));

      return (
        <div key={`folder-${folderKey}`}>
          <div
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey || e.shiftKey) {
                // Ctrl/Shift + click on folder → select/deselect children
                handleItemClick(childPaths, e, visibleOrder, selected, setSelected, anchor, staged);
              } else {
                // Plain click on folder → expand/collapse
                toggleFolder(folderKey);
              }
            }}
            className={`group flex items-center gap-1 py-[2px] text-[12px] cursor-pointer select-none transition-colors
              ${allChildrenSelected ? 'bg-[#094771]/50 text-white' : 'text-[#ccc] hover:bg-[#2a2d2e]'}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {isExpanded
              ? <ChevronDown size={11} className="text-[#888] flex-shrink-0" />
              : <ChevronRight size={11} className="text-[#888] flex-shrink-0" />}
            {/* Folder checkbox indicator */}
            {allChildrenSelected
              ? <CheckSquare size={12} className="text-[#4fc1ff] flex-shrink-0" />
              : someChildrenSelected
                ? <span className="w-3 h-3 rounded-[2px] border border-[#4fc1ff] flex-shrink-0 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-[#4fc1ff] rounded-[1px]" />
                  </span>
                : <Square size={12} className="text-[#555] flex-shrink-0 opacity-0 group-hover:opacity-50" />
            }
            {isExpanded
              ? <FolderOpen size={13} className="text-[#e2b93d] flex-shrink-0" />
              : <Folder size={13} className="text-[#e2b93d] flex-shrink-0" />}
            <span className="truncate font-mono text-[11px]">{node.name}</span>
            <span className="text-[10px] text-[#666] ml-1">({childPaths.length})</span>
          </div>
          {isExpanded && node.children.map(child =>
            renderTreeNode(child, depth + 1, staged, selected, setSelected, anchor, visibleOrder, sectionPrefix)
          )}
        </div>
      );
    }

    /* ---- File row ---- */
    const file = node.file!;
    const isSel = selected.has(file.path);
    const isViewing = viewingFile === file.path;
    return (
      <div
        key={`file-${sectionPrefix}-${file.path}`}
        onClick={(e) =>
          handleItemClick([file.path], e, visibleOrder, selected, setSelected, anchor, staged)
        }
        className={`group flex items-center gap-1 py-[2px] text-[12px] cursor-pointer transition-colors select-none
          ${isSel
            ? 'bg-[#094771] text-white'
            : isViewing
              ? 'bg-[#37373d] text-white'
              : 'text-[#ccc] hover:bg-[#2a2d2e]'
          }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {/* Spacer to align with folder chevron */}
        <span className="w-[11px] flex-shrink-0" />
        {/* Selection checkbox */}
        {isSel
          ? <CheckSquare size={12} className="text-[#4fc1ff] flex-shrink-0" />
          : <Square size={12} className="text-[#555] flex-shrink-0 opacity-0 group-hover:opacity-50" />
        }
        <StatusIcon status={file.status} />
        <span className="truncate flex-1 font-mono text-[11px]" title={file.path}>{node.name}</span>
        <StatusBadge status={file.status} />
        {staged ? (
          <button
            onClick={(e) => { e.stopPropagation(); onUnstage(file.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#555] transition-all flex-shrink-0 mr-1"
            title="Unstage"
          ><ArrowUp size={12} className="text-[#e57373]" /></button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onStage(file.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#555] transition-all flex-shrink-0 mr-1"
            title="Stage"
          ><ArrowDown size={12} className="text-[#73c991]" /></button>
        )}
      </div>
    );
  };

  /* ================================================================ */
  /* Render: Section (Unstaged / Staged)                               */
  /* ================================================================ */

  const renderSection = (
    label: string, isOpen: boolean, toggle: () => void,
    fileList: FileStatus[], tree: TreeNode[], staged: boolean,
    selected: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    anchor: React.MutableRefObject<string | null>,
    visibleOrder: string[],
  ) => {
    const selCount = selected.size;
    const allSelected = fileList.length > 0 && selCount === fileList.length;

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#252526] border-b border-[#3c3c3c] flex-shrink-0">
          <button
            onClick={toggle}
            className="flex items-center gap-1 text-[12px] font-semibold text-[#ccc] hover:text-white transition-colors"
          >
            {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span>{label}</span>
          </button>
          {fileList.length > 0 && (
            <span className="text-[10px] text-[#888] font-normal">({fileList.length})</span>
          )}
          <div className="flex-1" />

          {/* Select All / Deselect All */}
          {fileList.length > 0 && (
            <button
              onClick={() => allSelected ? deselectAll(setSelected, anchor) : selectAll(fileList, setSelected)}
              className="text-[10px] text-[#888] hover:text-[#ccc] transition-colors mr-1 px-1"
              title={allSelected ? 'Deselect All' : 'Select All'}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}

          {/* Batch Stage/Unstage selected */}
          {selCount > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); staged ? unstageSelected() : stageSelected(); }}
              className={`text-[10px] font-medium cursor-pointer px-1.5 py-0.5 rounded transition-colors mr-1
                ${staged
                  ? 'text-[#e57373] bg-[#e5737320] hover:bg-[#e5737340]'
                  : 'text-[#73c991] bg-[#73c99120] hover:bg-[#73c99140]'}`}
            >
              {staged ? 'Unstage' : 'Stage'} Selected ({selCount})
            </span>
          )}

          {/* Stage All / Unstage All */}
          {fileList.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                staged ? fileList.forEach(f => onUnstage(f.path)) : onStageAll();
              }}
              className={`text-[11px] font-medium cursor-pointer transition-colors
                ${staged ? 'text-[#e57373] hover:text-[#ef9a9a]' : 'text-[#73c991] hover:text-[#a5d6a7]'}`}
            >
              {staged ? 'Unstage All' : 'Stage All'}
            </span>
          )}
        </div>

        {/* File list content */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto">
            {fileList.length === 0 ? (
              <div className="text-[11px] text-[#555] text-center py-3">
                No {label.toLowerCase()} changes
              </div>
            ) : viewMode === 'list' ? (
              fileList.map(f => renderListRow(f, staged, selected, setSelected, anchor, visibleOrder))
            ) : (
              tree.map(node =>
                renderTreeNode(node, 0, staged, selected, setSelected, anchor, visibleOrder, staged ? 'staged' : 'unstaged')
              )
            )}
          </div>
        )}
      </div>
    );
  };

  /* ================================================================ */
  /* Main render                                                       */
  /* ================================================================ */

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* View mode toggle bar */}
      <div className="flex items-center gap-1 px-3 py-1 bg-[#252526] border-b border-[#3c3c3c] flex-shrink-0">
        <span className="text-[11px] text-[#888] mr-1">View:</span>
        <button
          onClick={() => setViewMode('tree')}
          className={`p-1 rounded transition-colors ${viewMode === 'tree' ? 'bg-[#094771] text-white' : 'text-[#888] hover:text-[#ccc] hover:bg-[#37373d]'}`}
          title="Tree view"
        ><FolderTree size={13} /></button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-[#094771] text-white' : 'text-[#888] hover:text-[#ccc] hover:bg-[#37373d]'}`}
          title="List view"
        ><List size={13} /></button>
        <div className="flex-1" />
        <span className="text-[10px] text-[#555]">Click: view diff &nbsp;|&nbsp; Ctrl+Click: select &nbsp;|&nbsp; Shift+Click: range</span>
      </div>

      {/* Unstaged & Staged sections */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderSection(
          'Unstaged', unstagedOpen, () => setUnstagedOpen(!unstagedOpen),
          unstagedFiles, unstagedTree, false,
          selUnstaged, setSelUnstaged, anchorUnstaged, visibleUnstaged,
        )}
        <div className="border-t border-[#3c3c3c]" />
        {renderSection(
          'Staged', stagedOpen, () => setStagedOpen(!stagedOpen),
          stagedFiles, stagedTree, true,
          selStaged, setSelStaged, anchorStaged, visibleStaged,
        )}
      </div>

      {/* Commit message area */}
      <div className="border-t border-[#3c3c3c] bg-[#252526] p-2 flex-shrink-0">
        <textarea
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          placeholder="Commit message..."
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-[12px] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4] resize-none"
          rows={3}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommit(); }}
        />
        <div className="flex items-center justify-between mt-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-[#888] cursor-pointer">
            <input type="checkbox" checked={isAmend} onChange={(e) => setIsAmend(e.target.checked)} className="rounded" />
            Amend
          </label>
          <button
            onClick={handleCommit}
            disabled={!commitMsg.trim() || stagedFiles.length === 0}
            className={`px-3 py-1 text-[12px] font-medium rounded transition-colors ${
              commitMsg.trim() && stagedFiles.length > 0
                ? 'bg-[#0078d4] text-white hover:bg-[#1a8ad4]'
                : 'bg-[#333] text-[#555] cursor-not-allowed'
            }`}
          >
            Commit {stagedFiles.length > 0 ? `${stagedFiles.length} Files` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
