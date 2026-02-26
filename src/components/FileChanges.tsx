import { useState } from 'react';
import { FileText, FilePlus, FileX, Plus, Minus, ChevronDown, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react';
import type { FileStatus } from '../types/git';

interface FileChangesProps {
  files: FileStatus[];
  onRefresh: () => void;
  onStage: (path: string) => Promise<void>;
  onUnstage: (path: string) => Promise<void>;
  onStageAll: () => Promise<void>;
  onFileClick: (path: string, staged: boolean) => void;
  onCommit?: (message: string) => void;
}

export default function FileChanges({
  files,
  onRefresh,
  onStage,
  onUnstage,
  onStageAll,
  onFileClick,
  onCommit,
}: FileChangesProps) {
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [commitMsg, setCommitMsg] = useState('');
  const [isAmend, setIsAmend] = useState(false);

  const stagedFiles = files.filter(f => f.staged);
  const unstagedFiles = files.filter(f => !f.staged);

  const getStatusIcon = (status: string, staged: boolean) => {
    switch (status) {
      case 'modified':
        return <FileText size={13} className={staged ? 'text-green-400' : 'text-[#ffb74d]'} />;
      case 'untracked':
      case 'new file':
        return <FilePlus size={13} className={staged ? 'text-green-400' : 'text-[#64b5f6]'} />;
      case 'deleted':
        return <FileX size={13} className="text-[#e57373]" />;
      default:
        return <FileText size={13} className="text-[#888]" />;
    }
  };

  const getStatusDot = (status: string, staged: boolean) => {
    let color = '#888';
    if (staged) color = '#81c784';
    else if (status === 'modified') color = '#ffb74d';
    else if (status === 'untracked' || status === 'new file') color = '#64b5f6';
    else if (status === 'deleted') color = '#e57373';
    return <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />;
  };

  const handleStage = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await onStage(path); } catch {}
  };

  const handleUnstage = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await onUnstage(path); } catch {}
  };

  const handleCommit = () => {
    if (commitMsg.trim() && onCommit) {
      onCommit(commitMsg.trim());
      setCommitMsg('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Split: Unstaged (top) and Staged (bottom) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Unstaged section */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <button
            onClick={() => setUnstagedOpen(!unstagedOpen)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#252526] border-b border-[#3c3c3c] text-[12px] font-semibold text-[#ccc] hover:bg-[#2a2d2e] transition-colors flex-shrink-0"
          >
            {unstagedOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span>Unstaged</span>
            {unstagedFiles.length > 0 && (
              <span className="text-[10px] text-[#888] font-normal">({unstagedFiles.length})</span>
            )}
            <div className="flex-1" />
            {unstagedFiles.length > 0 && (
              <span
                onClick={(e) => { e.stopPropagation(); onStageAll(); }}
                className="text-[11px] text-[#64b5f6] hover:text-[#90caf9] font-medium cursor-pointer"
              >
                Stage All
              </span>
            )}
          </button>

          {unstagedOpen && (
            <div className="flex-1 overflow-y-auto">
              {unstagedFiles.length === 0 ? (
                <div className="text-[11px] text-[#555] text-center py-3">No unstaged changes</div>
              ) : (
                unstagedFiles.map((file, idx) => (
                  <div
                    key={`u-${idx}`}
                    onClick={() => onFileClick(file.path, false)}
                    className="group flex items-center gap-1.5 px-3 py-[3px] text-[12px] text-[#ccc] hover:bg-[#2a2d2e] cursor-pointer"
                  >
                    {getStatusDot(file.status, false)}
                    {getStatusIcon(file.status, false)}
                    <span className="truncate flex-1 font-mono text-[11px]" title={file.path}>{file.path}</span>
                    <button
                      onClick={(e) => handleStage(file.path, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#094771] transition-all flex-shrink-0"
                      title="Stage"
                    >
                      <ArrowDown size={12} className="text-green-400" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Staged section */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-t border-[#3c3c3c]">
          <button
            onClick={() => setStagedOpen(!stagedOpen)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#252526] border-b border-[#3c3c3c] text-[12px] font-semibold text-[#ccc] hover:bg-[#2a2d2e] transition-colors flex-shrink-0"
          >
            {stagedOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span>Staged</span>
            {stagedFiles.length > 0 && (
              <span className="text-[10px] text-[#888] font-normal">({stagedFiles.length})</span>
            )}
            <div className="flex-1" />
            {stagedFiles.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  stagedFiles.forEach(f => onUnstage(f.path));
                }}
                className="text-[11px] text-[#e57373] hover:text-[#ef9a9a] font-medium cursor-pointer"
              >
                Unstage All
              </span>
            )}
          </button>

          {stagedOpen && (
            <div className="flex-1 overflow-y-auto">
              {stagedFiles.length === 0 ? (
                <div className="text-[11px] text-[#555] text-center py-3">No staged changes</div>
              ) : (
                stagedFiles.map((file, idx) => (
                  <div
                    key={`s-${idx}`}
                    onClick={() => onFileClick(file.path, true)}
                    className="group flex items-center gap-1.5 px-3 py-[3px] text-[12px] text-[#ccc] hover:bg-[#2a2d2e] cursor-pointer"
                  >
                    {getStatusDot(file.status, true)}
                    {getStatusIcon(file.status, true)}
                    <span className="truncate flex-1 font-mono text-[11px]" title={file.path}>{file.path}</span>
                    <button
                      onClick={(e) => handleUnstage(file.path, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#094771] transition-all flex-shrink-0"
                      title="Unstage"
                    >
                      <ArrowUp size={12} className="text-[#e57373]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Commit message area (Fork-style) */}
      <div className="border-t border-[#3c3c3c] bg-[#252526] p-2 flex-shrink-0">
        <textarea
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          placeholder="Commit message..."
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-[12px] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4] resize-none"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleCommit();
            }
          }}
        />
        <div className="flex items-center justify-between mt-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-[#888] cursor-pointer">
            <input
              type="checkbox"
              checked={isAmend}
              onChange={(e) => setIsAmend(e.target.checked)}
              className="rounded"
            />
            Amend
          </label>
          <button
            onClick={handleCommit}
            disabled={!commitMsg.trim() || stagedFiles.length === 0}
            className={`px-3 py-1 text-[12px] font-medium rounded transition-colors ${
              commitMsg.trim() && stagedFiles.length > 0
                ? 'bg-[#0078d4] text-white hover:bg-[#1a8ad4]'
                : 'bg-[#333] text-[#555] cursor-not-allowed'
            }`}
          >
            Commit {stagedFiles.length > 0 ? `${stagedFiles.length} Files` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
