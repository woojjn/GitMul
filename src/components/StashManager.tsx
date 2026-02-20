import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { StashInfo } from '../types/git';
import { Package, Save, Trash2, RefreshCw, X } from 'lucide-react';

interface StashManagerProps {
  repoPath: string;
  onClose?: () => void;
}

export default function StashManager({ repoPath, onClose }: StashManagerProps) {
  const [stashes, setStashes] = useState<StashInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [includeUntracked, setIncludeUntracked] = useState(false);

  useEffect(() => {
    if (repoPath) {
      loadStashes();
    }
  }, [repoPath]);

  const loadStashes = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await api.stashList(repoPath);
      setStashes(list);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStash = async () => {
    try {
      setLoading(true);
      setError('');
      
      await api.stashSave(repoPath, stashMessage || undefined, includeUntracked);
      
      setStashMessage('');
      setIncludeUntracked(false);
      setShowCreateDialog(false);
      await loadStashes();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleApplyStash = async (index: number) => {
    try {
      setLoading(true);
      setError('');
      await api.stashApply(repoPath, index);
      alert('Stash가 적용되었습니다');
    } catch (err: any) {
      setError(err.toString());
      alert(`Stash 적용 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePopStash = async (index: number) => {
    try {
      setLoading(true);
      setError('');
      await api.stashPop(repoPath, index);
      await loadStashes();
      alert('Stash가 적용되고 제거되었습니다');
    } catch (err: any) {
      setError(err.toString());
      alert(`Stash pop 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDropStash = async (index: number) => {
    if (!confirm('이 Stash를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.stashDrop(repoPath, index);
      await loadStashes();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (oid: string) => {
    // OID를 짧게 표시
    return oid.substring(0, 7);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Package size={20} />
            Stash 관리
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateDialog(true)}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 
                       disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Save size={14} />
              Stash 생성
            </button>
            <button
              onClick={loadStashes}
              disabled={loading}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 
                       rounded transition-colors"
              title="새로고침"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 
                         rounded transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          작업 중인 변경사항을 임시로 저장합니다
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stash List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && stashes.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : stashes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Package size={48} className="mx-auto mb-3 opacity-50" />
            <p>Stash가 없습니다</p>
            <p className="text-sm mt-1">변경사항을 임시로 저장하려면 "Stash 생성" 버튼을 클릭하세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stashes.map((stash) => (
              <div
                key={stash.index}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 
                         bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 
                         transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 
                                     text-xs font-mono rounded">
                        stash@{'{' + stash.index + '}'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {formatDate(stash.oid)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                      {stash.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => handleApplyStash(stash.index)}
                      disabled={loading}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 
                               rounded transition-colors disabled:opacity-50"
                      title="적용 (Apply)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handlePopStash(stash.index)}
                      disabled={loading}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 
                               rounded transition-colors disabled:opacity-50"
                      title="적용 & 제거 (Pop)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDropStash(stash.index)}
                      disabled={loading}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 
                               rounded transition-colors disabled:opacity-50"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Stash Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Stash 생성
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  설명 (선택사항):
                </label>
                <input
                  type="text"
                  value={stashMessage}
                  onChange={(e) => setStashMessage(e.target.value)}
                  placeholder="작업 중인 내용 설명"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUntracked}
                  onChange={(e) => setIncludeUntracked(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  추적되지 않은 파일 포함
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setStashMessage('');
                  setIncludeUntracked(false);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateStash}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                         disabled:opacity-50 transition-colors"
              >
                {loading ? '생성 중...' : 'Stash 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
