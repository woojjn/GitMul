import { X, Type, AlignLeft, Globe, Eye, Zap, RotateCcw } from 'lucide-react';
import { useAccessibility } from '../hooks/useAccessibility';
import { useTranslation } from '../utils/i18n';
import type { FontSize, FontFamily, LineHeight, Language } from '../utils/accessibility';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccessibilitySettings({ isOpen, onClose }: AccessibilitySettingsProps) {
  const {
    settings,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setLanguage,
    toggleHighContrast,
    toggleReducedMotion,
    reset,
  } = useAccessibility();

  const { t } = useTranslation(settings.language);

  if (!isOpen) return null;

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: 'small', label: t('fontSize.small') },
    { value: 'normal', label: t('fontSize.normal') },
    { value: 'large', label: t('fontSize.large') },
    { value: 'xlarge', label: t('fontSize.xlarge') },
  ];

  const fontFamilies: { value: FontFamily; label: string }[] = [
    { value: 'default', label: t('fontFamily.default') },
    { value: 'gothic', label: t('fontFamily.gothic') },
    { value: 'serif', label: t('fontFamily.serif') },
    { value: 'mono', label: t('fontFamily.mono') },
  ];

  const lineHeights: { value: LineHeight; label: string }[] = [
    { value: 'tight', label: t('lineHeight.tight') },
    { value: 'normal', label: t('lineHeight.normal') },
    { value: 'relaxed', label: t('lineHeight.relaxed') },
    { value: 'loose', label: t('lineHeight.loose') },
  ];

  const languages: { value: Language; label: string }[] = [
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
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
        aria-labelledby="accessibility-settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="accessibility-settings-title"
            className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2"
          >
            <Eye size={24} />
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
            aria-label={t('settings.close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Font Size */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <Type size={18} />
              {t('settings.fontSize')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {fontSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setFontSize(size.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    settings.fontSize === size.value
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  aria-pressed={settings.fontSize === size.value}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <Type size={18} />
              {t('settings.fontFamily')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {fontFamilies.map((font) => (
                <button
                  key={font.value}
                  onClick={() => setFontFamily(font.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    settings.fontFamily === font.value
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  aria-pressed={settings.fontFamily === font.value}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <AlignLeft size={18} />
              {t('settings.lineHeight')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {lineHeights.map((height) => (
                <button
                  key={height.value}
                  onClick={() => setLineHeight(height.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    settings.lineHeight === height.value
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  aria-pressed={settings.lineHeight === height.value}
                >
                  {height.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <Globe size={18} />
              {t('settings.language')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    settings.language === lang.value
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  aria-pressed={settings.language === lang.value}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3">
            {/* High Contrast */}
            <button
              onClick={toggleHighContrast}
              className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                settings.highContrast
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
              }`}
              aria-pressed={settings.highContrast}
            >
              <div className="flex items-center gap-3">
                <Eye size={20} className="text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.highContrast')}
                </span>
              </div>
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.highContrast ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    settings.highContrast ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`}
                />
              </div>
            </button>

            {/* Reduced Motion */}
            <button
              onClick={toggleReducedMotion}
              className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                settings.reducedMotion
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
              }`}
              aria-pressed={settings.reducedMotion}
            >
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.reducedMotion')}
                </span>
              </div>
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.reducedMotion ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    settings.reducedMotion ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`}
                />
              </div>
            </button>
          </div>

          {/* Preview Text */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              {settings.language === 'ko'
                ? '미리보기: 이 텍스트는 현재 설정이 적용된 모습입니다.'
                : 'Preview: This text shows the current settings applied.'}
            </p>
            <code className="text-sm text-blue-600 dark:text-blue-400">
              {settings.language === 'ko' ? '코드 예시: console.log("안녕하세요");' : 'Code example: console.log("Hello");'}
            </code>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t('settings.reset')}
          >
            <RotateCcw size={18} />
            {t('settings.reset')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {t('settings.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
