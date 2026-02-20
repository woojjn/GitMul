import { useState, useCallback, useEffect } from 'react';
import type { Tab, SavedTab, TabUIState, TabDataState } from '../types/tab';
import { createNewTab, createInitialUIState, createInitialDataState } from '../types/tab';

const STORAGE_KEY = 'gitmul_tabs';
const ACTIVE_TAB_KEY = 'gitmul_active_tab';
const MAX_TABS = 10;

/**
 * Tab 관리 Hook
 */
export function useTabManager() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Load tabs from localStorage on mount
  useEffect(() => {
    const savedTabsStr = localStorage.getItem(STORAGE_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_TAB_KEY);

    if (savedTabsStr) {
      try {
        const savedTabs: SavedTab[] = JSON.parse(savedTabsStr);
        const restoredTabs = savedTabs.map(saved => ({
          ...saved,
          uiState: createInitialUIState(),
          dataState: createInitialDataState(),
        }));
        
        setTabs(restoredTabs);
        
        // Restore active tab
        if (savedActiveId && restoredTabs.find(t => t.id === savedActiveId)) {
          setActiveTabId(savedActiveId);
        } else if (restoredTabs.length > 0) {
          setActiveTabId(restoredTabs[0].id);
        }
      } catch (error) {
        console.error('Failed to restore tabs:', error);
      }
    }
  }, []);

  // Save tabs to localStorage when they change
  useEffect(() => {
    if (tabs.length > 0) {
      const tabsToSave: SavedTab[] = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        repoPath: tab.repoPath,
        lastActive: tab.lastActive,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabsToSave));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [tabs]);

  // Save active tab when it changes
  useEffect(() => {
    if (activeTabId) {
      localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
    } else {
      localStorage.removeItem(ACTIVE_TAB_KEY);
    }
  }, [activeTabId]);

  /**
   * Get current active tab
   */
  const activeTab = tabs.find(t => t.id === activeTabId) || null;

  /**
   * Add new tab
   */
  const addTab = useCallback((repoPath: string, title: string) => {
    if (tabs.length >= MAX_TABS) {
      console.warn(`Maximum ${MAX_TABS} tabs reached`);
      return null;
    }

    const newTab = createNewTab(repoPath, title);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    return newTab;
  }, [tabs.length]);

  /**
   * Close tab
   */
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      
      // If closing active tab, switch to another
      if (activeTabId === tabId && filtered.length > 0) {
        const tabIndex = prev.findIndex(t => t.id === tabId);
        // Switch to tab on the right, or left if it was the last tab
        const nextTab = filtered[Math.min(tabIndex, filtered.length - 1)];
        setActiveTabId(nextTab.id);
      } else if (filtered.length === 0) {
        setActiveTabId(null);
      }
      
      return filtered;
    });
  }, [activeTabId]);

  /**
   * Switch to tab
   */
  const switchTab = useCallback((tabId: string) => {
    if (tabs.find(t => t.id === tabId)) {
      setActiveTabId(tabId);
      // Update lastActive
      setTabs(prev => prev.map(tab => 
        tab.id === tabId ? { ...tab, lastActive: Date.now() } : tab
      ));
    }
  }, [tabs]);

  /**
   * Update tab UI state
   */
  const updateTabUIState = useCallback((tabId: string, updates: Partial<TabUIState>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, uiState: { ...tab.uiState, ...updates } }
        : tab
    ));
  }, []);

  /**
   * Update tab data state
   */
  const updateTabDataState = useCallback((tabId: string, updates: Partial<TabDataState>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, dataState: { ...tab.dataState, ...updates } }
        : tab
    ));
  }, []);

  /**
   * Update tab title
   */
  const updateTabTitle = useCallback((tabId: string, title: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, title } : tab
    ));
  }, []);

  /**
   * Close all tabs
   */
  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  /**
   * Switch to next tab (Ctrl+Tab)
   */
  const switchToNextTab = useCallback(() => {
    if (tabs.length <= 1) return;
    
    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTabId(tabs[nextIndex].id);
  }, [tabs, activeTabId]);

  /**
   * Switch to previous tab (Ctrl+Shift+Tab)
   */
  const switchToPrevTab = useCallback(() => {
    if (tabs.length <= 1) return;
    
    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    setActiveTabId(tabs[prevIndex].id);
  }, [tabs, activeTabId]);

  return {
    tabs,
    activeTabId,
    activeTab,
    addTab,
    closeTab,
    switchTab,
    updateTabUIState,
    updateTabDataState,
    updateTabTitle,
    closeAllTabs,
    switchToNextTab,
    switchToPrevTab,
  };
}

export type TabManager = ReturnType<typeof useTabManager>;
