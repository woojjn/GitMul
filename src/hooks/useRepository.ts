import { useState } from 'react';
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
      
      // Reuse existing tab if repository is already open
      const existingTab = tabs.find((t: any) => t.repoPath === path);
      if (existingTab) {
        switchTab(existingTab.id);
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
   */
  const loadRepositoryData = async (tabId: string, repoPath: string) => {
    try {
      updateTabDataState(tabId, { loading: true });

      // Load commits
      const commits = await invoke<CommitInfo[]>('get_commits', {
        repoPath,
        limit: 100,
      });

      // Load file changes
      const changes = await invoke<FileStatus[]>('get_file_changes', {
        repoPath,
      });

      // Load branches
      const branchNames = await invoke<string[]>('get_branches', { repoPath });
      const branches: BranchInfo[] = branchNames.map(name => ({
        name,
        is_current: false, // TODO: Backend should provide this info
        is_remote: name.startsWith('origin/'),
        commit_sha: '', // TODO: Backend should provide this
      }));

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

  return {
    recentRepos,
    loadRecentRepos,
    openRepository,
    openRepositoryPath,
    refreshRepository,
  };
}

export type RepositoryOperations = ReturnType<typeof useRepository>;
