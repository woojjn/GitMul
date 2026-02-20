import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { GitBranch, X, AlertTriangle, CheckCircle, GitMerge, Info } from 'lucide-react';

interface MergeDialogProps {
  repoPath: string;
  currentBranch: string;
  branches: string[];
  onClose: () => void;
  onSuccess: () => void;
  onConflict?: () => void;
}

const MergeDialog: React.FC<MergeDialogProps> = ({
  repoPath,
  currentBranch,
  branches,
  onClose,
  onSuccess,
  onConflict,
}) => {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleMerge = async () => {
    if (!selectedBranch) {
      setError('병합할 브랜치를 선택하세요');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Check if merge is possible
      const canMerge = await invoke<boolean>('can_merge', {
        repoPath,
        branch: selectedBranch,
      });

      if (!canMerge) {
        setError('이 브랜치는 현재 병합할 수 없습니다. 변경사항을 먼저 커밋하거나 Stash하세요.');
        setLoading(false);
        return;
      }

      // Perform merge
      const mergeResult = await invoke('merge_branch', {
        repoPath,
        branch: selectedBranch,
        fastForward: true,
      });

      setResult(mergeResult);
      
      if ((mergeResult as any).success) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else if ((mergeResult as any).conflicts && (mergeResult as any).conflicts.length > 0) {
        // Has conflicts - will show in UI, user can proceed to conflict resolver
        setTimeout(() => {
          if (onConflict) onConflict();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const availableBranches = branches.filter((b) => b !== currentBranch);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <GitMerge className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">브랜치 병합</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                다른 브랜치의 변경사항을 현재 브랜치에 통합
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {result ? (
            <div className="space-y-4">
              {result.success ? (
                <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100 text-lg">
                      병합 완료!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      {result.message}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                      자동으로 닫힙니다...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-orange-900 dark:text-orange-100 text-lg">
                        충돌 발생
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                        {result.conflicts.length}개 파일에서 충돌이 발생했습니다. 충돌 해결 도구가 자동으로 열립니다.
                      </p>
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      충돌 파일 목록:
                    </p>
                    {result.conflicts.map((file: string, idx: number) => (
                      <div
                        key={idx}
                        className="text-sm px-3 py-2 bg-white dark:bg-gray-800 rounded font-mono text-orange-700 dark:text-orange-400"
                      >
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Info Box */}
              <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">병합 정보</p>
                  <p>
                    선택한 브랜치의 변경사항을 <span className="font-semibold">{currentBranch}</span> 브랜치에 통합합니다.
                  </p>
                </div>
              </div>

              {/* Current Branch Display */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  현재 브랜치
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <GitBranch className="w-5 h-5 text-blue-500" />
                  <span className="font-mono font-semibold text-lg">{currentBranch}</span>
                </div>
              </div>

              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  병합할 브랜치 선택 <span className="text-red-500">*</span>
                </label>
                {availableBranches.length === 0 ? (
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500">
                    병합 가능한 다른 브랜치가 없습니다
                  </div>
                ) : (
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      setError('');
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    disabled={loading}
                  >
                    <option value="">-- 브랜치를 선택하세요 --</option>
                    {availableBranches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Preview */}
              {selectedBranch && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm text-purple-900 dark:text-purple-100">
                    <span className="font-mono font-semibold">{selectedBranch}</span>
                    <span className="mx-2">→</span>
                    <span className="font-mono font-semibold">{currentBranch}</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              onClick={handleMerge}
              disabled={loading || !selectedBranch || availableBranches.length === 0}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  병합 중...
                </>
              ) : (
                <>
                  <GitMerge className="w-4 h-4" />
                  병합 시작
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MergeDialog;
