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

const STORAGE_KEY = 'gitmul-accessibility-settings';

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

/* ================================================================== */
/* Font size scaling approach                                          */
/*                                                                     */
/* The UI uses hardcoded Tailwind px values (text-[12px], text-[11px]) */
/* everywhere.  Changing all of them to rem would require touching     */
/* hundreds of lines across dozens of files.                           */
/*                                                                     */
/* Instead we use a CSS `zoom` property on #root so that ALL pixel     */
/* values — fonts, paddings, icons — scale proportionally.  This is    */
/* the same technique VS Code and many Electron apps use.              */
/*                                                                     */
/* `zoom` is widely supported (Chrome, Edge, Safari, Firefox 126+).   */
/* ================================================================== */

const FONT_SIZE_SCALE: Record<FontSize, number> = {
  small:  0.85,   // 85%
  normal: 1.0,    // 100%  (default — no change)
  large:  1.15,   // 115%
  xlarge: 1.30,   // 130%
};

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Pretendard, sans-serif',
  gothic:  '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
  serif:   '"Noto Serif KR", Batang, Georgia, "Times New Roman", serif',
  mono:    '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
};

const LINE_HEIGHT_MAP: Record<LineHeight, string> = {
  tight:   '1.25',
  normal:  '1.5',
  relaxed: '1.75',
  loose:   '2.0',
};

export function applyAccessibilitySettings(settings: AccessibilitySettings): void {
  const root = document.documentElement;
  const appRoot = document.getElementById('root');

  /* ---- Font size (zoom on #root) ---- */
  const scale = FONT_SIZE_SCALE[settings.fontSize];
  if (appRoot) {
    // Use CSS zoom for proportional scaling of all pixel values
    appRoot.style.zoom = String(scale);
  }
  // Also set a CSS variable so components can read the current scale if needed
  root.style.setProperty('--app-zoom', String(scale));

  /* ---- Font family ---- */
  // Set on both <html> and <body> to override any hardcoded body font-family
  const family = FONT_FAMILY_MAP[settings.fontFamily];
  root.style.setProperty('--app-font-family', family);
  root.style.fontFamily = family;
  document.body.style.fontFamily = family;

  // Mono font for code elements (always set, used via CSS var --font-mono)
  const monoFont = FONT_FAMILY_MAP.mono;
  root.style.setProperty('--font-mono', monoFont);

  // If the user chose 'mono', ALSO apply it to code/font-mono elements
  // but keep the UI font as mono too (full monospace experience)
  if (settings.fontFamily === 'mono') {
    root.style.setProperty('--font-mono', monoFont);
  }

  /* ---- Line height ---- */
  const lh = LINE_HEIGHT_MAP[settings.lineHeight];
  root.style.setProperty('--app-line-height', lh);
  root.style.lineHeight = lh;

  /* ---- High contrast ---- */
  root.classList.toggle('high-contrast', settings.highContrast);

  /* ---- Reduced motion ---- */
  root.classList.toggle('reduced-motion', settings.reducedMotion);

  /* ---- Language ---- */
  root.setAttribute('lang', settings.language);
}

/**
 * Apply saved settings on app startup.
 * Call this once from main.tsx or App.tsx before first render.
 */
export function initAccessibility(): void {
  applyAccessibilitySettings(getAccessibilitySettings());
}
