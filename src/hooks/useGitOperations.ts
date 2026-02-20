import { invoke } from '@tauri-apps/api/tauri';
import type { Tab } from '../types/tab';

/**
 * Git Operations Hook
 * 
 * Handles all git-related operations:
 * - Staging/unstaging files
 * - Creating/amending commits
 * 
 * All operations automatically refresh the repository after completion.
 */

interface UseGitOperationsParams {
  activeTab: Tab | null;
  refreshRepository: () => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function useGitOperations({
  activeTab,
  refreshRepository,
  onSuccess,
  onError,
}: UseGitOperationsParams) {
  
  /**
   * Stage a single file
   */
  const stageFile = async (path: string) => {
    if (!activeTab?.dataState.currentRepo) return;
    
    try {
      await invoke('stage_file', {
        repoPath: activeTab.dataState.currentRepo.path,
        path,
      });
      await refreshRepository();
    } catch (error) {
      onError(`파일 스테이징 실패: ${error}`);
    }
  };

  /**
   * Unstage a single file
   */
  const unstageFile = async (path: string) => {
    if (!activeTab?.dataState.currentRepo) return;
    
    try {
      await invoke('unstage_file', {
        repoPath: activeTab.dataState.currentRepo.path,
        path,
      });
      await refreshRepository();
    } catch (error) {
      onError(`파일 언스테이징 실패: ${error}`);
    }
  };

  /**
   * Stage all modified files
   */
  const stageAll = async () => {
    if (!activeTab?.dataState.currentRepo) return;
    
    try {
      await invoke('stage_all', {
        repoPath: activeTab.dataState.currentRepo.path,
      });
      await refreshRepository();
      onSuccess('모든 파일 스테이징 완료');
    } catch (error) {
      onError(`스테이징 실패: ${error}`);
    }
  };

  /**
   * Create a new commit or amend the last commit
   */
  const commit = async (message: string, amend: boolean = false) => {
    if (!activeTab?.dataState.currentRepo) return;
    
    try {
      if (amend) {
        await invoke('amend_commit', {
          repoPath: activeTab.dataState.currentRepo.path,
          message,
        });
      } else {
        await invoke('create_commit', {
          repoPath: activeTab.dataState.currentRepo.path,
          message,
        });
      }
      await refreshRepository();
      onSuccess(amend ? '커밋 수정 완료' : '커밋 생성 완료');
    } catch (error) {
      onError(`커밋 실패: ${error}`);
    }
  };

  return {
    stageFile,
    unstageFile,
    stageAll,
    commit,
  };
}

export type GitOperations = ReturnType<typeof useGitOperations>;
