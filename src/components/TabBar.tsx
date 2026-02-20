import { useState, useRef, useEffect } from 'react';
import { X, Plus, FolderGit2 } from 'lucide-react';
import type { Tab } from '../types/tab';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  maxTabs?: number;
}

export default function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabAdd,
  maxTabs = 10,
}: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const handleCloseOthers = (tabId: string) => {
    tabs.forEach(tab => {
      if (tab.id !== tabId) {
        onTabClose(tab.id);
      }
    });
    setContextMenu(null);
  };

  const handleCloseAll = () => {
    tabs.forEach(tab => onTabClose(tab.id));
    setContextMenu(null);
  };

  const handleCloseRight = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    tabs.slice(tabIndex + 1).forEach(tab => onTabClose(tab.id));
    setContextMenu(null);
  };

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      {/* Tabs */}
      <div className="flex flex-1 min-w-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            className={`
              group flex items-center gap-2 px-4 py-2 min-w-[120px] max-w-[200px] 
              cursor-pointer transition-colors border-r border-gray-200 dark:border-gray-700
              ${
                activeTabId === tab.id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-750'
              }
            `}
          >
            <FolderGit2 size={16} className="flex-shrink-0" />
            <span className="flex-1 truncate text-sm font-medium">
              {tab.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title="닫기"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Tab Button */}
      <button
        onClick={onTabAdd}
        disabled={tabs.length >= maxTabs}
        className={`
          flex items-center gap-2 px-4 py-2 border-l border-gray-200 dark:border-gray-700
          ${
            tabs.length >= maxTabs
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-750 cursor-pointer'
          }
        `}
        title={tabs.length >= maxTabs ? `최대 ${maxTabs}개 탭` : '새 탭 추가'}
      >
        <Plus size={16} />
      </button>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              onTabClose(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            탭 닫기
          </button>
          <button
            onClick={() => handleCloseOthers(contextMenu.tabId)}
            disabled={tabs.length <= 1}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다른 탭 닫기
          </button>
          <button
            onClick={() => handleCloseRight(contextMenu.tabId)}
            disabled={tabs.findIndex(t => t.id === contextMenu.tabId) === tabs.length - 1}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            오른쪽 탭 닫기
          </button>
          <hr className="my-1 border-gray-200 dark:border-gray-700" />
          <button
            onClick={handleCloseAll}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            모든 탭 닫기
          </button>
        </div>
      )}
    </div>
  );
}
