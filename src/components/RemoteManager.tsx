import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Cloud, CloudOff, Download, Upload, RefreshCw, Plus, Trash2, Check, X } from 'lucide-react';

interface RemoteInfo {
  name: string;
  url: string;
  fetch_url: string;
  push_url: string;
}

interface RemoteBranchInfo {
  name: string;
  full_name: string;
  commit_sha: string;
  commit_message: string;
  is_head: boolean;
}

interface SyncProgress {
  phase: string;
  current: number;
  total: number;
  bytes: number;
  message: string;
}

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
    // Poll progress when syncing
    if (progress && progress.phase !== 'idle') {
      const interval = setInterval(async () => {
        try {
          const newProgress = await invoke<SyncProgress>('get_sync_progress', { repoPath });
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
      const remoteList = await invoke<RemoteInfo[]>('list_remotes', { repoPath });
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
      const branches = await invoke<RemoteBranchInfo[]>('get_remote_branches', {
        repoPath,
        remoteName,
      });
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
      await invoke('add_remote', {
        repoPath,
        name: newRemoteName,
        url: newRemoteUrl,
      });
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
    if (!confirm(`리모트 '${remoteName}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await invoke('remove_remote', { repoPath, name: remoteName });
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
      
      const result = await invoke<string>('fetch_remote', {
        repoPath,
        remoteName: selectedRemote,
      });
      
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
      
      const result = await invoke<string>('pull_changes', {
        repoPath,
        remoteName: selectedRemote,
        branchName: currentBranch,
      });
      
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

    if (force && !confirm('Force push는 원격 히스토리를 덮어씁니다. 계속하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setProgress({ phase: 'pushing', current: 0, total: 0, bytes: 0, message: 'Pushing...' });
      
      const result = await invoke<string>('push_changes', {
        repoPath,
        remoteName: selectedRemote,
        branchName: currentBranch,
        force,
      });
      
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
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            원격 저장소 관리
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRemote(true)}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Plus size={14} />
              리모트 추가
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X size={20} />
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
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-0"
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
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
              title="리모트 삭제"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Progress */}
      {progress && progress.phase !== 'idle' && (
        <div className="mx-4 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={16} className="animate-spin text-blue-600" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              {progress.message}
            </span>
          </div>
          {progress.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-blue-700 dark:text-blue-400">
                <span>{progress.current} / {progress.total} objects</span>
                <span>{formatBytes(progress.bytes)}</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {remotes.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={handleFetch}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Fetch
            </button>
            <button
              onClick={handlePull}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Pull
            </button>
            <button
              onClick={() => handlePush(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              Push
            </button>
          </div>
          <button
            onClick={() => handlePush(true)}
            disabled={loading}
            className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Upload size={14} />
            Force Push (주의!)
          </button>
        </div>
      )}

      {/* Remote Branches */}
      <div className="flex-1 overflow-y-auto p-4">
        {remotes.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <CloudOff size={48} className="mx-auto mb-3 opacity-50" />
            <p>리모트가 없습니다</p>
            <p className="text-sm mt-1">"리모트 추가" 버튼을 클릭하여 원격 저장소를 추가하세요</p>
          </div>
        ) : loading && remoteBranches.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : remoteBranches.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Cloud size={48} className="mx-auto mb-3 opacity-50" />
            <p>리모트 브랜치가 없습니다</p>
            <p className="text-sm mt-1">"Fetch" 버튼을 클릭하여 리모트 브랜치를 가져오세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              리모트 브랜치 ({remoteBranches.length})
            </h3>
            {remoteBranches.map((branch) => (
              <div
                key={branch.full_name}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 break-all">
                        {branch.name}
                      </span>
                      {branch.is_head && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-500 text-white rounded flex-shrink-0">
                          HEAD
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-words line-clamp-2">
                      {branch.commit_message}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-500 flex-wrap">
                      <span className="font-mono truncate max-w-[200px]">{branch.commit_sha}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Remote Dialog */}
      {showAddRemote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              리모트 추가
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  이름:
                </label>
                <input
                  type="text"
                  value={newRemoteName}
                  onChange={(e) => setNewRemoteName(e.target.value)}
                  placeholder="origin"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  URL:
                </label>
                <input
                  type="text"
                  value={newRemoteUrl}
                  onChange={(e) => setNewRemoteUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddRemote(false);
                  setNewRemoteName('');
                  setNewRemoteUrl('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddRemote}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
