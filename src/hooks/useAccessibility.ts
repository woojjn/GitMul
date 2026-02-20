import { useState, useEffect } from 'react';
import {
  AccessibilitySettings,
  getAccessibilitySettings,
  saveAccessibilitySettings,
  applyAccessibilitySettings,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  FontSize,
  FontFamily,
  LineHeight,
  Language,
} from '../utils/accessibility';

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    getAccessibilitySettings()
  );

  useEffect(() => {
    // Apply settings on mount and when changed
    applyAccessibilitySettings(settings);
    saveAccessibilitySettings(settings);
  }, [settings]);

  const updateSettings = (partial: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const setFontSize = (fontSize: FontSize) => {
    updateSettings({ fontSize });
  };

  const setFontFamily = (fontFamily: FontFamily) => {
    updateSettings({ fontFamily });
  };

  const setLineHeight = (lineHeight: LineHeight) => {
    updateSettings({ lineHeight });
  };

  const setLanguage = (language: Language) => {
    updateSettings({ language });
  };

  const toggleHighContrast = () => {
    updateSettings({ highContrast: !settings.highContrast });
  };

  const toggleReducedMotion = () => {
    updateSettings({ reducedMotion: !settings.reducedMotion });
  };

  const reset = () => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
  };

  return {
    settings,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setLanguage,
    toggleHighContrast,
    toggleReducedMotion,
    reset,
  };
}
