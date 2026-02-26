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

// Color palette for tab indicators (like Fork's colored dots)
const TAB_COLORS = [
  '#e57373', '#81c784', '#64b5f6', '#ffb74d', '#ba68c8',
  '#4dd0e1', '#ff8a65', '#aed581', '#f06292', '#7986cb',
];

function getTabColor(index: number) {
  return TAB_COLORS[index % TAB_COLORS.length];
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
      if (tab.id !== tabId) onTabClose(tab.id);
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
    <div className="flex items-center h-[32px] bg-[#2d2d2d] border-b border-[#3c3c3c] overflow-x-auto select-none">
      {/* Tabs */}
      <div className="flex flex-1 min-w-0">
        {tabs.map((tab, idx) => {
          const isActive = activeTabId === tab.id;
          const dotColor = getTabColor(idx);

          return (
            <div
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              className={`group flex items-center gap-2 px-3 h-[32px] min-w-[100px] max-w-[180px] cursor-pointer transition-colors border-r border-[#3c3c3c] ${
                isActive
                  ? 'bg-[#1e1e1e] text-white'
                  : 'bg-[#2d2d2d] text-[#888] hover:text-[#ccc] hover:bg-[#333]'
              }`}
            >
              {/* Colored dot indicator */}
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: dotColor }}
              />
              <span className="flex-1 truncate text-[12px]">
                {tab.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="flex-shrink-0 p-0.5 rounded hover:bg-[#555] opacity-0 group-hover:opacity-100 transition-opacity"
                title="Close Tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* New Tab button */}
      <button
        onClick={onTabAdd}
        disabled={tabs.length >= maxTabs}
        className={`flex items-center justify-center w-[32px] h-[32px] border-l border-[#3c3c3c] ${
          tabs.length >= maxTabs
            ? 'text-[#555] cursor-not-allowed'
            : 'text-[#888] hover:text-white hover:bg-[#333] cursor-pointer'
        }`}
        title={tabs.length >= maxTabs ? `Max ${maxTabs} tabs` : 'New Tab'}
      >
        <Plus size={14} />
      </button>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-[#252526] border border-[#3c3c3c] rounded shadow-xl py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => { onTabClose(contextMenu.tabId); setContextMenu(null); }}
            className="w-full px-4 py-1.5 text-left text-[13px] text-[#ccc] hover:bg-[#094771]"
          >
            Close Tab
          </button>
          <button
            onClick={() => handleCloseOthers(contextMenu.tabId)}
            disabled={tabs.length <= 1}
            className="w-full px-4 py-1.5 text-left text-[13px] text-[#ccc] hover:bg-[#094771] disabled:text-[#555] disabled:cursor-default"
          >
            Close Other Tabs
          </button>
          <button
            onClick={() => handleCloseRight(contextMenu.tabId)}
            disabled={tabs.findIndex(t => t.id === contextMenu.tabId) === tabs.length - 1}
            className="w-full px-4 py-1.5 text-left text-[13px] text-[#ccc] hover:bg-[#094771] disabled:text-[#555] disabled:cursor-default"
          >
            Close Tabs to the Right
          </button>
          <div className="h-px bg-[#3c3c3c] my-1 mx-2" />
          <button
            onClick={handleCloseAll}
            className="w-full px-4 py-1.5 text-left text-[13px] text-[#e57373] hover:bg-[#094771]"
          >
            Close All Tabs
          </button>
        </div>
      )}
    </div>
  );
}
