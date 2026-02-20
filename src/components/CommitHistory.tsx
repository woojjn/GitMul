import { useState, useRef, useEffect } from 'react';
import { GitCommit, User, RefreshCw, GitBranch, Undo2, Copy } from 'lucide-react';
import type { CommitInfo } from '../types/git';

interface CommitHistoryProps {
  commits: CommitInfo[];
  onRefresh: () => void;
  onCherryPick?: (commitSha: string, commitMessage: string) => void;
  onRevert?: (commitSha: string, commitMessage: string) => void;
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  commit: CommitInfo | null;
}

export default function CommitHistory({ 
  commits, 
  onRefresh,
  onCherryPick,
  onRevert
}: CommitHistoryProps) {
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    commit: null
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, show: false }));
      }
    };

    if (contextMenu.show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.show]);

  const handleContextMenu = (e: React.MouseEvent, commit: CommitInfo) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      commit
    });
  };

  const handleCopysha = () => {
    if (contextMenu.commit) {
      navigator.clipboard.writeText(contextMenu.commit.sha);
      setContextMenu(prev => ({ ...prev, show: false }));
    }
  };

  const handleCherryPickClick = () => {
    if (contextMenu.commit && onCherryPick) {
      onCherryPick(contextMenu.commit.sha, contextMenu.commit.message);
      setContextMenu(prev => ({ ...prev, show: false }));
    }
  };

  const handleRevertClick = () => {
    if (contextMenu.commit && onRevert) {
      onRevert(contextMenu.commit.sha, contextMenu.commit.message);
      setContextMenu(prev => ({ ...prev, show: false }));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="min-h-[3rem] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <GitCommit size={18} />
          커밋 히스토리 ({commits.length})
        </h3>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="새로고침"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {commits.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            커밋이 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {commits.map((commit) => (
              <div
                key={commit.sha}
                onClick={() => setSelectedCommit(commit.sha)}
                onContextMenu={(e) => handleContextMenu(e, commit)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedCommit === commit.sha
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {commit.author.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {commit.sha.slice(0, 7)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {commit.date}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1 leading-relaxed">
                      {commit.message}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <User size={12} />
                      <span>{commit.author}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          ref={menuRef}
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
        >
          <button
            onClick={handleCopysha}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <Copy size={16} />
            SHA 복사
          </button>
          
          {onCherryPick && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={handleCherryPickClick}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600 dark:text-green-400"
              >
                <GitBranch size={16} />
                Cherry-pick
              </button>
            </>
          )}
          
          {onRevert && (
            <button
              onClick={handleRevertClick}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600 dark:text-orange-400"
            >
              <Undo2 size={16} />
              Revert
            </button>
          )}
        </div>
      )}
    </div>
  );
}
