import { useState, useCallback } from 'react';
import { X, GitBranch, FolderOpen, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import * as api from '../services/api';

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

interface CloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful clone; receives the cloned repo path */
  onCloned: (repoPath: string) => void;
}

type CloneState = 'idle' | 'cloning' | 'success' | 'error';

/* ================================================================== */
/* URL Validation & Repo Name Extraction                               */
/* ================================================================== */

const GIT_URL_PATTERNS = [
  /^https?:\/\/.+\.git$/i,
  /^https?:\/\/github\.com\/.+\/.+/i,
  /^https?:\/\/gitlab\.com\/.+\/.+/i,
  /^https?:\/\/bitbucket\.org\/.+\/.+/i,
  /^git@.+:.+\/.+\.git$/i,
  /^ssh:\/\/.+/i,
  /^https?:\/\/.+/i,        // any http(s) URL as fallback
  /^git:\/\/.+/i,
];

function isValidGitUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return GIT_URL_PATTERNS.some(p => p.test(trimmed));
}

function extractRepoName(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  // Remove .git suffix
  const withoutGit = trimmed.replace(/\.git$/i, '');
  // Get last path segment
  const parts = withoutGit.split(/[\/\\:]/);
  const name = parts[parts.length - 1];
  return name || 'cloned-repo';
}

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */

export default function CloneDialog({ isOpen, onClose, onCloned }: CloneDialogProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [targetDir, setTargetDir] = useState('');
  const [state, setState] = useState<CloneState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState('');

  const repoName = repoUrl.trim() ? extractRepoName(repoUrl) : '';
  const fullTargetPath = targetDir
    ? `${targetDir.replace(/[\/\\]+$/, '')}/${repoName}`
    : repoName
      ? `/home/user/projects/${repoName}`
      : '';

  const canClone = isValidGitUrl(repoUrl) && state !== 'cloning';

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await api.openDirectoryDialog('클론 위치 선택');
      if (selected && typeof selected === 'string') {
        setTargetDir(selected);
      }
    } catch (err) {
      console.warn('Directory dialog failed:', err);
    }
  }, []);

  const handleClone = useCallback(async () => {
    if (!canClone) return;

    setState('cloning');
    setErrorMsg('');
    setProgress('저장소 클론 중...');

    try {
      const result = await api.cloneRepository(repoUrl.trim(), fullTargetPath);
      setState('success');
      setProgress('클론 완료!');

      // Brief delay to show success state, then open the cloned repo
      setTimeout(() => {
        onCloned(result || fullTargetPath);
        handleReset();
        onClose();
      }, 600);
    } catch (err) {
      setState('error');
      setErrorMsg(String(err));
      setProgress('');
    }
  }, [canClone, repoUrl, fullTargetPath, onCloned, onClose]);

  const handleReset = useCallback(() => {
    setRepoUrl('');
    setTargetDir('');
    setState('idle');
    setErrorMsg('');
    setProgress('');
  }, []);

  const handleClose = useCallback(() => {
    if (state === 'cloning') return; // Don't close while cloning
    handleReset();
    onClose();
  }, [state, onClose, handleReset]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-[560px] mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clone-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#3c3c3c]">
          <h2
            id="clone-dialog-title"
            className="text-[14px] font-semibold text-white flex items-center gap-2"
          >
            <GitBranch size={16} className="text-[#0078d4]" />
            Clone Repository
          </h2>
          <button
            onClick={handleClose}
            disabled={state === 'cloning'}
            className="p-1 rounded hover:bg-[#3c3c3c] transition-colors text-[#888] hover:text-white disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Repository URL */}
          <div>
            <label className="block text-[12px] text-[#888] mb-1.5 font-medium">
              Repository URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => { setRepoUrl(e.target.value); setState('idle'); setErrorMsg(''); }}
                placeholder="https://github.com/user/repo.git"
                className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-[13px] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4] transition-colors font-mono"
                disabled={state === 'cloning'}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && canClone) handleClone(); }}
              />
            </div>
            {repoUrl.trim() && !isValidGitUrl(repoUrl) && (
              <p className="text-[11px] text-[#e57373] mt-1 flex items-center gap-1">
                <AlertCircle size={11} />
                유효한 Git URL을 입력하세요 (https, ssh, git 프로토콜)
              </p>
            )}
            {repoName && isValidGitUrl(repoUrl) && (
              <p className="text-[11px] text-[#73c991] mt-1">
                저장소 이름: <span className="font-mono font-medium">{repoName}</span>
              </p>
            )}
          </div>

          {/* Target Directory */}
          <div>
            <label className="block text-[12px] text-[#888] mb-1.5 font-medium">
              Clone to
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="/home/user/projects"
                className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-[13px] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4] transition-colors font-mono"
                disabled={state === 'cloning'}
              />
              <button
                onClick={handleBrowse}
                disabled={state === 'cloning'}
                className="px-3 py-2 bg-[#333] border border-[#3c3c3c] rounded text-[13px] text-[#ccc] hover:bg-[#3c3c3c] transition-colors flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                title="Browse..."
              >
                <FolderOpen size={14} />
                Browse
              </button>
            </div>
            {fullTargetPath && (
              <p className="text-[11px] text-[#888] mt-1 font-mono truncate" title={fullTargetPath}>
                → {fullTargetPath}
              </p>
            )}
          </div>

          {/* Progress / Error */}
          {state === 'cloning' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
              <Loader2 size={14} className="text-[#0078d4] animate-spin flex-shrink-0" />
              <span className="text-[12px] text-[#ccc]">{progress}</span>
            </div>
          )}

          {state === 'success' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1e3a1e] rounded border border-[#2d5a2d]">
              <GitBranch size={14} className="text-[#73c991] flex-shrink-0" />
              <span className="text-[12px] text-[#73c991]">{progress}</span>
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-start gap-2 px-3 py-2 bg-[#3a1e1e] rounded border border-[#5a2d2d]">
              <AlertCircle size={14} className="text-[#e57373] flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[12px] text-[#e57373] font-medium">클론 실패</span>
                <p className="text-[11px] text-[#e57373]/80 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Quick examples */}
          {state === 'idle' && !repoUrl.trim() && (
            <div className="text-[11px] text-[#555]">
              <span className="text-[#888] font-medium">예시:</span>
              <div className="mt-1 space-y-0.5">
                {[
                  'https://github.com/user/repo.git',
                  'git@github.com:user/repo.git',
                ].map(example => (
                  <button
                    key={example}
                    onClick={() => setRepoUrl(example)}
                    className="block font-mono text-[#555] hover:text-[#0078d4] transition-colors flex items-center gap-1"
                  >
                    <ExternalLink size={10} className="flex-shrink-0" />
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#3c3c3c]">
          <button
            onClick={handleClose}
            disabled={state === 'cloning'}
            className="px-4 py-1.5 text-[13px] text-[#ccc] hover:bg-[#3c3c3c] rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={!canClone}
            className={`px-4 py-1.5 text-[13px] font-medium rounded transition-colors flex items-center gap-1.5 ${
              canClone
                ? 'bg-[#0078d4] text-white hover:bg-[#1a8ad4]'
                : 'bg-[#333] text-[#555] cursor-not-allowed'
            }`}
          >
            {state === 'cloning' && <Loader2 size={13} className="animate-spin" />}
            Clone
          </button>
        </div>
      </div>
    </div>
  );
}
