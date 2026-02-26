import { useState, useEffect } from 'react';
import { FileText, FilePlus, FileX, ArrowRight, User, GitCommit, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import type { CommitFileChange, CommitInfo } from '../types/git';
import * as api from '../services/api';

interface CommitDetailPanelProps {
  repoPath: string;
  commit: CommitInfo;
  onViewFileDiff: (filePath: string) => void;
}

type DetailTab = 'commit' | 'changes' | 'filetree';

export default function CommitDetailPanel({ repoPath, commit, onViewFileDiff }: CommitDetailPanelProps) {
  const [files, setFiles] = useState<CommitFileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('commit');

  useEffect(() => {
    loadFiles();
  }, [commit.sha]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await api.getCommitFileChanges(repoPath, commit.sha);
      setFiles(result);
      if (result.length > 0) setSelectedFile(result[0].path);
    } catch (err) {
      console.error('Failed to load commit files:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return <FilePlus size={13} className="text-green-400" />;
      case 'deleted': return <FileX size={13} className="text-red-400" />;
      case 'renamed': return <ArrowRight size={13} className="text-blue-400" />;
      default: return <FileText size={13} className="text-[#ffb74d]" />;
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      added: '#81c784',
      modified: '#ffb74d',
      deleted: '#e57373',
      renamed: '#64b5f6',
    };
    return map[status] || '#888';
  };

  const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);

  // Build file tree structure
  const buildFileTree = (files: CommitFileChange[]) => {
    const tree: Record<string, CommitFileChange[]> = {};
    files.forEach(f => {
      const parts = f.path.split('/');
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
      if (!tree[dir]) tree[dir] = [];
      tree[dir].push(f);
    });
    return tree;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      });
    } catch {
      return dateStr;
    }
  };

  const renderCommitTab = () => (
    <div className="flex-1 overflow-auto p-4">
      {/* Author & Committer */}
      <div className="flex gap-8 mb-4">
        {/* Author */}
        <div className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-1">Author</div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center">
              <User size={16} className="text-[#888]" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">{commit.author}</div>
              <div className="text-[11px] text-[#888]">{commit.email || 'user@example.com'}</div>
              <div className="text-[11px] text-[#666]">{formatDate(commit.date)}</div>
            </div>
          </div>
        </div>

        {/* Committer */}
        <div className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-1">Committer</div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center">
              <GitCommit size={16} className="text-[#888]" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">{commit.author}</div>
              <div className="text-[11px] text-[#888]">{commit.email || 'user@example.com'}</div>
              <div className="text-[11px] text-[#666]">{formatDate(commit.date)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SHA */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-0.5">SHA</div>
        <div className="text-[12px] font-mono text-[#64b5f6] cursor-pointer hover:underline" onClick={() => navigator.clipboard.writeText(commit.sha)}>
          {commit.sha}
        </div>
      </div>

      {/* Parents */}
      {commit.parent_ids.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-0.5">Parents</div>
          <div className="flex gap-2">
            {commit.parent_ids.map((pid, i) => (
              <span key={i} className="text-[12px] font-mono text-[#64b5f6] cursor-pointer hover:underline">
                {pid.slice(0, 7)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Commit message */}
      <div className="mb-4">
        <div className="text-[14px] font-semibold text-white mb-1">{commit.message}</div>
        {(commit as any).co_authors && (commit as any).co_authors.length > 0 && (
          <div className="text-[11px] text-[#888] mt-1">
            Co-authored by: {(commit as any).co_authors.join(', ')}
          </div>
        )}
      </div>

      {/* Changed files list */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
            Changed Files ({files.length})
          </div>
          <div className="flex gap-2 text-[11px]">
            <span className="text-green-400">+{totalAdditions}</span>
            <span className="text-red-400">-{totalDeletions}</span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
          </div>
        ) : (
          <div className="border border-[#3c3c3c] rounded">
            {files.map((file, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedFile(file.path);
                  onViewFileDiff(file.path);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1 text-[12px] cursor-pointer border-b border-[#2a2a2a] last:border-b-0 ${
                  selectedFile === file.path
                    ? 'bg-[#094771] text-white'
                    : 'text-[#ccc] hover:bg-[#2a2d2e]'
                }`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(file.status) }} />
                {getStatusIcon(file.status)}
                <span className="truncate flex-1 text-left font-mono text-[11px]">
                  {file.old_path && file.status === 'renamed'
                    ? `${file.old_path} \u2192 ${file.path}`
                    : file.path}
                </span>
                {!file.is_binary && (file.additions > 0 || file.deletions > 0) && (
                  <span className={`text-[10px] font-mono flex-shrink-0 ${selectedFile === file.path ? 'text-white/70' : ''}`}>
                    {file.additions > 0 && <span className={selectedFile === file.path ? '' : 'text-green-400'}>+{file.additions}</span>}
                    {file.deletions > 0 && <span className={`ml-1 ${selectedFile === file.path ? '' : 'text-red-400'}`}>-{file.deletions}</span>}
                  </span>
                )}
                {file.is_binary && (
                  <span className={`text-[9px] italic flex-shrink-0 ${selectedFile === file.path ? 'text-white/50' : 'text-[#555]'}`}>binary</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderChangesTab = () => (
    <div className="flex-1 flex overflow-hidden">
      {/* File list */}
      <div className="w-[280px] flex-shrink-0 border-r border-[#3c3c3c] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-[12px] text-[#555] text-center py-4">No file changes</div>
        ) : (
          <div className="py-0.5">
            {files.map((file, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedFile(file.path);
                  onViewFileDiff(file.path);
                }}
                className={`w-full flex items-center gap-1.5 px-2 py-1 text-[12px] cursor-pointer ${
                  selectedFile === file.path
                    ? 'bg-[#094771] text-white'
                    : 'text-[#ccc] hover:bg-[#2a2d2e]'
                }`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(file.status) }} />
                {getStatusIcon(file.status)}
                <span className="truncate flex-1 text-left font-mono text-[11px]">{file.path}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Diff placeholder */}
      <div className="flex-1 overflow-auto bg-[#1e1e1e]">
        {selectedFile ? (
          <div className="flex items-center justify-center h-full text-[12px] text-[#555]">
            <div className="text-center">
              <div className="font-mono mb-2 text-[#888]">{selectedFile}</div>
              <button
                onClick={() => onViewFileDiff(selectedFile)}
                className="text-[#64b5f6] hover:text-[#90caf9] underline text-[13px]"
              >
                Open Full Diff View
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[12px] text-[#555]">
            Select a file to view changes
          </div>
        )}
      </div>
    </div>
  );

  const renderFileTreeTab = () => {
    const fileTree = buildFileTree(files);
    return (
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
          </div>
        ) : Object.entries(fileTree).length === 0 ? (
          <div className="text-[12px] text-[#555] text-center py-4">No file changes</div>
        ) : (
          Object.entries(fileTree).map(([dir, dirFiles]) => (
            <div key={dir} className="mb-1">
              <div className="flex items-center gap-1.5 px-1 py-0.5 text-[12px] text-[#888]">
                <FolderOpen size={12} className="text-[#888]" />
                <span className="font-medium">{dir === '.' ? '/' : dir}</span>
              </div>
              {dirFiles.map((file, idx) => {
                const fileName = file.path.split('/').pop() || file.path;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedFile(file.path);
                      onViewFileDiff(file.path);
                    }}
                    className={`w-full flex items-center gap-1.5 px-2 py-0.5 ml-4 text-[12px] cursor-pointer rounded ${
                      selectedFile === file.path
                        ? 'bg-[#094771] text-white'
                        : 'text-[#ccc] hover:bg-[#2a2d2e]'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(file.status) }} />
                    {getStatusIcon(file.status)}
                    <span className="truncate flex-1 text-left text-[11px]">{fileName}</span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border-t border-[#3c3c3c] bg-[#1e1e1e]">
      {/* Tab bar: Commit | Changes | File Tree */}
      <div className="flex items-center h-[28px] bg-[#252526] border-b border-[#3c3c3c] flex-shrink-0 select-none">
        {(['commit', 'changes', 'filetree'] as DetailTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 h-full text-[12px] border-b-2 transition-colors ${
              activeTab === tab
                ? 'text-white border-[#0078d4]'
                : 'text-[#888] border-transparent hover:text-[#ccc]'
            }`}
          >
            {tab === 'commit' ? 'Commit' : tab === 'changes' ? 'Changes' : 'File Tree'}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[10px] text-[#666] px-3">
          {files.length} files &middot; <span className="text-green-400">+{totalAdditions}</span> <span className="text-red-400">-{totalDeletions}</span>
        </span>
      </div>

      {/* Tab content */}
      {activeTab === 'commit' && renderCommitTab()}
      {activeTab === 'changes' && renderChangesTab()}
      {activeTab === 'filetree' && renderFileTreeTab()}
    </div>
  );
}
