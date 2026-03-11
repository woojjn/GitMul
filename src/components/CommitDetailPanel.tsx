import { useState, useEffect } from 'react';
import { FileText, FilePlus, FileX, ArrowRight, User, Copy, ChevronRight, ChevronDown } from 'lucide-react';
import type { CommitFileChange, CommitInfo } from '../types/git';
import DiffViewer from './DiffViewer';
import * as api from '../services/api';

interface CommitDetailPanelProps {
  repoPath: string;
  commit: CommitInfo;
  onViewFileDiff: (filePath: string) => void;
}

export default function CommitDetailPanel({ repoPath, commit, onViewFileDiff }: CommitDetailPanelProps) {
  const [files, setFiles] = useState<CommitFileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [showCommitInfo, setShowCommitInfo] = useState(true);

  useEffect(() => {
    loadFiles();
    setExpandedFiles(new Set());
  }, [commit.sha]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await api.getCommitFileChanges(repoPath, commit.sha);
      setFiles(result);
    } catch (err) {
      console.error('Failed to load commit files:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(files.map(f => f.path)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return <FilePlus size={13} className="text-green-400" />;
      case 'deleted': return <FileX size={13} className="text-red-400" />;
      case 'renamed': return <ArrowRight size={13} className="text-blue-400" />;
      default: return <FileText size={13} className="text-[#ffb74d]" />;
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      added: '#81c784',
      modified: '#ffb74d',
      deleted: '#e57373',
      renamed: '#64b5f6',
    };
    return map[status] || '#888';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      added: 'A',
      modified: 'M',
      deleted: 'D',
      renamed: 'R',
    };
    return map[status] || '?';
  };

  const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${day} ${month} ${year} ${h}:${m}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full border-t border-[#3c3c3c] bg-[#1e1e1e]">
      {/* Compact commit info header */}
      <div className="flex-shrink-0 bg-[#252526] border-b border-[#3c3c3c]">
        {/* Top row: commit title + toggle */}
        <button
          onClick={() => setShowCommitInfo(!showCommitInfo)}
          className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-[#2a2d2e] transition-colors"
        >
          <span className="mt-0.5 flex-shrink-0">
            {showCommitInfo ? <ChevronDown size={12} className="text-[#888]" /> : <ChevronRight size={12} className="text-[#888]" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-[13px] font-semibold text-white block">{commit.message.split('\n')[0]}</span>
            {showCommitInfo && commit.message.includes('\n') && (
              <span className="text-[12px] text-[#999] mt-1 block whitespace-pre-wrap leading-relaxed">
                {commit.message.split('\n').slice(1).join('\n').trim()}
              </span>
            )}
          </span>
          <span className="text-[11px] font-mono text-[#64b5f6] flex-shrink-0 mt-0.5">{commit.sha.slice(0, 7)}</span>
        </button>

        {/* Expandable commit details */}
        {showCommitInfo && (
          <div className="px-3 pb-2 flex items-center gap-4 text-[11px] text-[#888]">
            <div className="flex items-center gap-1.5">
              <User size={12} />
              <span className="text-[#ccc]">{commit.author}</span>
            </div>
            <span>{formatDate(commit.date)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(commit.sha);
              }}
              className="flex items-center gap-1 text-[#64b5f6] hover:text-[#90caf9] transition-colors"
              title="Copy full SHA"
            >
              <Copy size={10} />
              <span className="font-mono">{commit.sha.slice(0, 10)}</span>
            </button>
            {commit.parent_ids.length > 0 && (
              <span className="text-[#666]">
                Parent: {commit.parent_ids.map(p => p.slice(0, 7)).join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* File list toolbar */}
      <div className="flex items-center h-[26px] bg-[#252526] border-b border-[#3c3c3c] px-3 flex-shrink-0 select-none">
        <span className="text-[11px] text-[#888] mr-2">
          {files.length} files changed
        </span>
        <span className="text-[10px] text-green-400 mr-1">+{totalAdditions}</span>
        <span className="text-[10px] text-red-400 mr-3">-{totalDeletions}</span>
        <div className="flex-1" />
        <button
          onClick={expandAll}
          className="text-[10px] text-[#888] hover:text-[#ccc] px-1.5 py-0.5 transition-colors"
          title="Expand all"
        >
          Expand All
        </button>
        <span className="text-[#3c3c3c] mx-0.5">|</span>
        <button
          onClick={collapseAll}
          className="text-[10px] text-[#888] hover:text-[#ccc] px-1.5 py-0.5 transition-colors"
          title="Collapse all"
        >
          Collapse All
        </button>
      </div>

      {/* Scrollable file list with inline diffs */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-[12px] text-[#555] text-center py-8">No file changes</div>
        ) : (
          files.map((file) => {
            const isExpanded = expandedFiles.has(file.path);
            const fileName = file.path.split('/').pop() || file.path;
            const dirPath = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';

            return (
              <div key={file.path} className="border-b border-[#2a2a2a]">
                {/* File header row */}
                <button
                  onClick={() => toggleFile(file.path)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 text-[12px] cursor-pointer transition-colors ${
                    isExpanded
                      ? 'bg-[#2a2d2e]'
                      : 'hover:bg-[#2a2d2e]'
                  }`}
                >
                  {/* Expand/Collapse chevron */}
                  {isExpanded
                    ? <ChevronDown size={14} className="text-[#888] flex-shrink-0" />
                    : <ChevronRight size={14} className="text-[#888] flex-shrink-0" />
                  }

                  {/* Status icon */}
                  {getStatusIcon(file.status)}

                  {/* File name + directory */}
                  <span className="flex-1 text-left min-w-0 flex items-center gap-1">
                    <span className="font-semibold text-[#ccc] truncate">{fileName}</span>
                    {dirPath && (
                      <span className="text-[10px] text-[#555] truncate font-mono">{dirPath}/</span>
                    )}
                  </span>

                  {/* Status badge */}
                  <span
                    className="text-[9px] font-bold w-4 text-center flex-shrink-0 rounded-sm"
                    style={{ color: getStatusColor(file.status) }}
                  >
                    {getStatusLabel(file.status)}
                  </span>

                  {/* Stats */}
                  {!file.is_binary && (file.additions > 0 || file.deletions > 0) && (
                    <span className="text-[10px] font-mono flex-shrink-0 ml-1">
                      {file.additions > 0 && <span className="text-green-400">+{file.additions}</span>}
                      {file.deletions > 0 && <span className="text-red-400 ml-1">-{file.deletions}</span>}
                    </span>
                  )}
                  {file.is_binary && (
                    <span className="text-[9px] italic text-[#555] flex-shrink-0">binary</span>
                  )}
                </button>

                {/* Inline diff (accordion content) */}
                {isExpanded && (
                  <div className="border-t border-[#333]" style={{ height: '400px' }}>
                    <DiffViewer
                      repoPath={repoPath}
                      filePath={file.path}
                      staged={false}
                      commitSha={commit.sha}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
