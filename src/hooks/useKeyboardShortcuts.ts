import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        // Check if all modifiers match exactly
        const modifiersMatch =
          (shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey) &&
          (shortcut.shift ? event.shiftKey : !event.shiftKey) &&
          (shortcut.alt ? event.altKey : !event.altKey);

        if (keyMatch && modifiersMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Predefined common shortcuts
export const SHORTCUTS = {
  OPEN_REPO: { key: 'o', ctrl: true, description: '레포지토리 열기' },
  REFRESH: { key: 'r', ctrl: true, description: '새로고침' },
  COMMIT: { key: 'k', ctrl: true, description: '커밋 다이얼로그' },
  STAGE_ALL: { key: 'a', ctrl: true, shift: true, description: '전체 스테이징' },
  BRANCH_MANAGER: { key: 'b', ctrl: true, description: '브랜치 관리' },
  REMOTE_MANAGER: { key: 'm', ctrl: true, description: '원격 저장소' },
  COMMIT_GRAPH: { key: 'g', ctrl: true, description: '커밋 그래프' },
  TOGGLE_DARK: { key: 'd', ctrl: true, shift: true, description: '다크모드 전환' },
  SEARCH: { key: 'f', ctrl: true, description: '검색' },
  HELP: { key: '?', shift: true, description: '단축키 도움말' },
};
