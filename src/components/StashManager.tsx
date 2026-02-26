import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { StashInfo } from '../types/git';
import { Package, Save, Trash2, RefreshCw, X, Play, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

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
    if (repoPath) loadStashes();
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
    } catch (err: any) {
      setError(err.toString());
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
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDropStash = async (index: number) => {
    if (!confirm('이 Stash를 삭제하시겠습니까?')) return;
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

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#252526] flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold text-white flex items-center gap-2">
            <Package size={16} className="text-[#888]" />
            Stash 관리
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateDialog(true)}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] disabled:opacity-50 transition-colors"
            >
              <Save size={12} />
              Stash 생성
            </button>
            <button
              onClick={loadStashes}
              disabled={loading}
              className="p-1 text-[#888] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
              title="새로고침"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1 text-[#888] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-[#666]">작업 중인 변경사항을 임시로 저장합니다</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-[#3a1e1e] border border-[#5a2d2d] rounded flex items-start gap-2">
          <AlertCircle size={14} className="text-[#e57373] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#e57373]">{error}</p>
        </div>
      )}

      {/* Stash List */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading && stashes.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-[#0078d4]" />
          </div>
        ) : stashes.length === 0 ? (
          <div className="text-center py-8 text-[#555]">
            <Package size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-[13px]">Stash가 없습니다</p>
            <p className="text-[11px] mt-1 text-[#444]">"Stash 생성"을 클릭하여 변경사항을 저장하세요</p>
          </div>
        ) : (
          stashes.map((stash) => (
            <div
              key={stash.index}
              className="group flex items-start px-4 py-2.5 hover:bg-[#2a2d2e] transition-colors border-b border-[#2a2a2a] last:border-0"
            >
              <Package size={13} className="text-[#888] mt-0.5 mr-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-1.5 py-0 text-[10px] bg-[#1e3a5f] text-[#569cd6] rounded font-mono">
                    stash@{'{' + stash.index + '}'}
                  </span>
                  <span className="text-[10px] text-[#666] font-mono">
                    {stash.oid.substring(0, 7)}
                  </span>
                </div>
                <p className="text-[12px] text-[#ccc] truncate">{stash.message}</p>
              </div>
              <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleApplyStash(stash.index)}
                  disabled={loading}
                  className="p-1.5 text-[#73c991] hover:bg-[#1e3a1e] rounded transition-colors disabled:opacity-50"
                  title="적용 (Apply)"
                >
                  <Play size={13} />
                </button>
                <button
                  onClick={() => handlePopStash(stash.index)}
                  disabled={loading}
                  className="p-1.5 text-[#4fc1ff] hover:bg-[#094771] rounded transition-colors disabled:opacity-50"
                  title="적용 & 제거 (Pop)"
                >
                  <ArrowRight size={13} />
                </button>
                <button
                  onClick={() => handleDropStash(stash.index)}
                  disabled={loading}
                  className="p-1.5 text-[#e57373] hover:bg-[#3a1e1e] rounded transition-colors disabled:opacity-50"
                  title="삭제"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Stash Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl p-5 w-full max-w-md">
            <h3 className="text-[14px] font-semibold mb-4 text-white">Stash 생성</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] text-[#888] mb-1">설명 (선택사항):</label>
                <input
                  type="text"
                  value={stashMessage}
                  onChange={(e) => setStashMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateStash()}
                  placeholder="작업 중인 내용 설명"
                  className="w-full px-3 py-2 text-[13px] border border-[#3c3c3c] rounded bg-[#1e1e1e] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4]"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUntracked}
                  onChange={(e) => setIncludeUntracked(e.target.checked)}
                  className="rounded"
                />
                <span className="text-[12px] text-[#ccc]">추적되지 않은 파일 포함</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowCreateDialog(false); setStashMessage(''); setIncludeUntracked(false); }}
                className="px-3 py-1.5 text-[13px] text-[#ccc] hover:bg-[#3c3c3c] rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateStash}
                disabled={loading}
                className="px-3 py-1.5 text-[13px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] disabled:opacity-50 transition-colors"
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
