import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { RemoteInfo, RemoteBranchInfo, SyncProgress } from '../types/git';
import { Cloud, CloudOff, Download, Upload, RefreshCw, Plus, Trash2, X, GitBranch, Loader2, AlertCircle } from 'lucide-react';

interface RemoteManagerProps {
  repoPath: string;
  currentBranch: string;
  onClose?: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function RemoteManager({ repoPath, currentBranch, onClose, onSuccess, onError: onErrorProp }: RemoteManagerProps) {
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string>('');
  const [remoteBranches, setRemoteBranches] = useState<RemoteBranchInfo[]>([]);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Add remote dialog
  const [showAddRemote, setShowAddRemote] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');

  useEffect(() => {
    loadRemotes();
  }, [repoPath]);

  useEffect(() => {
    if (selectedRemote) {
      loadRemoteBranches(selectedRemote);
    }
  }, [selectedRemote]);

  useEffect(() => {
    if (progress && progress.phase !== 'idle') {
      const interval = setInterval(async () => {
        try {
          const newProgress = await api.getSyncProgress(repoPath);
          setProgress(newProgress);
        } catch (err) {
          console.error('Failed to get progress:', err);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [progress]);

  const loadRemotes = async () => {
    try {
      setLoading(true);
      setError('');
      const remoteList = await api.listRemotes(repoPath);
      setRemotes(remoteList);
      if (remoteList.length > 0 && !selectedRemote) {
        setSelectedRemote(remoteList[0].name);
      }
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const loadRemoteBranches = async (remoteName: string) => {
    try {
      const branches = await api.getRemoteBranches(repoPath, remoteName);
      setRemoteBranches(branches);
    } catch (err: any) {
      console.error('Failed to load remote branches:', err);
    }
  };

  const handleAddRemote = async () => {
    if (!newRemoteName.trim() || !newRemoteUrl.trim()) {
      setError('리모트 이름과 URL을 입력해주세요');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.addRemote(repoPath, newRemoteName, newRemoteUrl);
      setNewRemoteName('');
      setNewRemoteUrl('');
      setShowAddRemote(false);
      await loadRemotes();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRemote = async (remoteName: string) => {
    if (!confirm(`리모트 '${remoteName}'을(를) 삭제하시겠습니까?`)) return;
    try {
      setLoading(true);
      setError('');
      await api.removeRemote(repoPath, remoteName);
      await loadRemotes();
      if (selectedRemote === remoteName) {
        setSelectedRemote(remotes.length > 1 ? remotes[0].name : '');
      }
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    if (!selectedRemote) return;
    try {
      setLoading(true);
      setError('');
      setProgress({ phase: 'fetching', current: 0, total: 0, bytes: 0, message: 'Fetching...' });
      const result = await api.fetchRemote(repoPath, selectedRemote);
      setProgress({ phase: 'idle', current: 0, total: 0, bytes: 0, message: result });
      await loadRemoteBranches(selectedRemote);
    } catch (err: any) {
      setError(err.toString());
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!selectedRemote) return;
    try {
      setLoading(true);
      setError('');
      setProgress({ phase: 'pulling', current: 0, total: 0, bytes: 0, message: 'Pulling...' });
      const result = await api.pullChanges(repoPath, selectedRemote, currentBranch);
      setProgress({ phase: 'idle', current: 0, total: 0, bytes: 0, message: result });
      onSuccess?.(result);
    } catch (err: any) {
      const msg = err.toString();
      setError(msg);
      onErrorProp?.(msg);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async (force: boolean = false) => {
    if (!selectedRemote) return;
    if (force && !confirm('Force push는 원격 히스토리를 덮어씁니다. 계속하시겠습니까?')) return;
    try {
      setLoading(true);
      setError('');
      setProgress({ phase: 'pushing', current: 0, total: 0, bytes: 0, message: 'Pushing...' });
      const result = await api.pushChanges(repoPath, selectedRemote, currentBranch, force);
      setProgress({ phase: 'idle', current: 0, total: 0, bytes: 0, message: result });
      onSuccess?.(result);
    } catch (err: any) {
      setError(err.toString());
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#252526] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-semibold text-white flex items-center gap-2">
            <Cloud size={16} className="text-[#888]" />
            원격 저장소 관리
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRemote(true)}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] disabled:opacity-50 transition-colors"
            >
              <Plus size={12} />
              리모트 추가
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1 text-[#888] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Remote selector */}
        {remotes.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedRemote}
              onChange={(e) => setSelectedRemote(e.target.value)}
              className="flex-1 px-2 py-1.5 text-[12px] border border-[#3c3c3c] rounded bg-[#1e1e1e] text-[#ccc] outline-none focus:border-[#0078d4] min-w-0"
            >
              {remotes.map((remote) => (
                <option key={remote.name} value={remote.name}>
                  {remote.name} ({remote.url.length > 50 ? remote.url.substring(0, 47) + '...' : remote.url})
                </option>
              ))}
            </select>
            <button
              onClick={() => handleRemoveRemote(selectedRemote)}
              disabled={loading}
              className="p-1.5 text-[#e57373] hover:bg-[#3a1e1e] rounded transition-colors disabled:opacity-50"
              title="리모트 삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-[#3a1e1e] border border-[#5a2d2d] rounded flex items-start gap-2">
          <AlertCircle size={14} className="text-[#e57373] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#e57373]">{error}</p>
        </div>
      )}

      {/* Progress */}
      {progress && progress.phase !== 'idle' && (
        <div className="mx-4 mt-3 p-3 bg-[#1e3a5f] border border-[#264f78] rounded">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 size={14} className="animate-spin text-[#4fc1ff]" />
            <span className="text-[12px] text-[#4fc1ff]">{progress.message}</span>
          </div>
          {progress.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#569cd6]">
                <span>{progress.current} / {progress.total} objects</span>
                <span>{formatBytes(progress.bytes)}</span>
              </div>
              <div className="w-full bg-[#333] rounded-full h-1.5">
                <div
                  className="bg-[#0078d4] h-1.5 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {remotes.length > 0 && (
        <div className="px-4 py-3 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFetch}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-[12px] bg-[#333] text-[#ccc] rounded hover:bg-[#444] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={13} />
              Fetch
            </button>
            <button
              onClick={handlePull}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-[12px] bg-[#1e3a1e] text-[#73c991] rounded hover:bg-[#2a4d2a] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Download size={13} />
              Pull
            </button>
            <button
              onClick={() => handlePush(false)}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-[12px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Upload size={13} />
              Push
            </button>
          </div>
          <button
            onClick={() => handlePush(true)}
            disabled={loading}
            className="w-full mt-1.5 px-3 py-1.5 text-[11px] bg-[#3a1e1e] text-[#e57373] rounded hover:bg-[#4a2828] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Upload size={12} />
            Force Push (주의!)
          </button>
        </div>
      )}

      {/* Remote Branches */}
      <div className="flex-1 overflow-y-auto py-1">
        {remotes.length === 0 ? (
          <div className="text-center text-[#555] py-8">
            <CloudOff size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-[13px]">리모트가 없습니다</p>
            <p className="text-[11px] mt-1 text-[#444]">"리모트 추가" 버튼을 클릭하여 원격 저장소를 추가하세요</p>
          </div>
        ) : loading && remoteBranches.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#0078d4]" />
          </div>
        ) : remoteBranches.length === 0 ? (
          <div className="text-center text-[#555] py-8">
            <Cloud size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-[13px]">리모트 브랜치가 없습니다</p>
            <p className="text-[11px] mt-1 text-[#444]">"Fetch"를 클릭하여 리모트 브랜치를 가져오세요</p>
          </div>
        ) : (
          <div>
            <div className="px-4 py-1.5 text-[11px] text-[#888] font-semibold uppercase tracking-wider">
              리모트 브랜치 ({remoteBranches.length})
            </div>
            {remoteBranches.map((branch) => (
              <div
                key={branch.full_name}
                className="group flex items-center px-4 py-1.5 text-[12px] text-[#ccc] hover:bg-[#2a2d2e] transition-colors"
              >
                <GitBranch size={12} className="text-[#666] mr-2 flex-shrink-0" />
                <span className="font-mono truncate flex-1">{branch.name}</span>
                {branch.is_head && (
                  <span className="px-1.5 py-0 text-[9px] bg-green-600 text-white rounded flex-shrink-0 mx-1">HEAD</span>
                )}
                <span className="text-[10px] text-[#666] font-mono ml-2 flex-shrink-0">{branch.commit_sha}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Remote Dialog */}
      {showAddRemote && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl p-5 w-full max-w-md">
            <h3 className="text-[14px] font-semibold mb-4 text-white">리모트 추가</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] text-[#888] mb-1">이름:</label>
                <input
                  type="text"
                  value={newRemoteName}
                  onChange={(e) => setNewRemoteName(e.target.value)}
                  placeholder="origin"
                  className="w-full px-3 py-2 text-[13px] border border-[#3c3c3c] rounded bg-[#1e1e1e] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#888] mb-1">URL:</label>
                <input
                  type="text"
                  value={newRemoteUrl}
                  onChange={(e) => setNewRemoteUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full px-3 py-2 text-[13px] border border-[#3c3c3c] rounded bg-[#1e1e1e] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowAddRemote(false); setNewRemoteName(''); setNewRemoteUrl(''); setError(''); }}
                className="px-3 py-1.5 text-[13px] text-[#ccc] hover:bg-[#3c3c3c] rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddRemote}
                disabled={loading || !newRemoteName.trim() || !newRemoteUrl.trim()}
                className="px-3 py-1.5 text-[13px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
