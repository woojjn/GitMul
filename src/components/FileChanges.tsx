import { useState, useCallback, useRef, useMemo } from 'react';
import {
  FileText, FilePlus, FileX, ChevronDown, ChevronRight,
  ArrowDown, ArrowUp, List, FolderTree, Folder, FolderOpen,
} from 'lucide-react';
import type { FileStatus } from '../types/git';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

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
  path: string;             // full path for this segment
  isFolder: boolean;
  status?: string;          // only for file nodes
  file?: FileStatus;        // only for file nodes
  children: TreeNode[];
}

/* ------------------------------------------------------------------ */
/* Unified status colors  (same for staged & unstaged)                 */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  modified: '#e2b93d',   // warm yellow-orange
  untracked: '#73c991',  // green-teal
  'new file': '#73c991',
  deleted: '#e57373',    // red
  renamed: '#64b5f6',    // blue
  copied: '#64b5f6',
};
const DEFAULT_COLOR = '#888';

const statusColor = (status: string) => STATUS_COLORS[status] ?? DEFAULT_COLOR;

const statusLabel = (status: string) => {
  switch (status) {
    case 'modified': return 'M';
    case 'untracked': return 'U';
    case 'new file': return 'A';
    case 'deleted': return 'D';
    case 'renamed': return 'R';
    case 'copied': return 'C';
    default: return '?';
  }
};

/* ------------------------------------------------------------------ */
/* Status icon & dot helpers                                           */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: string }) {
  const color = statusColor(status);
  switch (status) {
    case 'modified':
      return <FileText size={13} style={{ color }} />;
    case 'untracked':
    case 'new file':
      return <FilePlus size={13} style={{ color }} />;
    case 'deleted':
      return <FileX size={13} style={{ color }} />;
    default:
      return <FileText size={13} style={{ color }} />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span
      className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-[3px] text-[9px] font-bold flex-shrink-0 leading-none"
      style={{ backgroundColor: color + '33', color }}
    >
      {statusLabel(status)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Build tree from flat file list                                      */
/* ------------------------------------------------------------------ */

function buildTree(fileList: FileStatus[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of fileList) {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      let existing = currentLevel.find(n => n.name === part && n.isFolder === !isLast);

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          children: [],
          ...(isLast ? { status: file.status, file } : {}),
        };
        currentLevel.push(existing);
      }
      currentLevel = existing.children;
    }
  }

  // sort: folders first, then alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => { if (n.isFolder) sortNodes(n.children); });
  };
  sortNodes(root);
  return root;
}

/** Collect all file paths under a tree node (recursively) */
function collectFilePaths(node: TreeNode): string[] {
  if (!node.isFolder && node.file) return [node.file.path];
  return node.children.flatMap(collectFilePaths);
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function FileChanges({
  files,
  onRefresh,
  onStage,
  onUnstage,
  onStageAll,
  onFileClick,
  onCommit,
}: FileChangesProps) {
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [commitMsg, setCommitMsg] = useState('');
  const [isAmend, setIsAmend] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  // Multi-select state  (separate for staged / unstaged)
  const [selectedUnstaged, setSelectedUnstaged] = useState<Set<string>>(new Set());
  const [selectedStaged, setSelectedStaged] = useState<Set<string>>(new Set());
  const lastClickedUnstaged = useRef<string | null>(null);
  const lastClickedStaged = useRef<string | null>(null);

  // Tree expand state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const stagedFiles = useMemo(() => files.filter(f => f.staged), [files]);
  const unstagedFiles = useMemo(() => files.filter(f => !f.staged), [files]);

  const stagedTree = useMemo(() => buildTree(stagedFiles), [stagedFiles]);
  const unstagedTree = useMemo(() => buildTree(unstagedFiles), [unstagedFiles]);

  // Auto-expand all folders on first render / file change
  // We store a key to detect changes
  const unstagedKey = unstagedFiles.map(f => f.path).join('|');
  const stagedKey = stagedFiles.map(f => f.path).join('|');
  const prevKeysRef = useRef('');
  const newKeys = `${unstagedKey}::${stagedKey}`;
  if (prevKeysRef.current !== newKeys) {
    prevKeysRef.current = newKeys;
    // expand all folders by default
    const allPaths = new Set<string>();
    const collectFolders = (nodes: TreeNode[], prefix: string) => {
      for (const n of nodes) {
        const key = prefix ? `${prefix}/${n.path}` : n.path;
        if (n.isFolder) { allPaths.add(key); collectFolders(n.children, prefix); }
      }
    };
    collectFolders(unstagedTree, 'unstaged');
    collectFolders(stagedTree, 'staged');
    // merge with existing
    setExpandedFolders(prev => {
      const next = new Set(prev);
      allPaths.forEach(p => next.add(p));
      return next;
    });
  }

  /* ---- toggle folder ---- */
  const toggleFolder = useCallback((key: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  /* ---- multi-select logic ---- */
  const handleSelect = useCallback((
    path: string,
    e: React.MouseEvent,
    orderedPaths: string[],
    selected: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    lastClicked: React.MutableRefObject<string | null>,
  ) => {
    if (e.ctrlKey || e.metaKey) {
      // toggle individual
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path); else next.add(path);
        return next;
      });
      lastClicked.current = path;
    } else if (e.shiftKey && lastClicked.current) {
      // range select
      const startIdx = orderedPaths.indexOf(lastClicked.current);
      const endIdx = orderedPaths.indexOf(path);
      if (startIdx >= 0 && endIdx >= 0) {
        const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        setSelected(prev => {
          const next = new Set(prev);
          for (let i = lo; i <= hi; i++) next.add(orderedPaths[i]);
          return next;
        });
      }
    } else {
      // single click
      setSelected(new Set([path]));
      lastClicked.current = path;
    }
  }, []);

  /* ---- batch stage / unstage selected ---- */
  const stageSelected = useCallback(async () => {
    const paths = Array.from(selectedUnstaged);
    for (const p of paths) { try { await onStage(p); } catch {} }
    setSelectedUnstaged(new Set());
  }, [selectedUnstaged, onStage]);

  const unstageSelected = useCallback(async () => {
    const paths = Array.from(selectedStaged);
    for (const p of paths) { try { await onUnstage(p); } catch {} }
    setSelectedStaged(new Set());
  }, [selectedStaged, onUnstage]);

  const handleCommit = () => {
    if (commitMsg.trim() && onCommit) {
      onCommit(commitMsg.trim());
      setCommitMsg('');
    }
  };

  /* ---- ordered file paths (for shift-click range) ---- */
  const orderedUnstaged = useMemo(() => unstagedFiles.map(f => f.path), [unstagedFiles]);
  const orderedStaged = useMemo(() => stagedFiles.map(f => f.path), [stagedFiles]);

  /* ================================================================ */
  /* Render helpers                                                    */
  /* ================================================================ */

  /** Flat list row */
  const renderListRow = (
    file: FileStatus,
    staged: boolean,
    selected: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    lastClicked: React.MutableRefObject<string | null>,
    orderedPaths: string[],
  ) => {
    const isSelected = selected.has(file.path);
    return (
      <div
        key={`${staged ? 's' : 'u'}-${file.path}`}
        onClick={(e) => {
          handleSelect(file.path, e, orderedPaths, selected, setSelected, lastClicked);
          onFileClick(file.path, staged);
        }}
        className={`group flex items-center gap-1.5 px-3 py-[3px] text-[12px] cursor-pointer transition-colors
          ${isSelected ? 'bg-[#094771] text-white' : 'text-[#ccc] hover:bg-[#2a2d2e]'}`}
      >
        <StatusBadge status={file.status} />
        <StatusIcon status={file.status} />
        <span className="truncate flex-1 font-mono text-[11px]" title={file.path}>{file.path}</span>
        {staged ? (
          <button
            onClick={(e) => { e.stopPropagation(); onUnstage(file.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#37373d] transition-all flex-shrink-0"
            title="Unstage"
          >
            <ArrowUp size={12} className="text-[#e57373]" />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onStage(file.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#37373d] transition-all flex-shrink-0"
            title="Stage"
          >
            <ArrowDown size={12} className="text-[#73c991]" />
          </button>
        )}
      </div>
    );
  };

  /** Tree node renderer (recursive) */
  const renderTreeNode = (
    node: TreeNode,
    depth: number,
    staged: boolean,
    selected: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    lastClicked: React.MutableRefObject<string | null>,
    orderedPaths: string[],
    sectionPrefix: string,
  ): React.ReactNode => {
    const folderKey = `${sectionPrefix}/${node.path}`;

    if (node.isFolder) {
      const isExpanded = expandedFolders.has(folderKey);
      return (
        <div key={`folder-${folderKey}`}>
          <div
            onClick={() => toggleFolder(folderKey)}
            className="group flex items-center gap-1 py-[2px] text-[12px] text-[#ccc] hover:bg-[#2a2d2e] cursor-pointer select-none"
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {isExpanded ? <ChevronDown size={11} className="text-[#888] flex-shrink-0" /> : <ChevronRight size={11} className="text-[#888] flex-shrink-0" />}
            {isExpanded
              ? <FolderOpen size={13} className="text-[#e2b93d] flex-shrink-0" />
              : <Folder size={13} className="text-[#e2b93d] flex-shrink-0" />
            }
            <span className="truncate font-mono text-[11px]">{node.name}</span>
          </div>
          {isExpanded && node.children.map(child =>
            renderTreeNode(child, depth + 1, staged, selected, setSelected, lastClicked, orderedPaths, sectionPrefix)
          )}
        </div>
      );
    }

    // File node
    const file = node.file!;
    const isSelected = selected.has(file.path);
    return (
      <div
        key={`file-${sectionPrefix}-${file.path}`}
        onClick={(e) => {
          handleSelect(file.path, e, orderedPaths, selected, setSelected, lastClicked);
          onFileClick(file.path, staged);
        }}
        className={`group flex items-center gap-1 py-[2px] text-[12px] cursor-pointer transition-colors select-none
          ${isSelected ? 'bg-[#094771] text-white' : 'text-[#ccc] hover:bg-[#2a2d2e]'}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="w-[11px] flex-shrink-0" /> {/* indent spacer for alignment with folders chevron */}
        <StatusIcon status={file.status} />
        <span className="truncate flex-1 font-mono text-[11px]" title={file.path}>{node.name}</span>
        <StatusBadge status={file.status} />
        {staged ? (
          <button
            onClick={(e) => { e.stopPropagation(); onUnstage(file.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#37373d] transition-all flex-shrink-0 mr-1"
            title="Unstage"
          >
            <ArrowUp size={12} className="text-[#e57373]" />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onStage(file.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#37373d] transition-all flex-shrink-0 mr-1"
            title="Stage"
          >
            <ArrowDown size={12} className="text-[#73c991]" />
          </button>
        )}
      </div>
    );
  };

  /** Section renderer */
  const renderSection = (
    label: string,
    isOpen: boolean,
    toggle: () => void,
    fileList: FileStatus[],
    tree: TreeNode[],
    staged: boolean,
    selected: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    lastClicked: React.MutableRefObject<string | null>,
    orderedPaths: string[],
  ) => {
    const hasSelected = selected.size > 0;
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

          {/* Batch action for selected */}
          {hasSelected && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                staged ? unstageSelected() : stageSelected();
              }}
              className={`text-[10px] font-medium cursor-pointer px-1.5 py-0.5 rounded transition-colors mr-1
                ${staged
                  ? 'text-[#e57373] bg-[#e5737320] hover:bg-[#e5737340]'
                  : 'text-[#73c991] bg-[#73c99120] hover:bg-[#73c99140]'
                }`}
            >
              {staged ? 'Unstage' : 'Stage'} Selected ({selected.size})
            </span>
          )}

          {/* All action */}
          {fileList.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (staged) {
                  fileList.forEach(f => onUnstage(f.path));
                } else {
                  onStageAll();
                }
              }}
              className={`text-[11px] font-medium cursor-pointer transition-colors
                ${staged ? 'text-[#e57373] hover:text-[#ef9a9a]' : 'text-[#73c991] hover:text-[#a5d6a7]'}`}
            >
              {staged ? 'Unstage All' : 'Stage All'}
            </span>
          )}
        </div>

        {/* Content */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto">
            {fileList.length === 0 ? (
              <div className="text-[11px] text-[#555] text-center py-3">
                No {label.toLowerCase()} changes
              </div>
            ) : viewMode === 'list' ? (
              fileList.map(file =>
                renderListRow(file, staged, selected, setSelected, lastClicked, orderedPaths)
              )
            ) : (
              tree.map(node =>
                renderTreeNode(node, 0, staged, selected, setSelected, lastClicked, orderedPaths, staged ? 'staged' : 'unstaged')
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
        >
          <FolderTree size={13} />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-[#094771] text-white' : 'text-[#888] hover:text-[#ccc] hover:bg-[#37373d]'}`}
          title="List view"
        >
          <List size={13} />
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-[#666]">Ctrl/Shift+Click to multi-select</span>
      </div>

      {/* Unstaged & Staged sections */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderSection(
          'Unstaged', unstagedOpen, () => setUnstagedOpen(!unstagedOpen),
          unstagedFiles, unstagedTree, false,
          selectedUnstaged, setSelectedUnstaged, lastClickedUnstaged, orderedUnstaged,
        )}
        <div className="border-t border-[#3c3c3c]" />
        {renderSection(
          'Staged', stagedOpen, () => setStagedOpen(!stagedOpen),
          stagedFiles, stagedTree, true,
          selectedStaged, setSelectedStaged, lastClickedStaged, orderedStaged,
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleCommit();
            }
          }}
        />
        <div className="flex items-center justify-between mt-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-[#888] cursor-pointer">
            <input
              type="checkbox"
              checked={isAmend}
              onChange={(e) => setIsAmend(e.target.checked)}
              className="rounded"
            />
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
