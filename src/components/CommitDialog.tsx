import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface CommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (message: string, amend: boolean) => void;
  stagedCount: number;
  repoPath: string;
}

export default function CommitDialog({ 
  isOpen, 
  onClose, 
  onCommit, 
  stagedCount,
  repoPath 
}: CommitDialogProps) {
  const [message, setMessage] = useState('');
  const [amend, setAmend] = useState(false);
  const [lastCommitMessage, setLastCommitMessage] = useState('');

  useEffect(() => {
    if (isOpen && repoPath) {
      // Load last commit message for amend
      invoke<string>('get_last_commit_message', { repoPath })
        .then(msg => setLastCommitMessage(msg))
        .catch(() => setLastCommitMessage(''));
    }
  }, [isOpen, repoPath]);

  useEffect(() => {
    if (amend && lastCommitMessage) {
      setMessage(lastCommitMessage);
    } else if (!amend) {
      setMessage('');
    }
  }, [amend, lastCommitMessage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onCommit(message, amend);
      setMessage('');
      setAmend(false);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commit-dialog-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 
            id="commit-dialog-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            {amend ? '커밋 수정 (Amend)' : '커밋 생성'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Amend Checkbox */}
        {lastCommitMessage && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={amend}
                onChange={(e) => setAmend(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  마지막 커밋 수정 (Amend)
                </span>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  마지막 커밋 메시지를 변경하거나 새로운 변경사항을 추가합니다
                </p>
              </div>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="commit-message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              커밋 메시지
              {stagedCount > 0 && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({stagedCount}개 파일)
                </span>
              )}
            </label>
            <textarea
              id="commit-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={amend ? "수정된 커밋 메시지를 입력하세요..." : "커밋 메시지를 입력하세요..."}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!message.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center gap-2"
            >
              {amend ? '커밋 수정' : '커밋'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
