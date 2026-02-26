import { useState, useRef, useEffect } from 'react';

interface MenuBarProps {
  hasRepo: boolean;
  onOpenRepo: () => void;
  onRefresh: () => void;
  onStageAll: () => void;
  onCommit: () => void;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onToggleBranchManager: () => void;
  onToggleMerge: () => void;
  onToggleStash: () => void;
  onToggleTag: () => void;
  onToggleRemote: () => void;
  onToggleReflog: () => void;
  onToggleBundle: () => void;
  onToggleShortcutHelp: () => void;
  onToggleAccessibility: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  recentRepos: { path: string; name: string }[];
  onOpenRepoPath: (path: string) => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
  checked?: boolean;
}

export default function MenuBar({
  hasRepo,
  onOpenRepo,
  onRefresh,
  onStageAll,
  onCommit,
  onFetch,
  onPull,
  onPush,
  onToggleBranchManager,
  onToggleMerge,
  onToggleStash,
  onToggleTag,
  onToggleRemote,
  onToggleReflog,
  onToggleBundle,
  onToggleShortcutHelp,
  onToggleAccessibility,
  darkMode,
  onToggleDarkMode,
  recentRepos,
  onOpenRepoPath,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: 'Open Repository...', shortcut: 'Ctrl+O', action: onOpenRepo },
      { label: 'Open Recent', submenu: recentRepos.length > 0
        ? recentRepos.map(r => ({ label: r.name, action: () => { onOpenRepoPath(r.path); setOpenMenu(null); } }))
        : [{ label: '(No recent repos)', disabled: true }]
      },
      { label: '', separator: true },
      { label: 'Refresh', shortcut: 'Ctrl+R', action: onRefresh, disabled: !hasRepo },
      { label: '', separator: true },
      { label: 'Keyboard Shortcuts...', shortcut: 'Ctrl+/', action: onToggleShortcutHelp },
      { label: 'Accessibility...', action: onToggleAccessibility },
    ],
    Repository: [
      { label: 'Fetch', shortcut: 'Ctrl+Shift+F', action: onFetch, disabled: !hasRepo },
      { label: 'Pull', shortcut: 'Ctrl+Shift+L', action: onPull, disabled: !hasRepo },
      { label: 'Push', shortcut: 'Ctrl+Shift+P', action: onPush, disabled: !hasRepo },
      { label: '', separator: true },
      { label: 'Stage All Changes', shortcut: 'Ctrl+Shift+A', action: onStageAll, disabled: !hasRepo },
      { label: 'Commit...', shortcut: 'Ctrl+K', action: onCommit, disabled: !hasRepo },
      { label: '', separator: true },
      { label: 'Stash...', action: onToggleStash, disabled: !hasRepo },
      { label: 'Reflog', action: onToggleReflog, disabled: !hasRepo },
      { label: 'Bundle...', action: onToggleBundle, disabled: !hasRepo },
    ],
    View: [
      { label: 'Branch Manager', shortcut: 'Ctrl+B', action: onToggleBranchManager, disabled: !hasRepo },
      { label: 'Remote Manager', shortcut: 'Ctrl+M', action: onToggleRemote, disabled: !hasRepo },
      { label: 'Tag Manager', action: onToggleTag, disabled: !hasRepo },
      { label: '', separator: true },
      { label: darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme', action: onToggleDarkMode },
    ],
    Branch: [
      { label: 'New Branch...', shortcut: 'Ctrl+B', action: onToggleBranchManager, disabled: !hasRepo },
      { label: 'Merge...', action: onToggleMerge, disabled: !hasRepo },
    ],
    Help: [
      { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', action: onToggleShortcutHelp },
      { label: 'About GitMul', action: () => alert('GitMul v0.1.0-beta\nA fast and friendly Git client') },
    ],
  };

  const handleMenuClick = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled || item.separator) return;
    item.action?.();
    setOpenMenu(null);
  };

  const renderMenu = (items: MenuItem[], depth = 0) => (
    <div
      className={`absolute ${depth > 0 ? 'left-full top-0 -mt-1' : 'top-full left-0'} z-[100] min-w-[240px] bg-[#252526] border border-[#3c3c3c] rounded shadow-xl py-1`}
    >
      {items.map((item, idx) => {
        if (item.separator) {
          return <div key={idx} className="h-px bg-[#3c3c3c] my-1 mx-2" />;
        }
        if (item.submenu) {
          return (
            <div key={idx} className="relative group">
              <div className="flex items-center justify-between px-4 py-1 text-[13px] text-[#cccccc] hover:bg-[#094771] cursor-default">
                <span>{item.label}</span>
                <span className="text-[10px] ml-6 text-[#888]">&#9656;</span>
              </div>
              <div className="hidden group-hover:block">
                {renderMenu(item.submenu, depth + 1)}
              </div>
            </div>
          );
        }
        return (
          <button
            key={idx}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className={`w-full flex items-center justify-between px-4 py-1 text-[13px] ${
              item.disabled
                ? 'text-[#555] cursor-default'
                : 'text-[#cccccc] hover:bg-[#094771]'
            }`}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[11px] text-[#888] ml-8">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={menuBarRef}
      className="flex items-center h-[30px] bg-[#1e1e1e] dark:bg-[#1e1e1e] border-b border-[#3c3c3c] select-none"
    >
      {Object.entries(menus).map(([menuName, items]) => (
        <div key={menuName} className="relative">
          <button
            onClick={() => handleMenuClick(menuName)}
            onMouseEnter={() => openMenu && setOpenMenu(menuName)}
            className={`px-3 h-[30px] text-[13px] ${
              openMenu === menuName
                ? 'bg-[#094771] text-white'
                : 'text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
          >
            {menuName}
          </button>
          {openMenu === menuName && renderMenu(items)}
        </div>
      ))}
    </div>
  );
}
