import * as api from '../services/api';
import type { Tab } from '../types/tab';

/**
 * Git Operations Hook
 *
 * Handles staging/unstaging files and creating/amending commits.
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
  /** Stage a single file. */
  const stageFile = async (path: string) => {
    if (!activeTab?.dataState.currentRepo) return;
    try {
      await api.stageFile(activeTab.dataState.currentRepo.path, path);
      await refreshRepository();
    } catch (error) {
      onError(`파일 스테이징 실패: ${error}`);
    }
  };

  /** Unstage a single file. */
  const unstageFile = async (path: string) => {
    if (!activeTab?.dataState.currentRepo) return;
    try {
      await api.unstageFile(activeTab.dataState.currentRepo.path, path);
      await refreshRepository();
    } catch (error) {
      onError(`파일 언스테이징 실패: ${error}`);
    }
  };

  /** Stage multiple files in one batch (parallel API calls, single refresh). */
  const stageFiles = async (paths: string[]) => {
    if (!activeTab?.dataState.currentRepo || paths.length === 0) return;
    try {
      await api.stageFiles(activeTab.dataState.currentRepo.path, paths);
      await refreshRepository();
    } catch (error) {
      onError(`파일 스테이징 실패: ${error}`);
    }
  };

  /** Unstage multiple files in one batch (parallel API calls, single refresh). */
  const unstageFiles = async (paths: string[]) => {
    if (!activeTab?.dataState.currentRepo || paths.length === 0) return;
    try {
      await api.unstageFiles(activeTab.dataState.currentRepo.path, paths);
      await refreshRepository();
    } catch (error) {
      onError(`파일 언스테이징 실패: ${error}`);
    }
  };

  /** Stage all modified files. */
  const stageAll = async () => {
    if (!activeTab?.dataState.currentRepo) return;
    try {
      await api.stageAll(activeTab.dataState.currentRepo.path);
      await refreshRepository();
      onSuccess('모든 파일 스테이징 완료');
    } catch (error) {
      onError(`스테이징 실패: ${error}`);
    }
  };

  /** Create a new commit or amend the last commit. */
  const commit = async (message: string, amend = false) => {
    if (!activeTab?.dataState.currentRepo) return;
    try {
      if (amend) {
        await api.amendCommit(activeTab.dataState.currentRepo.path, message);
      } else {
        await api.createCommit(activeTab.dataState.currentRepo.path, message);
      }
      await refreshRepository();
      onSuccess(amend ? '커밋 수정 완료' : '커밋 생성 완료');
    } catch (error) {
      onError(`커밋 실패: ${error}`);
    }
  };

  return { stageFile, unstageFile, stageFiles, unstageFiles, stageAll, commit };
}

export type GitOperations = ReturnType<typeof useGitOperations>;
