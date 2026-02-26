import { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';

// Components
import MenuBar from './components/MenuBar';
import TabBar from './components/TabBar';
import ForkSidebar from './components/ForkSidebar';
import Toolbar from './components/Toolbar';
import CommitHistory from './components/CommitHistory';
import FileChanges from './components/FileChanges';
import CommitDetailPanel from './components/CommitDetailPanel';
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
import ToastContainer from './components/Toast';

// Hooks
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';
import { useTabManager } from './hooks/useTabManager';
import { useRepository } from './hooks/useRepository';
import { useGitOperations } from './hooks/useGitOperations';

// API
import * as api from './services/api';

function App() {
  // Global UI State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('gitmul_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });

  // Extra sidebar data
  const [tags, setTags] = useState<any[]>([]);
  const [remotes, setRemotes] = useState<any[]>([]);
  const [stashes, setStashes] = useState<any[]>([]);

  // Sidebar active view: 'commits' | 'changes'
  const [sidebarView, setSidebarView] = useState<'commits' | 'changes'>('commits');

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

  // Load sidebar data when repo changes
  useEffect(() => {
    const repoPath = activeTab?.dataState.currentRepo?.path;
    if (!repoPath) return;

    api.listTags(repoPath).then(setTags).catch(() => setTags([]));
    api.listRemotes(repoPath).then(setRemotes).catch(() => setRemotes([]));
    api.stashList(repoPath).then(setStashes).catch(() => setStashes([]));
  }, [activeTab?.dataState.currentRepo?.path]);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('gitmul_dark_mode', String(darkMode));
  }, [darkMode]);

  // Remote operations
  const handleFetch = async () => {
    if (!activeTab?.dataState.currentRepo) return;
    try {
      await api.fetchRemote(activeTab.dataState.currentRepo.path, 'origin');
      showSuccess('Fetch completed');
      refreshRepository();
    } catch (err) {
      showError(`Fetch failed: ${err}`);
    }
  };

  const handlePull = async () => {
    if (!activeTab?.dataState.currentRepo) return;
    try {
      await api.pullChanges(
        activeTab.dataState.currentRepo.path,
        'origin',
        activeTab.dataState.currentRepo.current_branch,
      );
      showSuccess('Pull completed');
      refreshRepository();
    } catch (err) {
      showError(`Pull failed: ${err}`);
    }
  };

  const handlePush = async () => {
    if (!activeTab?.dataState.currentRepo) return;
    try {
      await api.pushChanges(
        activeTab.dataState.currentRepo.path,
        'origin',
        activeTab.dataState.currentRepo.current_branch,
      );
      showSuccess('Push completed');
      refreshRepository();
    } catch (err) {
      showError(`Push failed: ${err}`);
    }
  };

  const handleOpenCommitDialog = () => {
    if (!activeTabId) return;
    const staged = activeTab?.dataState.fileChanges.filter(f => f.staged);
    if (staged && staged.length > 0) {
      updateTabUIState(activeTabId, { commitDialogOpen: true });
    } else {
      showError('No staged files to commit');
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'o', ctrl: true, handler: () => openRepository(), description: 'Open Repository' },
    {
      key: 'r', ctrl: true,
      handler: () => {
        if (activeTab?.dataState.currentRepo) {
          refreshRepository();
          showSuccess('Refreshed');
        }
      },
      description: 'Refresh',
    },
    { key: 'k', ctrl: true, handler: handleOpenCommitDialog, description: 'Commit' },
    {
      key: 'a', ctrl: true, shift: true,
      handler: () => { if (activeTab?.dataState.currentRepo) stageAll(); },
      description: 'Stage All',
    },
    {
      key: 'b', ctrl: true,
      handler: () => {
        if (!activeTabId) return;
        updateTabUIState(activeTabId, {
          showBranchManager: !activeTab?.uiState.showBranchManager,
          showRemoteManager: false, showStashManager: false, showTagManager: false,
          showReflogViewer: false, showBundleManager: false,
        });
      },
      description: 'Branch Manager',
    },
    {
      key: 'm', ctrl: true,
      handler: () => {
        if (!activeTabId) return;
        updateTabUIState(activeTabId, {
          showRemoteManager: !activeTab?.uiState.showRemoteManager,
          showBranchManager: false, showStashManager: false, showTagManager: false,
        });
      },
      description: 'Remote Manager',
    },
    { key: 'Tab', ctrl: true, handler: switchToNextTab, description: 'Next Tab' },
    { key: 'Tab', ctrl: true, shift: true, handler: switchToPrevTab, description: 'Prev Tab' },
    { key: 'w', ctrl: true, handler: () => { if (activeTabId) closeTab(activeTabId); }, description: 'Close Tab' },
  ]);

  // Welcome screen
  if (tabs.length === 0) {
    return (
      <>
        <WelcomeScreen
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onOpenRepository={openRepository}
          recentRepos={recentRepos}
          onOpenRepoPath={openRepositoryPath}
        />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  const uiState = activeTab?.uiState;
  const dataState = activeTab?.dataState;

  // Find selected commit object
  const selectedCommit = uiState?.selectedCommitSha
    ? dataState?.commits.find(c => c.sha === uiState.selectedCommitSha) ?? null
    : null;

  // Determine what's shown as overlay in the main content area
  const renderOverlayPanel = () => {
    if (!dataState?.currentRepo) return null;
    const repoPath = dataState.currentRepo.path;

    if (uiState?.showBranchManager) return <BranchManager repoPath={repoPath} />;
    if (uiState?.showCommitGraph) return <CommitGraph repoPath={repoPath} commits={dataState.commits} />;
    if (uiState?.showStashManager) return <StashManager repoPath={repoPath} onClose={() => updateTabUIState(activeTabId!, { showStashManager: false })} />;
    if (uiState?.showTagManager) return <TagManager repoPath={repoPath} />;
    if (uiState?.showReflogViewer) return <ReflogViewer repoPath={repoPath} />;
    if (uiState?.showRemoteManager) return <RemoteManager repoPath={repoPath} currentBranch={dataState.currentRepo.current_branch} />;
    if (uiState?.showConflictResolver) return <ConflictResolver repoPath={repoPath} onClose={() => updateTabUIState(activeTabId!, { showConflictResolver: false })} onResolved={refreshRepository} />;
    if (uiState?.showBundleManager) return <BundleManager repoPath={repoPath} onClose={() => updateTabUIState(activeTabId!, { showBundleManager: false })} onSuccess={showSuccess} onError={showError} />;
    if (uiState?.fileHistoryPath) return <FileHistory repoPath={repoPath} filePath={uiState.fileHistoryPath} onClose={() => updateTabUIState(activeTabId!, { fileHistoryPath: null })} />;
    // When in 'changes' view, selectedFile is handled by the master-detail layout (right pane),
    // not as a full-screen overlay. Only show overlay DiffViewer in 'commits' view.
    if (uiState?.selectedFile && sidebarView !== 'changes') return <DiffViewer repoPath={repoPath} filePath={uiState.selectedFile.path} staged={uiState.selectedFile.staged} onClose={() => updateTabUIState(activeTabId!, { selectedFile: null })} />;

    return null;
  };

  const overlayContent = renderOverlayPanel();

  // Changes view: Fork-style file changes + diff (left: file list, right: diff)
  const renderChangesView = () => {
    if (!dataState?.currentRepo) return null;

    return (
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File changes with commit area */}
        <div className="w-[280px] flex-shrink-0 border-r border-[#3c3c3c] flex flex-col">
          <FileChanges
            files={dataState.fileChanges}
            onStage={stageFile}
            onUnstage={unstageFile}
            onStageAll={stageAll}
            onFileClick={(path, staged) =>
              updateTabUIState(activeTabId!, { selectedFile: { path, staged } })
            }
            onRefresh={refreshRepository}
            onCommit={async (msg) => {
              await commit(msg);
            }}
          />
        </div>

        {/* Right: Diff viewer or placeholder */}
        <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
          {uiState?.selectedFile ? (
            <DiffViewer
              repoPath={dataState.currentRepo.path}
              filePath={uiState.selectedFile.path}
              staged={uiState.selectedFile.staged}
              onClose={() => updateTabUIState(activeTabId!, { selectedFile: null })}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[13px] text-[#555]">
              Select a file to view diff
            </div>
          )}
        </div>
      </div>
    );
  };

  // Commits view: Fork-style commit table + detail panel
  const renderCommitsView = () => {
    if (!dataState?.currentRepo) return null;

    return (
      <>
        {/* Top: Commit History table */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <CommitHistory
            commits={dataState.commits}
            repoPath={dataState.currentRepo.path}
            onRefresh={refreshRepository}
            selectedCommitSha={uiState?.selectedCommitSha}
            onSelectCommit={(sha) => {
              updateTabUIState(activeTabId!, { selectedCommitSha: sha });
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
            branches={dataState.branches}
            tags={tags}
          />
        </div>

        {/* Bottom: Detail panel (shows when commit selected) */}
        {selectedCommit && (
          <div className="h-[45%] min-h-[200px] flex-shrink-0 overflow-hidden">
            <CommitDetailPanel
              repoPath={dataState.currentRepo.path}
              commit={selectedCommit}
              onViewFileDiff={(filePath) => {
                updateTabUIState(activeTabId!, { selectedFile: { path: filePath, staged: false } });
              }}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-[#ccc]">
      {/* Menu Bar */}
      <MenuBar
        hasRepo={!!dataState?.currentRepo}
        onOpenRepo={openRepository}
        onRefresh={refreshRepository}
        onStageAll={stageAll}
        onCommit={handleOpenCommitDialog}
        onFetch={handleFetch}
        onPull={handlePull}
        onPush={handlePush}
        onToggleBranchManager={() => {
          if (activeTabId) updateTabUIState(activeTabId, {
            showBranchManager: !uiState?.showBranchManager,
            showRemoteManager: false, showStashManager: false, showTagManager: false,
          });
        }}
        onToggleMerge={() => {
          if (activeTabId) updateTabUIState(activeTabId, { showMergeDialog: true });
        }}
        onToggleStash={() => {
          if (activeTabId) updateTabUIState(activeTabId, {
            showStashManager: !uiState?.showStashManager,
            showBranchManager: false, showRemoteManager: false,
          });
        }}
        onToggleTag={() => {
          if (activeTabId) updateTabUIState(activeTabId, {
            showTagManager: !uiState?.showTagManager,
            showBranchManager: false, showRemoteManager: false,
          });
        }}
        onToggleRemote={() => {
          if (activeTabId) updateTabUIState(activeTabId, {
            showRemoteManager: !uiState?.showRemoteManager,
            showBranchManager: false, showStashManager: false,
          });
        }}
        onToggleReflog={() => {
          if (activeTabId) updateTabUIState(activeTabId, { showReflogViewer: !uiState?.showReflogViewer });
        }}
        onToggleBundle={() => {
          if (activeTabId) updateTabUIState(activeTabId, { showBundleManager: !uiState?.showBundleManager });
        }}
        onToggleShortcutHelp={() => {
          if (activeTabId) updateTabUIState(activeTabId, { showShortcutHelp: !uiState?.showShortcutHelp });
        }}
        onToggleAccessibility={() => {
          if (activeTabId) updateTabUIState(activeTabId, { showAccessibilitySettings: !uiState?.showAccessibilitySettings });
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        recentRepos={recentRepos}
        onOpenRepoPath={openRepositoryPath}
      />

      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={switchTab}
        onTabClose={closeTab}
        onTabAdd={openRepository}
      />

      {/* Toolbar */}
      {activeTab && dataState && (
        <Toolbar
          activeTabId={activeTabId!}
          uiState={uiState}
          hasRepo={!!dataState.currentRepo}
          repoName={dataState.currentRepo?.name}
          currentBranch={dataState.currentRepo?.current_branch}
          onRefresh={refreshRepository}
          onUpdateUIState={updateTabUIState}
          onFetch={handleFetch}
          onPull={handlePull}
          onPush={handlePush}
          onOpenIn={async () => {
            if (!dataState.currentRepo) return;
            try {
              await api.openInExplorer(dataState.currentRepo.path);
              showSuccess('Opened in file explorer');
            } catch (err) {
              showError(`Failed to open: ${err}`);
            }
          }}
          onConsole={async () => {
            if (!dataState.currentRepo) return;
            try {
              await api.openTerminal(dataState.currentRepo.path);
              showSuccess('Terminal opened');
            } catch (err) {
              showError(`Failed to open terminal: ${err}`);
            }
          }}
        />
      )}

      {/* Main Content: Sidebar + Content Area */}
      {activeTab && dataState && (
        <div className="flex-1 flex overflow-hidden">
          {/* Fork-style Sidebar */}
          <ForkSidebar
            branches={dataState.branches}
            tags={tags}
            remotes={remotes}
            stashes={stashes}
            fileChangeCount={dataState.fileChanges.length}
            recentRepos={recentRepos}
            currentRepoName={dataState.currentRepo?.name ?? null}
            currentBranch={dataState.currentRepo?.current_branch}
            onSelectRepo={openRepositoryPath}
            onSwitchBranch={async (branchName) => {
              if (!dataState.currentRepo) return;
              try {
                await api.switchBranch(dataState.currentRepo.path, branchName);
                showSuccess(`Switched to ${branchName}`);
                refreshRepository();
              } catch (err) {
                showError(`Failed to switch branch: ${err}`);
              }
            }}
            onShowChanges={() => {
              setSidebarView('changes');
              // Clear overlay panels
              if (activeTabId) updateTabUIState(activeTabId, {
                showBranchManager: false, showRemoteManager: false, showStashManager: false,
                showTagManager: false, showReflogViewer: false, showBundleManager: false,
                showConflictResolver: false, fileHistoryPath: null,
              });
            }}
            onShowAllCommits={() => {
              setSidebarView('commits');
              if (activeTabId) updateTabUIState(activeTabId, {
                showBranchManager: false, showRemoteManager: false, showStashManager: false,
                showTagManager: false, showReflogViewer: false, showBundleManager: false,
                showConflictResolver: false, fileHistoryPath: null, selectedFile: null,
              });
            }}
            onShowBranches={() => {
              if (activeTabId) updateTabUIState(activeTabId, {
                showBranchManager: true, showRemoteManager: false, showStashManager: false,
                showTagManager: false, showReflogViewer: false, showBundleManager: false,
                selectedFile: null, fileHistoryPath: null,
              });
            }}
            onShowTags={() => {
              if (activeTabId) updateTabUIState(activeTabId, {
                showTagManager: true, showBranchManager: false, showRemoteManager: false,
                showStashManager: false, selectedFile: null, fileHistoryPath: null,
              });
            }}
            onShowRemotes={() => {
              if (activeTabId) updateTabUIState(activeTabId, {
                showRemoteManager: true, showBranchManager: false, showStashManager: false,
                showTagManager: false, selectedFile: null, fileHistoryPath: null,
              });
            }}
            onShowStashes={() => {
              if (activeTabId) updateTabUIState(activeTabId, {
                showStashManager: true, showBranchManager: false, showRemoteManager: false,
                showTagManager: false, selectedFile: null, fileHistoryPath: null,
              });
            }}
            activeView={overlayContent ? undefined : sidebarView}
          />

          {/* Main panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {dataState.currentRepo ? (
              overlayContent ? (
                /* Overlay panel (Branch Manager, Remote Manager, Diff Viewer, etc.) */
                <div className="flex-1 overflow-auto">{overlayContent}</div>
              ) : sidebarView === 'changes' ? (
                /* Changes view */
                renderChangesView()
              ) : (
                /* Commits view */
                renderCommitsView()
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#555]">
                <div className="text-center">
                  <FolderOpen size={48} className="mx-auto mb-4 text-[#444]" />
                  <p className="text-[14px]">Open a repository to get started</p>
                  <p className="text-[12px] mt-1 text-[#444]">File &rarr; Open Repository or Ctrl+O</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
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
            updateTabUIState(activeTabId!, { showConflictResolver: true, showMergeDialog: false });
          }}
        />
      )}
      {uiState?.showCherryPickDialog && uiState.cherryPickCommit && dataState?.currentRepo && (
        <CherryPickDialog
          repoPath={dataState.currentRepo.path}
          commitSha={uiState.cherryPickCommit.sha}
          commitMessage={uiState.cherryPickCommit.message}
          onClose={() => updateTabUIState(activeTabId!, { showCherryPickDialog: false, cherryPickCommit: null })}
          onSuccess={() => { showSuccess('Cherry-pick success'); refreshRepository(); }}
          onConflict={() => {
            updateTabUIState(activeTabId!, { showConflictResolver: true, showCherryPickDialog: false, cherryPickCommit: null });
          }}
        />
      )}
      {uiState?.showRevertDialog && uiState.revertCommit && dataState?.currentRepo && (
        <RevertDialog
          repoPath={dataState.currentRepo.path}
          commitSha={uiState.revertCommit.sha}
          commitMessage={uiState.revertCommit.message}
          onClose={() => updateTabUIState(activeTabId!, { showRevertDialog: false, revertCommit: null })}
          onSuccess={() => { showSuccess('Revert success'); refreshRepository(); }}
          onConflict={() => {
            updateTabUIState(activeTabId!, { showConflictResolver: true, showRevertDialog: false, revertCommit: null });
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
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
