import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { ReflogEntry } from '../types/git';
import { RotateCcw, X, AlertCircle } from 'lucide-react';

interface ReflogViewerProps {
  repoPath: string;
  onClose?: () => void;
}

const ReflogViewer: React.FC<ReflogViewerProps> = ({ repoPath, onClose }) => {
  const [reflog, setReflog] = useState<ReflogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReflog();
  }, [repoPath]);

  const loadReflog = async () => {
    try {
      setLoading(true);
      const result = await api.getReflog(repoPath, 'HEAD', 50);
      setReflog(result);
      setError('');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (entry: ReflogEntry, resetType: 'soft' | 'mixed' | 'hard') => {
    const typeLabels = {
      soft: 'Soft (변경사항 유지, Staged)',
      mixed: 'Mixed (변경사항 유지, Unstaged)',
      hard: 'Hard (모든 변경사항 삭제)',
    };

    if (!confirm(`${typeLabels[resetType]} 리셋을 실행하시겠습니까?\n${entry.message}`)) return;

    try {
      setLoading(true);
      await api.resetToReflog(repoPath, entry.new_oid, resetType);
      alert('리셋이 완료되었습니다');
      await loadReflog();
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
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Reflog</h2>
          <span className="text-sm text-gray-500">({reflog.length}개 항목)</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Reflog List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && reflog.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : reflog.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Reflog가 비어있습니다
          </div>
        ) : (
          reflog.map((entry, idx) => (
            <div
              key={`${entry.index}-${idx}`}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                      HEAD@{'{' + entry.index + '}'}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
                  </div>
                  <p className="text-sm font-medium mb-1 break-words">{entry.message}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono">{entry.old_oid.substring(0, 7)}</span>
                    <span>→</span>
                    <span className="font-mono">{entry.new_oid.substring(0, 7)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleReset(entry, 'soft')}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  title="Soft Reset (변경사항 Staged)"
                >
                  Soft
                </button>
                <button
                  onClick={() => handleReset(entry, 'mixed')}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  title="Mixed Reset (변경사항 Unstaged)"
                >
                  Mixed
                </button>
                <button
                  onClick={() => handleReset(entry, 'hard')}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  title="Hard Reset (변경사항 삭제)"
                >
                  Hard
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
        <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">⚠️ 주의사항</p>
            <ul className="text-xs space-y-1">
              <li>• Soft: 커밋만 취소, 변경사항은 Staged 상태로 유지</li>
              <li>• Mixed: 커밋 + Staging 취소, 변경사항은 Unstaged 상태로 유지</li>
              <li>• Hard: 모든 변경사항 삭제 (복구 불가능)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReflogViewer;
