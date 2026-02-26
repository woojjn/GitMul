import { FolderOpen, GitBranch, Moon, Sun, Clock, Download } from 'lucide-react';

interface WelcomeScreenProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenRepository: () => void;
  onCloneRepository: () => void;
  recentRepos?: { path: string; name: string }[];
  onOpenRepoPath?: (path: string) => void;
}

export default function WelcomeScreen({
  darkMode,
  onToggleDarkMode,
  onOpenRepository,
  onCloneRepository,
  recentRepos,
  onOpenRepoPath,
}: WelcomeScreenProps) {
  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-[#ccc]">
      {/* Menu bar */}
      <div className="flex items-center h-[30px] bg-[#1e1e1e] border-b border-[#3c3c3c] px-3 select-none">
        <span className="text-[13px] font-semibold text-white flex items-center gap-2">
          <GitBranch size={16} className="text-[#0078d4]" />
          GitMul
        </span>
        <div className="flex-1" />
        <button
          onClick={onToggleDarkMode}
          className="p-1 rounded hover:bg-[#2a2d2e] transition-colors"
          title="Toggle Theme"
        >
          {darkMode ? <Sun size={14} className="text-[#888]" /> : <Moon size={14} className="text-[#888]" />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-[400px]">
          <div className="w-16 h-16 rounded-full bg-[#252526] border border-[#3c3c3c] flex items-center justify-center mx-auto mb-6">
            <GitBranch size={32} className="text-[#0078d4]" />
          </div>
          <h2 className="text-[24px] font-semibold text-white mb-2">Welcome to GitMul</h2>
          <p className="text-[14px] text-[#888] mb-6">
            A fast and friendly Git client
          </p>
          <button
            onClick={onOpenRepository}
            className="px-6 py-2.5 bg-[#0078d4] text-white rounded text-[14px] font-medium hover:bg-[#1a8ad4] transition-colors"
          >
            Open Repository
          </button>
          <button
            onClick={onCloneRepository}
            className="ml-3 px-6 py-2.5 bg-[#333] text-white rounded text-[14px] font-medium hover:bg-[#444] border border-[#3c3c3c] transition-colors inline-flex items-center gap-2"
          >
            <Download size={15} />
            Clone Repository
          </button>

          {/* Recent repos */}
          {recentRepos && recentRepos.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-1.5 text-[11px] text-[#888] uppercase tracking-wider font-semibold mb-2">
                <Clock size={11} />
                Recent Repositories
              </div>
              <div className="space-y-1">
                {recentRepos.slice(0, 5).map(r => (
                  <button
                    key={r.path}
                    onClick={() => onOpenRepoPath?.(r.path)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#ccc] hover:bg-[#2a2d2e] rounded transition-colors"
                  >
                    <FolderOpen size={13} className="text-[#888] flex-shrink-0" />
                    <span className="truncate">{r.name}</span>
                    <span className="text-[10px] text-[#555] truncate flex-1 text-right">{r.path}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
