import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api';
import type { RecentRepo } from '../types/git';
import type { TabManager } from './useTabManager';

/**
 * Repository Operations Hook
 *
 * Handles all repository-related operations:
 * - Loading recent repositories
 * - Opening repositories (via dialog or path)
 * - Loading repository data (commits, branches, file changes)
 * - Refreshing current repository
 */

interface UseRepositoryParams {
  tabManager: TabManager;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  getAllBranches?: () => boolean;
}

export function useRepository({ tabManager, onSuccess, onError, getAllBranches }: UseRepositoryParams) {
  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);

  const { tabs, activeTabId, activeTab, addTab, switchTab, updateTabDataState } = tabManager;

  /** Load list of recently opened repositories. */
  const loadRecentRepos = async () => {
    try {
      const repos = await api.getRecentRepos();
      setRecentRepos(repos);
    } catch (error) {
      console.error('Failed to load recent repos:', error);
    }
  };

  /** Open repository via file picker dialog. */
  const openRepository = async () => {
    try {
      const selected = await api.openDirectoryDialog();
      if (selected && typeof selected === 'string') {
        await openRepositoryPath(selected);
      }
    } catch (error) {
      onError(`레포지토리 열기 실패: ${error}`);
    }
  };

  /** Open repository from a specific path. */
  const openRepositoryPath = async (path: string) => {
    try {
      const repoInfo = await api.openRepository(path);

      // Add to recent repos
      try {
        await api.addRecentRepo(path);
        await loadRecentRepos();
      } catch (err) {
        console.warn('Failed to add to recent repos:', err);
      }

      // Reuse existing tab if repository is already open
      const existingTab = tabs.find((t) => t.repoPath === path);
      if (existingTab) {
        switchTab(existingTab.id);
        await loadRepositoryData(existingTab.id, path);
      } else {
        const newTab = addTab(path, repoInfo.name);
        if (newTab) {
          updateTabDataState(newTab.id, { currentRepo: repoInfo });
          await loadRepositoryData(newTab.id, path);
        }
      }

      onSuccess('레포지토리 열기 완료');
    } catch (error) {
      onError(`레포지토리 열기 실패: ${error}`);
    }
  };

  /**
   * Load all repository data for a tab.
   * Each loaded independently so partial failures don't block other data.
   */
  const loadRepositoryData = async (tabId: string, repoPath: string, commitLimit = 100, allBranches = true) => {
    try {
      updateTabDataState(tabId, { loading: true });

      const [commitsResult, changesResult, branchesResult] = await Promise.allSettled([
        api.getCommitHistory(repoPath, commitLimit, allBranches),
        api.getRepositoryStatus(repoPath),
        api.listBranches(repoPath),
      ]);

      const commits = commitsResult.status === 'fulfilled' ? commitsResult.value : [];
      const changes = changesResult.status === 'fulfilled' ? changesResult.value : [];
      const branches = branchesResult.status === 'fulfilled' ? branchesResult.value : [];

      if (commitsResult.status === 'rejected') {
        console.warn('Failed to load commits:', commitsResult.reason);
      }
      if (changesResult.status === 'rejected') {
        console.warn('Failed to load file changes:', changesResult.reason);
      }
      if (branchesResult.status === 'rejected') {
        console.warn('Failed to load branches:', branchesResult.reason);
      }

      updateTabDataState(tabId, {
        commits,
        fileChanges: changes,
        branches,
        loading: false,
      });
    } catch (error) {
      updateTabDataState(tabId, { loading: false });
      onError(`데이터 로드 실패: ${error}`);
    }
  };

  /** Clone a repository from a URL into targetPath, then open it. */
  const cloneRepository = async (url: string, targetPath: string) => {
    try {
      const clonedPath = await api.cloneRepository(url, targetPath);
      const openPath = clonedPath || targetPath;
      await openRepositoryPath(openPath);
      onSuccess('클론 완료');
    } catch (error) {
      onError(`클론 실패: ${error}`);
      throw error;
    }
  };

  /** Refresh current active tab's repository data. */
  const refreshRepository = async (commitLimit?: number) => {
    if (!activeTabId || !activeTab?.dataState.currentRepo) return;
    const allBr = getAllBranches ? getAllBranches() : true;
    await loadRepositoryData(activeTabId, activeTab.dataState.currentRepo.path, commitLimit, allBr);
  };

  /** Load additional commits (append to existing). */
  const loadMoreCommits = async (commitLimit: number, allBranches = false) => {
    if (!activeTabId || !activeTab?.dataState.currentRepo) return;
    const repoPath = activeTab.dataState.currentRepo.path;
    try {
      const commits = await api.getCommitHistory(repoPath, commitLimit, allBranches);
      updateTabDataState(activeTabId, { commits });
    } catch (error) {
      onError(`커밋 추가 로드 실패: ${error}`);
    }
  };

  // ── Auto-refresh: window focus + periodic polling ──────────────────

  const refreshingRef = useRef(false);

  const silentRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    const tabId = tabManager.activeTabId;
    const tab = tabManager.activeTab;
    if (!tabId || !tab?.dataState.currentRepo) return;

    refreshingRef.current = true;
    try {
      const repoPath = tab.dataState.currentRepo.path;
      const allBr = getAllBranches ? getAllBranches() : true;

      const [changesResult, branchesResult] = await Promise.allSettled([
        api.getRepositoryStatus(repoPath),
        api.listBranches(repoPath),
      ]);

      const newChanges = changesResult.status === 'fulfilled' ? changesResult.value : null;
      const newBranches = branchesResult.status === 'fulfilled' ? branchesResult.value : null;

      // Only update if data actually changed to avoid unnecessary re-renders
      const oldChanges = tab.dataState.fileChanges;
      const changesChanged = newChanges && JSON.stringify(newChanges) !== JSON.stringify(oldChanges);
      const branchesChanged = newBranches && JSON.stringify(newBranches) !== JSON.stringify(tab.dataState.branches);

      if (changesChanged || branchesChanged) {
        const update: Record<string, any> = {};
        if (changesChanged) update.fileChanges = newChanges;
        if (branchesChanged) update.branches = newBranches;
        updateTabDataState(tabId, update);

        // Also refresh commits if file changes changed (likely new commits)
        if (changesChanged) {
          try {
            const commits = await api.getCommitHistory(repoPath, 100, allBr);
            updateTabDataState(tabId, { commits });
          } catch {}
        }
      }
    } catch {
      // Silent failure — don't interrupt user
    } finally {
      refreshingRef.current = false;
    }
  }, [tabManager, getAllBranches, updateTabDataState]);

  // Refresh on window focus
  useEffect(() => {
    const onFocus = () => {
      silentRefresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [silentRefresh]);

  // Periodic polling (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hasFocus()) {
        silentRefresh();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [silentRefresh]);

  /**
   * Auto-load repository data for restored tabs (from localStorage).
   */
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (initialLoadRef.current || tabs.length === 0) return;

    const tabsToLoad = tabs.filter((t) => t.repoPath && !t.dataState.currentRepo);

    if (tabsToLoad.length === 0) {
      initialLoadRef.current = true;
      return;
    }

    initialLoadRef.current = true;

    const loadAll = async () => {
      for (const tab of tabsToLoad) {
        try {
          const repoInfo = await api.openRepository(tab.repoPath);
          updateTabDataState(tab.id, { currentRepo: repoInfo });
          await loadRepositoryData(tab.id, tab.repoPath);
        } catch (error) {
          console.warn(`Failed to restore tab "${tab.title}":`, error);
        }
      }
    };

    loadAll();
  }, [tabs]);

  return {
    recentRepos,
    loadRecentRepos,
    openRepository,
    openRepositoryPath,
    cloneRepository,
    refreshRepository,
    loadMoreCommits,
  };
}

export type RepositoryOperations = ReturnType<typeof useRepository>;
