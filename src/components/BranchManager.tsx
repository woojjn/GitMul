import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { BranchInfo, FileStatus } from '../types/git';

interface BranchManagerProps {
  repoPath: string;
}

export default function BranchManager({ repoPath }: BranchManagerProps) {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [renameBranchName, setRenameBranchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (repoPath) {
      loadBranches();
    }
  }, [repoPath]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError('');
      const [branchList, current] = await Promise.all([
        api.listBranches(repoPath),
        api.getCurrentBranch(repoPath),
      ]);
      setBranches(branchList);
      setCurrentBranch(current);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      setError('브랜치 이름을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.createBranch(repoPath, newBranchName);
      setNewBranchName('');
      setShowCreateDialog(false);
      await loadBranches();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    if (branchName === currentBranch) return;

    try {
      // Check for uncommitted changes before switching
      const fileStatuses = await api.getRepositoryStatus(repoPath);
      if (fileStatuses.length > 0) {
        const hasChanges = fileStatuses.some(f => f.staged || !f.staged);
        if (hasChanges && !confirm(`커밋되지 않은 변경사항이 ${fileStatuses.length}개 있습니다.\n브랜치를 전환하면 변경사항이 손실될 수 있습니다.\n계속하시겠습니까?`)) {
          return;
        }
      }

      setLoading(true);
      setError('');
      await api.switchBranch(repoPath, branchName);
      await loadBranches();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (branchName === currentBranch) {
      setError('현재 브랜치는 삭제할 수 없습니다');
      return;
    }

    if (!confirm(`브랜치 '${branchName}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.deleteBranch(repoPath, branchName);
      await loadBranches();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleRenameBranch = async () => {
    if (!renameBranchName.trim()) {
      setError('새 브랜치 이름을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.renameBranch(repoPath, selectedBranch, renameBranchName);
      setShowRenameDialog(false);
      setRenameBranchName('');
      setSelectedBranch('');
      await loadBranches();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 30) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            브랜치 관리
          </h2>
          <button
            onClick={() => setShowCreateDialog(true)}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            + 새 브랜치
          </button>
        </div>

        {currentBranch && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">현재:</span>
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded font-mono">
              {currentBranch}
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Branch List */}
      <div className="flex-1 overflow-y-auto">
        {loading && branches.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {branches.map((branch) => (
              <div
                key={branch.name}
                className={`p-3 rounded-lg border transition-all ${
                  branch.is_current
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 break-all">
                        {branch.name}
                      </span>
                      {branch.is_current && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-500 text-white rounded flex-shrink-0">
                          현재
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-words line-clamp-2">
                      {branch.commit_message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500 flex-wrap">
                      <span className="font-mono truncate max-w-[120px]">{branch.commit_sha}</span>
                      <span className="truncate max-w-[150px]">{branch.author}</span>
                      <span className="flex-shrink-0">{formatTimestamp(branch.timestamp ?? 0)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-3">
                    {!branch.is_current && (
                      <>
                        <button
                          onClick={() => handleSwitchBranch(branch.name)}
                          disabled={loading}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                          title="전환"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBranch(branch.name);
                            setRenameBranchName(branch.name);
                            setShowRenameDialog(true);
                          }}
                          disabled={loading}
                          className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                          title="이름 변경"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(branch.name)}
                          disabled={loading}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Branch Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              새 브랜치 생성
            </h3>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
              placeholder="브랜치 이름 (예: feature/new-feature, 기능/새기능)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewBranchName('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateBranch}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Branch Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              브랜치 이름 변경
            </h3>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                현재 이름:
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-gray-900 dark:text-gray-100">
                {selectedBranch}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                새 이름:
              </label>
              <input
                type="text"
                value={renameBranchName}
                onChange={(e) => setRenameBranchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameBranch()}
                placeholder="새 브랜치 이름"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRenameDialog(false);
                  setRenameBranchName('');
                  setSelectedBranch('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRenameBranch}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '변경 중...' : '변경'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
