import { FolderOpen, GitBranch, Moon, Sun } from 'lucide-react';

interface WelcomeScreenProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenRepository: () => void;
}

/**
 * Welcome Screen Component
 * 
 * Shown when no tabs are open.
 * Provides a clean interface to open a repository.
 */
export default function WelcomeScreen({ 
  darkMode, 
  onToggleDarkMode, 
  onOpenRepository 
}: WelcomeScreenProps) {
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <GitBranch size={24} />
          GitFlow
        </h1>
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Welcome Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FolderOpen size={64} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-semibold mb-2">Welcome to GitFlow</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            레포지토리를 열어서 시작하세요
          </p>
          <button
            onClick={onOpenRepository}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            레포지토리 열기
          </button>
        </div>
      </div>
    </div>
  );
}
