import type { RecentRepo, RepositoryInfo } from '../types/git';
import { Folder, GitBranch } from 'lucide-react';

interface SidebarProps {
  recentRepos: RecentRepo[];
  currentRepo: RepositoryInfo | null;
  onSelectRepo: (path: string) => void;
}

export default function Sidebar({ recentRepos, currentRepo, onSelectRepo }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <GitBranch size={20} />
          GitFlow
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            최근 레포지토리
          </h3>
          
          {recentRepos.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              최근 레포지토리가 없습니다
            </p>
          ) : (
            <div className="space-y-1">
              {recentRepos.map((repo) => (
                <button
                  key={repo.path}
                  onClick={() => onSelectRepo(repo.path)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    currentRepo?.path === repo.path
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder size={16} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{repo.name}</div>
                      <div className="text-xs opacity-75 truncate">{repo.path}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
