import { X } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutHelp({ isOpen, onClose }: ShortcutHelpProps) {
  if (!isOpen) return null;

  const shortcuts: ShortcutItem[] = [
    { keys: ['Ctrl', 'O'], description: '레포지토리 열기' },
    { keys: ['Ctrl', 'R'], description: '새로고침' },
    { keys: ['Ctrl', 'K'], description: '커밋 다이얼로그' },
    { keys: ['Ctrl', 'Shift', 'A'], description: '전체 스테이징' },
    { keys: ['Ctrl', 'B'], description: '브랜치 관리' },
    { keys: ['Ctrl', 'M'], description: '원격 저장소' },
    { keys: ['Ctrl', 'G'], description: '커밋 그래프' },
    { keys: ['Ctrl', 'Shift', 'D'], description: '다크모드 전환' },
    { keys: ['Ctrl', 'F'], description: '검색 (예정)' },
    { keys: ['?'], description: '단축키 도움말' },
    { keys: ['Esc'], description: '다이얼로그 닫기' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="shortcut-help-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            ⌨️ 키보드 단축키
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex} className="inline-flex items-center gap-1">
                      <kbd className="px-3 py-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                        {key}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="text-gray-400 dark:text-gray-500 mx-1">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>Tip:</strong> macOS에서는 Ctrl 대신 Cmd (⌘) 키를 사용하세요.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
