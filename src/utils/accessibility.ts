export type FontSize = 'small' | 'normal' | 'large' | 'xlarge';
export type FontFamily = 'default' | 'gothic' | 'serif' | 'mono';
export type LineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';
export type Language = 'ko' | 'en';

export interface AccessibilitySettings {
  fontSize: FontSize;
  fontFamily: FontFamily;
  lineHeight: LineHeight;
  language: Language;
  highContrast: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  fontSize: 'normal',
  fontFamily: 'default',
  lineHeight: 'normal',
  language: 'ko',
  highContrast: false,
  reducedMotion: false,
};

const STORAGE_KEY = 'gitflow-accessibility-settings';

export function getAccessibilitySettings(): AccessibilitySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load accessibility settings:', error);
  }
  return DEFAULT_ACCESSIBILITY_SETTINGS;
}

export function saveAccessibilitySettings(settings: AccessibilitySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save accessibility settings:', error);
  }
}

export function applyAccessibilitySettings(settings: AccessibilitySettings): void {
  const root = document.documentElement;

  // Font size
  const fontSizeMap: Record<FontSize, string> = {
    small: '14px',
    normal: '16px',
    large: '18px',
    xlarge: '20px',
  };
  root.style.fontSize = fontSizeMap[settings.fontSize];

  // Font family
  const fontFamilyMap: Record<FontFamily, string> = {
    default: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", "Pretendard", sans-serif',
    gothic: '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
    serif: '"Noto Serif KR", "Batang", Georgia, serif',
    mono: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif', // Keep default for UI
  };
  
  const monoFontFamily = '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace';
  
  // Apply font family
  if (settings.fontFamily === 'mono') {
    // For mono: keep UI with default font, only set mono for code elements
    root.style.fontFamily = fontFamilyMap.default;
    root.style.setProperty('--font-mono', monoFontFamily);
  } else {
    root.style.fontFamily = fontFamilyMap[settings.fontFamily];
    root.style.setProperty('--font-mono', monoFontFamily);
  }

  // Line height - will be overridden for buttons/inputs by CSS
  const lineHeightMap: Record<LineHeight, string> = {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  };
  root.style.lineHeight = lineHeightMap[settings.lineHeight];

  // High contrast
  if (settings.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  // Reduced motion
  if (settings.reducedMotion) {
    root.classList.add('reduced-motion');
  } else {
    root.classList.remove('reduced-motion');
  }

  // Language
  root.setAttribute('lang', settings.language);
}
