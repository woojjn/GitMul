import { useState, useEffect } from 'react';
import { GitBranch, Plus, ArrowLeftRight, Pencil, Trash2, Loader2, AlertCircle, X } from 'lucide-react';
import * as api from '../services/api';
import type { BranchInfo } from '../types/git';

interface BranchManagerProps {
  repoPath: string;
  onClose?: () => void;
}

export default function BranchManager({ repoPath, onClose }: BranchManagerProps) {
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
      try {
        const fileStatuses = await api.getRepositoryStatus(repoPath);
        const unstagedCount = fileStatuses.filter(f => !f.staged).length;
        const stagedCount = fileStatuses.filter(f => f.staged).length;
        if (unstagedCount > 0 || stagedCount > 0) {
          const parts: string[] = [];
          if (stagedCount > 0) parts.push(`스테이지됨: ${stagedCount}개`);
          if (unstagedCount > 0) parts.push(`미스테이지: ${unstagedCount}개`);
          if (!confirm(`커밋되지 않은 변경사항이 있습니다 (${parts.join(', ')}).\n브랜치를 전환하면 변경사항이 손실될 수 있습니다.\n계속하시겠습니까?`)) {
            return;
          }
        }
      } catch {
        // If status check fails, proceed with switch anyway
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
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#252526] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-semibold text-white flex items-center gap-2">
            <GitBranch size={16} className="text-[#888]" />
            브랜치 관리
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateDialog(true)}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={12} />
              새 브랜치
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-[#888] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {currentBranch && (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[#888]">현재:</span>
            <span className="px-2 py-0.5 bg-green-700/30 text-green-300 rounded font-mono text-[11px]">
              {currentBranch}
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-[#3a1e1e] border border-[#5a2d2d] rounded flex items-start gap-2">
          <AlertCircle size={14} className="text-[#e57373] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#e57373]">{error}</p>
        </div>
      )}

      {/* Branch List */}
      <div className="flex-1 overflow-y-auto">
        {loading && branches.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-[#0078d4]" />
          </div>
        ) : (
          <div className="py-1">
            {branches.map((branch) => (
              <div
                key={branch.name}
                className={`group flex items-center px-4 py-1.5 text-[12px] cursor-default transition-colors ${
                  branch.is_current
                    ? 'bg-[#094771]/50 text-white'
                    : 'text-[#ccc] hover:bg-[#2a2d2e]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <GitBranch size={12} className={branch.is_current ? 'text-green-400 flex-shrink-0' : 'text-[#666] flex-shrink-0'} />
                    <span className="font-mono font-semibold text-[12px] truncate">
                      {branch.name}
                    </span>
                    {branch.is_current && (
                      <span className="px-1.5 py-0 text-[9px] bg-green-600 text-white rounded flex-shrink-0">
                        현재
                      </span>
                    )}
                  </div>
                  <div className="ml-5">
                    <p className="text-[11px] text-[#888] truncate">
                      {branch.commit_message}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#666]">
                      <span className="font-mono">{branch.commit_sha}</span>
                      <span>•</span>
                      <span>{branch.author}</span>
                      <span>•</span>
                      <span>{formatTimestamp(branch.timestamp ?? 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!branch.is_current && (
                    <>
                      <button
                        onClick={() => handleSwitchBranch(branch.name)}
                        disabled={loading}
                        className="p-1.5 text-[#4fc1ff] hover:bg-[#094771] rounded transition-colors disabled:opacity-50"
                        title="전환"
                      >
                        <ArrowLeftRight size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBranch(branch.name);
                          setRenameBranchName(branch.name);
                          setShowRenameDialog(true);
                        }}
                        disabled={loading}
                        className="p-1.5 text-[#888] hover:text-[#ccc] hover:bg-[#3c3c3c] rounded transition-colors disabled:opacity-50"
                        title="이름 변경"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(branch.name)}
                        disabled={loading}
                        className="p-1.5 text-[#e57373] hover:bg-[#3a1e1e] rounded transition-colors disabled:opacity-50"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Branch Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl p-5 w-full max-w-md">
            <h3 className="text-[14px] font-semibold mb-4 text-white">
              새 브랜치 생성
            </h3>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
              placeholder="브랜치 이름 (예: feature/new-feature)"
              className="w-full px-3 py-2 text-[13px] border border-[#3c3c3c] rounded bg-[#1e1e1e] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4]"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewBranchName('');
                  setError('');
                }}
                className="px-3 py-1.5 text-[13px] text-[#ccc] hover:bg-[#3c3c3c] rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateBranch}
                disabled={loading || !newBranchName.trim()}
                className="px-3 py-1.5 text-[13px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Branch Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl p-5 w-full max-w-md">
            <h3 className="text-[14px] font-semibold mb-4 text-white">
              브랜치 이름 변경
            </h3>
            <div className="mb-3">
              <label className="block text-[12px] text-[#888] mb-1">
                현재 이름:
              </label>
              <div className="px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded font-mono text-[13px] text-[#ccc]">
                {selectedBranch}
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-[#888] mb-1">
                새 이름:
              </label>
              <input
                type="text"
                value={renameBranchName}
                onChange={(e) => setRenameBranchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameBranch()}
                placeholder="새 브랜치 이름"
                className="w-full px-3 py-2 text-[13px] border border-[#3c3c3c] rounded bg-[#1e1e1e] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4]"
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
                className="px-3 py-1.5 text-[13px] text-[#ccc] hover:bg-[#3c3c3c] rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRenameBranch}
                disabled={loading || !renameBranchName.trim() || renameBranchName === selectedBranch}
                className="px-3 py-1.5 text-[13px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
