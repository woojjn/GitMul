import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import type { RecentRepo, RepositoryInfo, CommitInfo, FileStatus, BranchInfo } from '../types/git';
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
}

export function useRepository({ tabManager, onSuccess, onError }: UseRepositoryParams) {
  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);
  
  const { tabs, activeTabId, activeTab, addTab, switchTab, updateTabDataState } = tabManager;

  /**
   * Load list of recently opened repositories
   */
  const loadRecentRepos = async () => {
    try {
      const repos = await invoke<RecentRepo[]>('get_recent_repos');
      setRecentRepos(repos);
    } catch (error) {
      console.error('Failed to load recent repos:', error);
    }
  };

  /**
   * Open repository via file picker dialog
   */
  const openRepository = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '레포지토리 선택',
      });

      if (selected && typeof selected === 'string') {
        await openRepositoryPath(selected);
      }
    } catch (error) {
      onError(`레포지토리 열기 실패: ${error}`);
    }
  };

  /**
   * Open repository from a specific path
   * Creates new tab or switches to existing tab
   */
  const openRepositoryPath = async (path: string) => {
    try {
      const repoInfo = await invoke<RepositoryInfo>('open_repository', { path });
      
      // Add to recent repos
      try {
        await invoke('add_recent_repo', { path });
        await loadRecentRepos();
      } catch (err) {
        console.warn('Failed to add to recent repos:', err);
      }
      
      // Reuse existing tab if repository is already open
      const existingTab = tabs.find((t: any) => t.repoPath === path);
      if (existingTab) {
        switchTab(existingTab.id);
        // Refresh existing tab data
        await loadRepositoryData(existingTab.id, path);
      } else {
        // Create new tab
        const newTab = addTab(path, repoInfo.name);
        if (newTab) {
          // Initialize tab with repository info
          updateTabDataState(newTab.id, { currentRepo: repoInfo });
          // Load full repository data
          await loadRepositoryData(newTab.id, path);
        }
      }

      onSuccess('레포지토리 열기 완료');
    } catch (error) {
      onError(`레포지토리 열기 실패: ${error}`);
    }
  };

  /**
   * Load all repository data for a tab
   * - Commits (last 100)
   * - File changes (staged/unstaged)
   * - Branches (local and remote)
   * Each loaded independently so partial failures don't block other data
   */
  const loadRepositoryData = async (tabId: string, repoPath: string) => {
    try {
      updateTabDataState(tabId, { loading: true });

      // Load all data in parallel with independent error handling
      const [commitsResult, changesResult, branchesResult] = await Promise.allSettled([
        invoke<CommitInfo[]>('get_commit_history', { repoPath, limit: 100 }),
        invoke<FileStatus[]>('get_repository_status', { repoPath }),
        invoke<BranchInfo[]>('list_branches', { repoPath }),
      ]);

      const commits = commitsResult.status === 'fulfilled' ? commitsResult.value : [];
      const changes = changesResult.status === 'fulfilled' ? changesResult.value : [];
      const branches = branchesResult.status === 'fulfilled' ? branchesResult.value : [];

      // Log any individual failures
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

  /**
   * Refresh current active tab's repository data
   */
  const refreshRepository = async () => {
    if (!activeTabId || !activeTab?.dataState.currentRepo) return;
    await loadRepositoryData(activeTabId, activeTab.dataState.currentRepo.path);
  };

  /**
   * Auto-load repository data for restored tabs (from localStorage)
   * Runs once after initial mount when tabs are available
   */
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (initialLoadRef.current || tabs.length === 0) return;
    
    // Find tabs that have a repoPath but no loaded data
    const tabsToLoad = tabs.filter(
      (t: any) => t.repoPath && !t.dataState.currentRepo
    );
    
    if (tabsToLoad.length === 0) {
      initialLoadRef.current = true;
      return;
    }
    
    initialLoadRef.current = true;
    
    const loadAll = async () => {
      for (const tab of tabsToLoad) {
        try {
          const repoInfo = await invoke<RepositoryInfo>('open_repository', { path: tab.repoPath });
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
    refreshRepository,
  };
}

export type RepositoryOperations = ReturnType<typeof useRepository>;
