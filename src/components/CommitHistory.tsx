import { useState, useRef, useEffect } from 'react';
import { GitCommit, User, RefreshCw, GitBranch, Undo2, Copy, ChevronDown, ChevronRight, FileText, FilePlus, FileX, FileDiff, ArrowRight } from 'lucide-react';
import type { CommitInfo, CommitFileChange } from '../types/git';
import * as api from '../services/api';

interface CommitHistoryProps {
  commits: CommitInfo[];
  repoPath: string;
  onRefresh: () => void;
  onCherryPick?: (commitSha: string, commitMessage: string) => void;
  onRevert?: (commitSha: string, commitMessage: string) => void;
  onSelectCommit?: (sha: string) => void;
  onViewCommitFileDiff?: (commitSha: string, filePath: string) => void;
  selectedCommitSha?: string | null;
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  commit: CommitInfo | null;
}

export default function CommitHistory({
  commits,
  repoPath,
  onRefresh,
  onCherryPick,
  onRevert,
  onSelectCommit,
  onViewCommitFileDiff,
  selectedCommitSha,
}: CommitHistoryProps) {
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [commitFiles, setCommitFiles] = useState<Record<string, CommitFileChange[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    commit: null,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu((prev) => ({ ...prev, show: false }));
      }
    };

    if (contextMenu.show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.show]);

  const handleContextMenu = (e: React.MouseEvent, commit: CommitInfo) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      commit,
    });
  };

  const handleCopysha = () => {
    if (contextMenu.commit) {
      navigator.clipboard.writeText(contextMenu.commit.sha);
      setContextMenu((prev) => ({ ...prev, show: false }));
    }
  };

  const handleCherryPickClick = () => {
    if (contextMenu.commit && onCherryPick) {
      onCherryPick(contextMenu.commit.sha, contextMenu.commit.message);
      setContextMenu((prev) => ({ ...prev, show: false }));
    }
  };

  const handleRevertClick = () => {
    if (contextMenu.commit && onRevert) {
      onRevert(contextMenu.commit.sha, contextMenu.commit.message);
      setContextMenu((prev) => ({ ...prev, show: false }));
    }
  };

  const toggleExpand = async (sha: string) => {
    if (expandedCommit === sha) {
      setExpandedCommit(null);
      return;
    }

    setExpandedCommit(sha);
    onSelectCommit?.(sha);

    // Load file changes for this commit if not cached
    if (!commitFiles[sha]) {
      setLoadingFiles(sha);
      try {
        const files = await api.getCommitFileChanges(repoPath, sha);
        setCommitFiles((prev) => ({ ...prev, [sha]: files }));
      } catch (err) {
        console.error('Failed to load commit file changes:', err);
        setCommitFiles((prev) => ({ ...prev, [sha]: [] }));
      } finally {
        setLoadingFiles(null);
      }
    }
  };

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
        return <FilePlus size={14} className="text-green-500" />;
      case 'deleted':
        return <FileX size={14} className="text-red-500" />;
      case 'renamed':
        return <ArrowRight size={14} className="text-blue-500" />;
      case 'copied':
        return <FileDiff size={14} className="text-purple-500" />;
      default:
        return <FileText size={14} className="text-yellow-500" />;
    }
  };

  const getFileStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      added: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      modified: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
      deleted: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      renamed: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      copied: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    };
    const label: Record<string, string> = {
      added: 'A',
      modified: 'M',
      deleted: 'D',
      renamed: 'R',
      copied: 'C',
    };
    return (
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
      >
        {label[status] || '?'}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="min-h-[3rem] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <GitCommit size={18} />
          커밋 히스토리 ({commits.length})
        </h3>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="새로고침"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {commits.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            커밋이 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {commits.map((commit) => {
              const isExpanded = expandedCommit === commit.sha;
              const isSelected = selectedCommitSha === commit.sha;
              const files = commitFiles[commit.sha];
              const isLoadingThis = loadingFiles === commit.sha;

              return (
                <div key={commit.sha}>
                  {/* Commit row */}
                  <div
                    onClick={() => toggleExpand(commit.sha)}
                    onContextMenu={(e) => handleContextMenu(e, commit)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected || isExpanded
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Expand/collapse chevron */}
                      <div className="flex-shrink-0 mt-1.5 text-gray-400 dark:text-gray-500">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>

                      {/* Avatar */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {commit.author.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {commit.sha.slice(0, 7)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {commit.date}
                          </span>
                          {commit.parent_ids.length > 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded font-medium">
                              Merge
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed truncate">
                          {commit.message}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          <User size={11} />
                          <span>{commit.author}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: file changes for this commit */}
                  {isExpanded && (
                    <div className="bg-gray-50 dark:bg-gray-800/60 border-l-4 border-blue-400 dark:border-blue-600">
                      {isLoadingThis ? (
                        <div className="flex items-center gap-2 p-3 text-sm text-gray-500 dark:text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                          파일 변경 사항 로딩 중...
                        </div>
                      ) : files && files.length > 0 ? (
                        <div className="p-2">
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold px-2 pb-1 flex items-center gap-1.5">
                            <FileDiff size={12} />
                            변경된 파일 ({files.length})
                          </div>
                          <div className="space-y-0.5">
                            {files.map((file, idx) => (
                              <div
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewCommitFileDiff?.(commit.sha, file.path);
                                }}
                                className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-colors"
                              >
                                {getFileStatusBadge(file.status)}
                                {getFileStatusIcon(file.status)}
                                <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate font-mono" title={file.path}>
                                  {file.old_path && file.status === 'renamed' ? (
                                    <>
                                      <span className="text-gray-400 dark:text-gray-500">{file.old_path}</span>
                                      <span className="mx-1 text-blue-500">→</span>
                                      {file.path}
                                    </>
                                  ) : (
                                    file.path
                                  )}
                                </span>
                                {!file.is_binary && (file.additions > 0 || file.deletions > 0) && (
                                  <span className="flex items-center gap-1 text-[11px] font-mono flex-shrink-0">
                                    {file.additions > 0 && (
                                      <span className="text-green-600 dark:text-green-400">+{file.additions}</span>
                                    )}
                                    {file.deletions > 0 && (
                                      <span className="text-red-600 dark:text-red-400">-{file.deletions}</span>
                                    )}
                                  </span>
                                )}
                                {file.is_binary && (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">binary</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Summary bar */}
                          <div className="mt-1.5 px-2 pt-1.5 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                            <span>{files.length} 파일</span>
                            <span className="text-green-600 dark:text-green-400">
                              +{files.reduce((s, f) => s + f.additions, 0)}
                            </span>
                            <span className="text-red-600 dark:text-red-400">
                              -{files.reduce((s, f) => s + f.deletions, 0)}
                            </span>
                          </div>
                        </div>
                      ) : files ? (
                        <div className="p-3 text-sm text-gray-500 dark:text-gray-400 italic">
                          변경된 파일 없음
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          ref={menuRef}
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            onClick={handleCopysha}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <Copy size={16} />
            SHA 복사
          </button>

          {onCherryPick && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={handleCherryPickClick}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600 dark:text-green-400"
              >
                <GitBranch size={16} />
                Cherry-pick
              </button>
            </>
          )}

          {onRevert && (
            <button
              onClick={handleRevertClick}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600 dark:text-orange-400"
            >
              <Undo2 size={16} />
              Revert
            </button>
          )}
        </div>
      )}
    </div>
  );
}
