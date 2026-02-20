import { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';

// Components
import TabBar from './components/TabBar';
import Sidebar from './components/Sidebar';
import CommitHistory from './components/CommitHistory';
import FileChanges from './components/FileChanges';
import CommitDialog from './components/CommitDialog';
import BranchManager from './components/BranchManager';
import RemoteManager from './components/RemoteManager';
import CommitGraph from './components/CommitGraph';
import DiffViewer from './components/DiffViewer';
import ShortcutHelp from './components/ShortcutHelp';
import AccessibilitySettings from './components/AccessibilitySettings';
import StashManager from './components/StashManager';
import ConflictResolver from './components/ConflictResolver';
import TagManager from './components/TagManager';
import FileHistory from './components/FileHistory';
import ReflogViewer from './components/ReflogViewer';
import BundleManager from './components/BundleManager';
import MergeDialog from './components/MergeDialog';
import CherryPickDialog from './components/CherryPickDialog';
import RevertDialog from './components/RevertDialog';
import WelcomeScreen from './components/WelcomeScreen';
import Toolbar from './components/Toolbar';
import ToastContainer from './components/Toast';

// Hooks
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';
import { useTabManager } from './hooks/useTabManager';
import { useRepository } from './hooks/useRepository';
import { useGitOperations } from './hooks/useGitOperations';

// Types (RecentRepo used by Sidebar)

function App() {
  // Global UI State (not tab-specific)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('gitmul_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });

  // Tab Management
  const tabManager = useTabManager();
  const {
    tabs,
    activeTabId,
    activeTab,
    closeTab,
    switchTab,
    updateTabUIState,
    switchToNextTab,
    switchToPrevTab,
  } = tabManager;

  // Toast notifications
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  // Repository operations
  const { recentRepos, loadRecentRepos, openRepository, openRepositoryPath, refreshRepository } = useRepository({
    tabManager,
    onSuccess: showSuccess,
    onError: showError,
  });

  // Git operations
  const { stageFile, unstageFile, stageAll, commit } = useGitOperations({
    activeTab,
    refreshRepository,
    onSuccess: showSuccess,
    onError: showError,
  });

  // Load recent repos on mount
  useEffect(() => {
    loadRecentRepos();
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('gitmul_dark_mode', String(darkMode));
  }, [darkMode]);

  // Keyboard shortcuts (global + tab-specific)
  useKeyboardShortcuts([
    {
      key: 'o',
      ctrl: true,
      handler: () => openRepository(),
      description: '레포지토리 열기',
    },
    {
      key: 'r',
      ctrl: true,
      handler: () => {
        if (activeTab?.dataState.currentRepo) {
          refreshRepository();
          showSuccess('새로고침 완료');
        }
      },
      description: '새로고침',
    },
    {
      key: 'k',
      ctrl: true,
      handler: () => {
        const staged = activeTab?.dataState.fileChanges.filter(f => f.staged);
        if (staged && staged.length > 0) {
          updateTabUIState(activeTabId!, { commitDialogOpen: true });
        }
      },
      description: '커밋 다이얼로그',
    },
    {
      key: 'a',
      ctrl: true,
      shift: true,
      handler: () => {
        if (activeTab?.dataState.currentRepo) stageAll();
      },
      description: '전체 스테이징',
    },
    {
      key: 'b',
      ctrl: true,
      handler: () => {
        if (!activeTabId) return;
        updateTabUIState(activeTabId, {
          showBranchManager: !activeTab?.uiState.showBranchManager,
          showRemoteManager: false,
          showCommitGraph: false,
          showStashManager: false,
        });
      },
      description: '브랜치 관리',
    },
    {
      key: 'm',
      ctrl: true,
      handler: () => {
        if (!activeTabId) return;
        updateTabUIState(activeTabId, {
          showRemoteManager: !activeTab?.uiState.showRemoteManager,
          showBranchManager: false,
          showCommitGraph: false,
          showStashManager: false,
        });
      },
      description: '원격 저장소',
    },
    {
      key: 'Tab',
      ctrl: true,
      handler: () => {
        switchToNextTab();
      },
      description: '다음 탭',
    },
    {
      key: 'Tab',
      ctrl: true,
      shift: true,
      handler: () => {
        switchToPrevTab();
      },
      description: '이전 탭',
    },
    {
      key: 'w',
      ctrl: true,
      handler: () => {
        if (activeTabId) closeTab(activeTabId);
      },
      description: '탭 닫기',
    },
  ]);

  // If no tabs, show welcome screen
  if (tabs.length === 0) {
    return (
      <WelcomeScreen
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenRepository={openRepository}
      />
    );
  }

  // Current tab's state (shortcuts)
  const uiState = activeTab?.uiState;
  const dataState = activeTab?.dataState;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={switchTab}
        onTabClose={closeTab}
        onTabAdd={openRepository}
      />

      {/* Main Content (현재 활성 탭) */}
      {activeTab && dataState && (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            recentRepos={recentRepos}
            currentRepo={dataState.currentRepo}
            onSelectRepo={openRepositoryPath}
          />

          {/* Main area */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <Toolbar
              activeTabId={activeTabId!}
              uiState={uiState}
              hasRepo={!!dataState.currentRepo}
              darkMode={darkMode}
              onOpenRepo={openRepository}
              onRefresh={refreshRepository}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              onUpdateUIState={updateTabUIState}
            />

            {/* Content area */}
            <div className="flex-1 flex overflow-hidden">
              {dataState.currentRepo ? (
                (() => {
                  // Determine which panel to show (exclusive — first match wins)
                  if (uiState?.showBranchManager) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <BranchManager repoPath={dataState.currentRepo.path} />
                      </div>
                    );
                  }
                  if (uiState?.showCommitGraph) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <CommitGraph
                          repoPath={dataState.currentRepo.path}
                          commits={dataState.commits}
                        />
                      </div>
                    );
                  }
                  if (uiState?.showStashManager) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <StashManager
                          repoPath={dataState.currentRepo.path}
                          onClose={() => updateTabUIState(activeTabId!, { showStashManager: false })}
                        />
                      </div>
                    );
                  }
                  if (uiState?.showTagManager) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <TagManager repoPath={dataState.currentRepo.path} />
                      </div>
                    );
                  }
                  if (uiState?.showReflogViewer) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <ReflogViewer repoPath={dataState.currentRepo.path} />
                      </div>
                    );
                  }
                  if (uiState?.showRemoteManager) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <RemoteManager
                          repoPath={dataState.currentRepo.path}
                          currentBranch={dataState.currentRepo.current_branch}
                        />
                      </div>
                    );
                  }
                  if (uiState?.showConflictResolver) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <ConflictResolver
                          repoPath={dataState.currentRepo.path}
                          onClose={() => updateTabUIState(activeTabId!, { showConflictResolver: false })}
                          onResolved={refreshRepository}
                        />
                      </div>
                    );
                  }
                  if (uiState?.showBundleManager) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <BundleManager
                          repoPath={dataState.currentRepo.path}
                          onClose={() => updateTabUIState(activeTabId!, { showBundleManager: false })}
                          onSuccess={showSuccess}
                          onError={showError}
                        />
                      </div>
                    );
                  }
                  if (uiState?.fileHistoryPath) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <FileHistory
                          repoPath={dataState.currentRepo.path}
                          filePath={uiState.fileHistoryPath}
                          onClose={() => updateTabUIState(activeTabId!, { fileHistoryPath: null })}
                        />
                      </div>
                    );
                  }
                  if (uiState?.selectedFile) {
                    return (
                      <div className="flex-1 overflow-auto">
                        <DiffViewer
                          repoPath={dataState.currentRepo.path}
                          filePath={uiState.selectedFile.path}
                          staged={uiState.selectedFile.staged}
                          onClose={() => updateTabUIState(activeTabId!, { selectedFile: null })}
                        />
                      </div>
                    );
                  }
                  // Default: commit history + file changes
                  return (
                    <>
                      <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
                        <CommitHistory
                          commits={dataState.commits}
                          repoPath={dataState.currentRepo.path}
                          onRefresh={refreshRepository}
                          selectedCommitSha={uiState?.selectedCommitSha}
                          onSelectCommit={(sha) => {
                            updateTabUIState(activeTabId!, { selectedCommitSha: sha });
                          }}
                          onViewCommitFileDiff={(_commitSha, filePath) => {
                            // Open diff viewer for the file (working tree diff for now)
                            updateTabUIState(activeTabId!, { selectedFile: { path: filePath, staged: false } });
                          }}
                          onCherryPick={(sha, message) => {
                            updateTabUIState(activeTabId!, {
                              showCherryPickDialog: true,
                              cherryPickCommit: { sha, message },
                            });
                          }}
                          onRevert={(sha, message) => {
                            updateTabUIState(activeTabId!, {
                              showRevertDialog: true,
                              revertCommit: { sha, message },
                            });
                          }}
                        />
                      </div>
                      <div className="w-1/2 flex flex-col">
                        <FileChanges
                          files={dataState.fileChanges}
                          onStage={stageFile}
                          onUnstage={unstageFile}
                          onStageAll={stageAll}
                          onFileClick={(path, staged) =>
                            updateTabUIState(activeTabId!, { selectedFile: { path, staged } })
                          }
                          onRefresh={refreshRepository}
                        />
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <FolderOpen size={48} className="mx-auto mb-4" />
                    <p>레포지토리를 열어주세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs (Global) */}
      {uiState?.commitDialogOpen && dataState?.currentRepo && (
        <CommitDialog
          isOpen={uiState.commitDialogOpen}
          stagedCount={dataState.fileChanges.filter(f => f.staged).length}
          repoPath={dataState.currentRepo.path}
          onCommit={commit}
          onClose={() => updateTabUIState(activeTabId!, { commitDialogOpen: false })}
        />
      )}

      {uiState?.showMergeDialog && dataState?.currentRepo && (
        <MergeDialog
          repoPath={dataState.currentRepo.path}
          currentBranch={dataState.currentRepo.current_branch}
          branches={dataState.branches.map(b => b.name)}
          onClose={() => updateTabUIState(activeTabId!, { showMergeDialog: false })}
          onSuccess={refreshRepository}
          onConflict={() => {
            updateTabUIState(activeTabId!, {
              showConflictResolver: true,
              showMergeDialog: false,
            });
          }}
        />
      )}

      {uiState?.showCherryPickDialog && uiState.cherryPickCommit && dataState?.currentRepo && (
        <CherryPickDialog
          repoPath={dataState.currentRepo.path}
          commitSha={uiState.cherryPickCommit.sha}
          commitMessage={uiState.cherryPickCommit.message}
          onClose={() =>
            updateTabUIState(activeTabId!, {
              showCherryPickDialog: false,
              cherryPickCommit: null,
            })
          }
          onSuccess={() => {
            showSuccess('Cherry-pick 성공');
            refreshRepository();
          }}
          onConflict={() => {
            updateTabUIState(activeTabId!, {
              showConflictResolver: true,
              showCherryPickDialog: false,
              cherryPickCommit: null,
            });
          }}
        />
      )}

      {uiState?.showRevertDialog && uiState.revertCommit && dataState?.currentRepo && (
        <RevertDialog
          repoPath={dataState.currentRepo.path}
          commitSha={uiState.revertCommit.sha}
          commitMessage={uiState.revertCommit.message}
          onClose={() =>
            updateTabUIState(activeTabId!, {
              showRevertDialog: false,
              revertCommit: null,
            })
          }
          onSuccess={() => {
            showSuccess('Revert 성공');
            refreshRepository();
          }}
          onConflict={() => {
            updateTabUIState(activeTabId!, {
              showConflictResolver: true,
              showRevertDialog: false,
              revertCommit: null,
            });
          }}
        />
      )}

      <ShortcutHelp
        isOpen={uiState?.showShortcutHelp || false}
        onClose={() => updateTabUIState(activeTabId!, { showShortcutHelp: false })}
      />

      <AccessibilitySettings
        isOpen={uiState?.showAccessibilitySettings || false}
        onClose={() => updateTabUIState(activeTabId!, { showAccessibilitySettings: false })}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
