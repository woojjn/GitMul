import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { History, X, Eye, File } from 'lucide-react';

interface FileHistoryEntry {
  commit_sha: string;
  message: string;
  author: string;
  date: number;
  changes: string;
  old_path: string | null;
}

interface FileHistoryProps {
  repoPath: string;
  filePath: string;
  onClose: () => void;
}

const FileHistory: React.FC<FileHistoryProps> = ({ repoPath, filePath, onClose }) => {
  const [history, setHistory] = useState<FileHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingContent, setViewingContent] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [repoPath, filePath]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const result = await invoke<FileHistoryEntry[]>('get_file_history', {
        repoPath,
        filePath,
        limit: 100,
      });
      setHistory(result);
      setError('');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = async (commitSha: string) => {
    try {
      setLoading(true);
      const content = await invoke<string>('get_file_at_commit', {
        repoPath,
        commitSha,
        filePath,
      });
      setViewingContent(content);
      setSelectedCommit(commitSha);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = Date.now();
    const diff = now - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    if (days < 365) return `${Math.floor(days / 30)}개월 전`;
    return `${Math.floor(days / 365)}년 전`;
  };

  const getChangeColor = (change: string) => {
    switch (change) {
      case 'added':
        return 'text-green-600 dark:text-green-400';
      case 'deleted':
        return 'text-red-600 dark:text-red-400';
      case 'modified':
        return 'text-blue-600 dark:text-blue-400';
      case 'renamed':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getChangeLabel = (change: string) => {
    switch (change) {
      case 'added':
        return '추가됨';
      case 'deleted':
        return '삭제됨';
      case 'modified':
        return '수정됨';
      case 'renamed':
        return '이름 변경됨';
      default:
        return change;
    }
  };

  if (viewingContent !== null) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <File className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{filePath}</h2>
            <span className="text-sm text-gray-500 font-mono">
              @ {selectedCommit?.substring(0, 7)}
            </span>
          </div>
          <button
            onClick={() => {
              setViewingContent(null);
              setSelectedCommit(null);
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-sm font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded">
            {viewingContent}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <h2 className="text-lg font-semibold">파일 히스토리</h2>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-sm">
        <span className="font-medium">{filePath}</span>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded">
          {error}
        </div>
      )}

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && history.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            파일 히스토리가 없습니다
          </div>
        ) : (
          history.map((entry, index) => (
            <div
              key={`${entry.commit_sha}-${index}`}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm mb-1 break-words">{entry.message}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{entry.author}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${getChangeColor(entry.changes)}`}>
                  {getChangeLabel(entry.changes)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-mono">{entry.commit_sha.substring(0, 7)}</span>
                  <span>•</span>
                  <span>{formatDate(entry.date)}</span>
                </div>
                <button
                  onClick={() => handleViewContent(entry.commit_sha)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  <Eye className="w-3 h-3" />
                  내용 보기
                </button>
              </div>
              {entry.old_path && (
                <p className="text-xs text-gray-500 mt-2">
                  이전 경로: {entry.old_path}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FileHistory;
