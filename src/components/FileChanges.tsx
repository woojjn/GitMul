import { useState } from 'react';
import { FileText, FilePlus, FileX, RefreshCw, Plus, Minus, Eye, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';
import type { FileStatus } from '../types/git';

interface FileChangesProps {
  files: FileStatus[];
  onRefresh: () => void;
  onStage: (path: string) => Promise<void>;
  onUnstage: (path: string) => Promise<void>;
  onStageAll: () => Promise<void>;
  onFileClick: (path: string, staged: boolean) => void;
}

export default function FileChanges({
  files,
  onRefresh,
  onStage,
  onUnstage,
  onStageAll,
  onFileClick,
}: FileChangesProps) {
  const [stagedCollapsed, setStagedCollapsed] = useState(false);
  const [unstagedCollapsed, setUnstagedCollapsed] = useState(false);

  const getStatusIcon = (status: string, staged: boolean) => {
    switch (status) {
      case 'modified':
        return <FileText size={15} className={staged ? 'text-green-600 dark:text-green-400' : 'text-yellow-500 dark:text-yellow-400'} />;
      case 'untracked':
      case 'new file':
        return <FilePlus size={15} className={staged ? 'text-green-600 dark:text-green-400' : 'text-blue-500 dark:text-blue-400'} />;
      case 'deleted':
        return <FileX size={15} className="text-red-500 dark:text-red-400" />;
      case 'staged':
        return <FileText size={15} className="text-green-600 dark:text-green-400" />;
      default:
        return <FileText size={15} className="text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'modified':
        return 'M';
      case 'untracked':
      case 'new file':
        return 'N';
      case 'deleted':
        return 'D';
      case 'staged':
        return 'S';
      default:
        return '?';
    }
  };

  const getStatusBadgeColor = (status: string, staged: boolean) => {
    if (staged) {
      return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
    }
    switch (status) {
      case 'modified':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';
      case 'untracked':
      case 'new file':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
      case 'deleted':
        return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'modified':
        return '수정됨';
      case 'untracked':
      case 'new file':
        return '새 파일';
      case 'deleted':
        return '삭제됨';
      case 'staged':
        return 'Staged';
      default:
        return status;
    }
  };

  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);

  const handleStageClick = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onStage(path);
    } catch (error) {
      alert(`스테이징 실패: ${error}`);
    }
  };

  const handleUnstageClick = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onUnstage(path);
    } catch (error) {
      alert(`언스테이징 실패: ${error}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="min-h-[3rem] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 flex-shrink-0 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          변경 사항
          <span className="text-xs font-normal bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
            {files.length}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {unstagedFiles.length > 0 && (
            <button
              onClick={onStageAll}
              className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 font-medium shadow-sm"
              title="모두 스테이징 (Ctrl+Shift+A)"
            >
              <Plus size={13} />
              모두 Stage
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="새로고침"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm gap-2">
            <CheckSquare size={32} className="text-green-400 dark:text-green-500" />
            <span>변경 사항 없음</span>
          </div>
        ) : (
          <div className="py-1">
            {/* ── Staged Section ── */}
            {stagedFiles.length > 0 && (
              <div className="mb-1">
                {/* Section header */}
                <button
                  onClick={() => setStagedCollapsed(!stagedCollapsed)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-green-50 dark:bg-green-900/20 border-y border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  {stagedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <CheckSquare size={12} />
                  Staged 변경 사항
                  <span className="ml-auto bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-1.5 py-0 rounded-full text-[10px] font-bold">
                    {stagedFiles.length}
                  </span>
                </button>

                {!stagedCollapsed && (
                  <div className="bg-green-50/30 dark:bg-green-900/5">
                    {stagedFiles.map((file, idx) => (
                      <div
                        key={`staged-${idx}`}
                        onClick={() => onFileClick(file.path, file.staged)}
                        className="group flex items-center gap-2 px-3 py-1.5 hover:bg-green-100/50 dark:hover:bg-green-900/20 cursor-pointer transition-colors border-l-3 border-green-500"
                        style={{ borderLeftWidth: '3px' }}
                      >
                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold flex-shrink-0 ${getStatusBadgeColor(file.status, true)}`}
                        >
                          {getStatusText(file.status)}
                        </span>

                        {/* File icon */}
                        {getStatusIcon(file.status, true)}

                        {/* File path */}
                        <span
                          className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate min-w-0 font-mono text-xs"
                          title={file.path}
                        >
                          {file.path}
                        </span>

                        {/* Status label */}
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium flex-shrink-0 hidden group-hover:inline">
                          {getStatusLabel(file.status)}
                        </span>

                        {/* Actions */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileClick(file.path, file.staged);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex-shrink-0"
                          title="Diff 보기"
                        >
                          <Eye size={13} className="text-blue-500" />
                        </button>
                        <button
                          onClick={(e) => handleUnstageClick(file.path, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex-shrink-0"
                          title="Unstage"
                        >
                          <Minus size={13} className="text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Unstaged Section ── */}
            {unstagedFiles.length > 0 && (
              <div>
                {/* Section header */}
                <button
                  onClick={() => setUnstagedCollapsed(!unstagedCollapsed)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-yellow-50 dark:bg-yellow-900/10 border-y border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
                >
                  {unstagedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <Square size={12} />
                  Unstaged 변경 사항
                  <span className="ml-auto bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-1.5 py-0 rounded-full text-[10px] font-bold">
                    {unstagedFiles.length}
                  </span>
                </button>

                {!unstagedCollapsed && (
                  <div className="bg-yellow-50/20 dark:bg-yellow-900/5">
                    {unstagedFiles.map((file, idx) => (
                      <div
                        key={`unstaged-${idx}`}
                        onClick={() => onFileClick(file.path, file.staged)}
                        className="group flex items-center gap-2 px-3 py-1.5 hover:bg-yellow-100/40 dark:hover:bg-yellow-900/15 cursor-pointer transition-colors border-l-3 border-yellow-400 dark:border-yellow-600"
                        style={{ borderLeftWidth: '3px' }}
                      >
                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold flex-shrink-0 ${getStatusBadgeColor(file.status, false)}`}
                        >
                          {getStatusText(file.status)}
                        </span>

                        {/* File icon */}
                        {getStatusIcon(file.status, false)}

                        {/* File path */}
                        <span
                          className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate min-w-0 font-mono text-xs"
                          title={file.path}
                        >
                          {file.path}
                        </span>

                        {/* Status label */}
                        <span className={`text-[10px] font-medium flex-shrink-0 hidden group-hover:inline ${
                          file.status === 'deleted' ? 'text-red-500' :
                          file.status === 'untracked' || file.status === 'new file' ? 'text-blue-500' :
                          'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {getStatusLabel(file.status)}
                        </span>

                        {/* Actions */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileClick(file.path, file.staged);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex-shrink-0"
                          title="Diff 보기"
                        >
                          <Eye size={13} className="text-blue-500" />
                        </button>
                        <button
                          onClick={(e) => handleStageClick(file.path, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-all flex-shrink-0"
                          title="Stage"
                        >
                          <Plus size={13} className="text-green-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="mt-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CheckSquare size={11} className="text-green-500" />
                {stagedFiles.length} staged
              </span>
              <span className="flex items-center gap-1">
                <Square size={11} className="text-yellow-500" />
                {unstagedFiles.length} unstaged
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
