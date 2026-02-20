import { useState } from 'react';
import * as api from '../services/api';
import type { RevertResult } from '../types/git';
import { X, Undo2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface RevertDialogProps {
  commitSha: string;
  commitMessage: string;
  repoPath: string;
  onClose: () => void;
  onSuccess: () => void;
  onConflict?: () => void;
}

export default function RevertDialog({
  commitSha,
  commitMessage,
  repoPath,
  onClose,
  onSuccess,
  onConflict
}: RevertDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RevertResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleRevert = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.revertCommit(repoPath, commitSha);

      setResult(res);

      if (res.success) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else if (res.conflicts.length > 0 && onConflict) {
        // 충돌 발생 - ConflictResolver로 전환
        setTimeout(() => {
          onConflict();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Undo2 size={24} className="text-orange-500" />
            Revert 커밋
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Commit Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xs font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                {commitSha.slice(0, 7)}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {commitMessage}
            </p>
          </div>

          {/* Description */}
          {!result && !error && (
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                이 커밋의 변경사항을 되돌리는 새로운 커밋을 생성합니다.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                <strong>주의:</strong> 기존 커밋을 삭제하지 않고 반대 변경을 수행하는 새 커밋을 만듭니다.
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-4 flex items-start gap-3 ${
              result.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}>
              {result.success ? (
                <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <p className={`text-sm font-medium ${
                  result.success
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {result.message}
                </p>
                {result.conflicts.length > 0 && (
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                    <p className="font-medium">충돌 파일:</p>
                    <ul className="list-disc list-inside pl-2 space-y-0.5">
                      {result.conflicts.map((file, idx) => (
                        <li key={idx} className="font-mono">{file}</li>
                      ))}
                    </ul>
                    <p className="mt-2">
                      충돌 해결 도구로 이동합니다...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Revert 실패
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            disabled={loading}
          >
            취소
          </button>
          <button
            onClick={handleRevert}
            disabled={loading || !!result}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Revert 중...' : 'Revert 실행'}
          </button>
        </div>
      </div>
    </div>
  );
}
