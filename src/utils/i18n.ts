export type Language = 'ko' | 'en';

export const translations = {
  ko: {
    // Toolbar
    'toolbar.openRepo': '레포지토리 열기',
    'toolbar.branch': '브랜치',
    'toolbar.remote': '원격',
    'toolbar.graph': '그래프',
    'toolbar.commit': '커밋',
    'toolbar.darkMode': '다크 모드',
    'toolbar.lightMode': '라이트 모드',
    
    // File Changes
    'files.title': '변경 사항',
    'files.staged': 'Staged',
    'files.unstaged': 'Unstaged',
    'files.stageAll': '모두 추가',
    'files.refresh': '새로고침',
    'files.noChanges': '변경 사항 없음',
    'files.viewDiff': 'Diff 보기',
    'files.stage': 'Stage',
    'files.unstage': 'Unstage',
    
    // File Status
    'status.modified': '수정됨',
    'status.untracked': '추적 안 됨',
    'status.deleted': '삭제됨',
    'status.staged': 'Staged',
    
    // Commit
    'commit.title': '커밋 생성',
    'commit.message': '커밋 메시지',
    'commit.placeholder': '커밋 메시지를 입력하세요',
    'commit.tip': '명확하고 간결하게 작성하세요',
    'commit.stagedFiles': 'Staged 파일',
    'commit.convention': '커밋 메시지 컨벤션',
    'commit.cancel': '취소',
    'commit.create': '커밋 생성',
    
    // Branch
    'branch.title': '브랜치 관리',
    'branch.new': '새 브랜치',
    'branch.current': '활성 브랜치',
    'branch.switch': '전환',
    'branch.rename': '이름변경',
    'branch.delete': '삭제',
    'branch.create': '생성',
    
    // Remote
    'remote.title': '원격 저장소 관리',
    'remote.add': '원격 추가',
    'remote.fetch': 'Fetch',
    'remote.pull': 'Pull',
    'remote.push': 'Push',
    
    // Settings
    'settings.title': '접근성 설정',
    'settings.fontSize': '글자 크기',
    'settings.fontFamily': '글씨체',
    'settings.lineHeight': '줄 간격',
    'settings.language': '언어',
    'settings.highContrast': '고대비 모드',
    'settings.reducedMotion': '애니메이션 줄이기',
    'settings.reset': '초기화',
    'settings.close': '닫기',
    
    // Font Size
    'fontSize.small': '작게',
    'fontSize.normal': '보통',
    'fontSize.large': '크게',
    'fontSize.xlarge': '매우 크게',
    
    // Font Family
    'fontFamily.default': '기본',
    'fontFamily.gothic': '고딕',
    'fontFamily.serif': '명조',
    'fontFamily.mono': '모노스페이스',
    
    // Line Height
    'lineHeight.tight': '좁게',
    'lineHeight.normal': '보통',
    'lineHeight.relaxed': '넓게',
    'lineHeight.loose': '매우 넓게',
    
    // Toast
    'toast.success': '성공',
    'toast.error': '오류',
    'toast.info': '정보',
    'toast.warning': '경고',
    
    // Messages
    'message.repoOpenSuccess': '레포지토리를 열었습니다',
    'message.repoOpenFailed': '레포지토리 열기 실패',
    'message.commitSuccess': '커밋이 성공적으로 생성되었습니다!',
    'message.commitFailed': '커밋 생성 실패',
    'message.stageAllSuccess': '모든 변경 사항이 스테이징되었습니다.',
    'message.stageAllFailed': '전체 스테이징 실패',
    'message.refreshed': '변경 사항을 다시 불러왔습니다.',
    
    // Shortcuts
    'shortcuts.title': '키보드 단축키',
    'shortcuts.openRepo': '레포지토리 열기',
    'shortcuts.refresh': '새로고침',
    'shortcuts.commit': '커밋 다이얼로그',
    'shortcuts.stageAll': '전체 스테이징',
    'shortcuts.branchManager': '브랜치 관리',
    'shortcuts.remoteManager': '원격 저장소',
    'shortcuts.commitGraph': '커밋 그래프',
    'shortcuts.darkMode': '다크모드 전환',
    'shortcuts.settings': '설정',
    'shortcuts.help': '단축키 도움말',
    'shortcuts.closeDialog': '다이얼로그 닫기',
    'shortcuts.tip': 'macOS에서는 Ctrl 대신 Cmd (⌘) 키를 사용하세요.',
  },
  en: {
    // Toolbar
    'toolbar.openRepo': 'Open Repository',
    'toolbar.branch': 'Branch',
    'toolbar.remote': 'Remote',
    'toolbar.graph': 'Graph',
    'toolbar.commit': 'Commit',
    'toolbar.darkMode': 'Dark Mode',
    'toolbar.lightMode': 'Light Mode',
    
    // File Changes
    'files.title': 'Changes',
    'files.staged': 'Staged',
    'files.unstaged': 'Unstaged',
    'files.stageAll': 'Stage All',
    'files.refresh': 'Refresh',
    'files.noChanges': 'No changes',
    'files.viewDiff': 'View Diff',
    'files.stage': 'Stage',
    'files.unstage': 'Unstage',
    
    // File Status
    'status.modified': 'Modified',
    'status.untracked': 'Untracked',
    'status.deleted': 'Deleted',
    'status.staged': 'Staged',
    
    // Commit
    'commit.title': 'Create Commit',
    'commit.message': 'Commit Message',
    'commit.placeholder': 'Enter commit message',
    'commit.tip': 'Be clear and concise',
    'commit.stagedFiles': 'Staged Files',
    'commit.convention': 'Commit Message Convention',
    'commit.cancel': 'Cancel',
    'commit.create': 'Create Commit',
    
    // Branch
    'branch.title': 'Branch Manager',
    'branch.new': 'New Branch',
    'branch.current': 'Current Branch',
    'branch.switch': 'Switch',
    'branch.rename': 'Rename',
    'branch.delete': 'Delete',
    'branch.create': 'Create',
    
    // Remote
    'remote.title': 'Remote Manager',
    'remote.add': 'Add Remote',
    'remote.fetch': 'Fetch',
    'remote.pull': 'Pull',
    'remote.push': 'Push',
    
    // Settings
    'settings.title': 'Accessibility Settings',
    'settings.fontSize': 'Font Size',
    'settings.fontFamily': 'Font Family',
    'settings.lineHeight': 'Line Height',
    'settings.language': 'Language',
    'settings.highContrast': 'High Contrast',
    'settings.reducedMotion': 'Reduced Motion',
    'settings.reset': 'Reset',
    'settings.close': 'Close',
    
    // Font Size
    'fontSize.small': 'Small',
    'fontSize.normal': 'Normal',
    'fontSize.large': 'Large',
    'fontSize.xlarge': 'Extra Large',
    
    // Font Family
    'fontFamily.default': 'Default',
    'fontFamily.gothic': 'Gothic',
    'fontFamily.serif': 'Serif',
    'fontFamily.mono': 'Monospace',
    
    // Line Height
    'lineHeight.tight': 'Tight',
    'lineHeight.normal': 'Normal',
    'lineHeight.relaxed': 'Relaxed',
    'lineHeight.loose': 'Loose',
    
    // Toast
    'toast.success': 'Success',
    'toast.error': 'Error',
    'toast.info': 'Info',
    'toast.warning': 'Warning',
    
    // Messages
    'message.repoOpenSuccess': 'Repository opened',
    'message.repoOpenFailed': 'Failed to open repository',
    'message.commitSuccess': 'Commit created successfully!',
    'message.commitFailed': 'Failed to create commit',
    'message.stageAllSuccess': 'All changes staged.',
    'message.stageAllFailed': 'Failed to stage all',
    'message.refreshed': 'Refreshed changes.',
    
    // Shortcuts
    'shortcuts.title': 'Keyboard Shortcuts',
    'shortcuts.openRepo': 'Open Repository',
    'shortcuts.refresh': 'Refresh',
    'shortcuts.commit': 'Commit Dialog',
    'shortcuts.stageAll': 'Stage All',
    'shortcuts.branchManager': 'Branch Manager',
    'shortcuts.remoteManager': 'Remote Manager',
    'shortcuts.commitGraph': 'Commit Graph',
    'shortcuts.darkMode': 'Toggle Dark Mode',
    'shortcuts.settings': 'Settings',
    'shortcuts.help': 'Shortcut Help',
    'shortcuts.closeDialog': 'Close Dialog',
    'shortcuts.tip': 'On macOS, use Cmd (⌘) instead of Ctrl.',
  },
};

export function translate(key: string, language: Language = 'ko'): string {
  return (translations[language] as any)[key] || key;
}

export function useTranslation(language: Language = 'ko') {
  return {
    t: (key: string) => translate(key, language),
    language,
  };
}
