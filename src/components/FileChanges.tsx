import { FileText, FilePlus, FileX, RefreshCw, Plus, Minus, Eye } from 'lucide-react';
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
  onFileClick
}: FileChangesProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'modified':
        return <FileText size={16} className="text-git-modified" />;
      case 'untracked':
        return <FilePlus size={16} className="text-git-added" />;
      case 'deleted':
        return <FileX size={16} className="text-git-deleted" />;
      case 'staged':
        return <FileText size={16} className="text-git-added" />;
      default:
        return <FileText size={16} className="text-git-untracked" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'modified':
        return '수정됨';
      case 'untracked':
        return '추적 안 됨';
      case 'deleted':
        return '삭제됨';
      case 'staged':
        return 'Staged';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'modified':
        return 'text-git-modified';
      case 'untracked':
        return 'text-git-untracked';
      case 'deleted':
        return 'text-git-deleted';
      case 'staged':
        return 'text-git-added';
      default:
        return 'text-gray-500';
    }
  };

  const stagedFiles = files.filter(f => f.staged);
  const unstagedFiles = files.filter(f => !f.staged);

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

  const handleFileClick = (path: string, staged: boolean) => {
    onFileClick(path, staged);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="min-h-[3rem] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 flex-shrink-0 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          변경 사항 ({files.length})
        </h3>
        <div className="flex items-center gap-2">
          {unstagedFiles.length > 0 && (
            <button
              onClick={onStageAll}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
              title="모두 스테이징"
            >
              <Plus size={14} />
              모두 추가
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="새로고침"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
            변경 사항 없음
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {stagedFiles.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">
                  Staged ({stagedFiles.length})
                </h4>
                <div className="space-y-1">
                  {stagedFiles.map((file, idx) => (
                    <div
                      key={`staged-${idx}`}
                      onClick={() => handleFileClick(file.path, file.staged)}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      {getStatusIcon(file.status)}
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate min-w-0" title={file.path}>
                        {file.path}
                      </span>
                      <span className={`text-xs font-medium ${getStatusColor(file.status)}`}>
                        {getStatusText(file.status)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileClick(file.path, file.staged);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                        title="Diff 보기"
                      >
                        <Eye size={14} className="text-blue-500" />
                      </button>
                      <button
                        onClick={(e) => handleUnstageClick(file.path, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        title="Unstage"
                      >
                        <Minus size={14} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unstagedFiles.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">
                  Unstaged ({unstagedFiles.length})
                </h4>
                <div className="space-y-1">
                  {unstagedFiles.map((file, idx) => (
                    <div
                      key={`unstaged-${idx}`}
                      onClick={() => handleFileClick(file.path, file.staged)}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      {getStatusIcon(file.status)}
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate min-w-0" title={file.path}>
                        {file.path}
                      </span>
                      <span className={`text-xs font-medium ${getStatusColor(file.status)}`}>
                        {getStatusText(file.status)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileClick(file.path, file.staged);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                        title="Diff 보기"
                      >
                        <Eye size={14} className="text-blue-500" />
                      </button>
                      <button
                        onClick={(e) => handleStageClick(file.path, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-all"
                        title="Stage"
                      >
                        <Plus size={14} className="text-green-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
