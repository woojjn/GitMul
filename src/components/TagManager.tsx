import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { TagInfo } from '../types/git';
import { Tag, Plus, Trash2, Upload, X, Loader2, AlertCircle } from 'lucide-react';

interface TagManagerProps {
  repoPath: string;
  onClose?: () => void;
}

const TagManager: React.FC<TagManagerProps> = ({ repoPath, onClose }) => {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagMessage, setNewTagMessage] = useState('');
  const [isAnnotated, setIsAnnotated] = useState(false);

  useEffect(() => {
    loadTags();
  }, [repoPath]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const result = await api.listTags(repoPath);
      setTags(result);
      setError('');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      setError('태그 이름을 입력하세요');
      return;
    }
    try {
      setLoading(true);
      if (isAnnotated) {
        await api.createAnnotatedTag(repoPath, newTagName, newTagMessage || newTagName);
      } else {
        await api.createTag(repoPath, newTagName);
      }
      setNewTagName('');
      setNewTagMessage('');
      setShowCreateDialog(false);
      await loadTags();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    if (!confirm(`태그 "${tagName}"을 삭제하시겠습니까?`)) return;
    try {
      setLoading(true);
      await api.deleteTag(repoPath, tagName);
      await loadTags();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePushTag = async (tagName: string) => {
    const remoteName = prompt('원격 저장소 이름을 입력하세요 (기본: origin)', 'origin');
    if (!remoteName) return;
    try {
      setLoading(true);
      await api.pushTag(repoPath, remoteName, tagName);
      alert(`태그 "${tagName}"이 ${remoteName}에 푸시되었습니다`);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#252526] flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-yellow-500" />
            <h2 className="text-[14px] font-semibold text-white">태그 관리</h2>
            <span className="text-[11px] text-[#666]">({tags.length}개)</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] transition-colors"
            >
              <Plus size={12} />
              새 태그
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1 text-[#888] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-[#3a1e1e] border border-[#5a2d2d] rounded flex items-start gap-2">
          <AlertCircle size={14} className="text-[#e57373] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#e57373]">{error}</p>
        </div>
      )}

      {/* Tags List */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading && tags.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-[#0078d4]" />
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#555]">
            <Tag size={32} className="mb-2 opacity-50" />
            <p className="text-[13px]">태그가 없습니다</p>
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.name}
              className="group flex items-start px-4 py-2 hover:bg-[#2a2d2e] transition-colors"
            >
              <Tag size={13} className="text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono font-semibold text-[12px] text-white">{tag.name}</span>
                  {tag.message && (
                    <span className="px-1.5 py-0 text-[9px] bg-[#1e3a5f] text-[#569cd6] rounded">Annotated</span>
                  )}
                </div>
                {tag.message && (
                  <p className="text-[11px] text-[#888] truncate">{tag.message}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#666]">
                  <span className="font-mono">{tag.target.substring(0, 7)}</span>
                  {tag.tagger && <><span>•</span><span>{tag.tagger}</span></>}
                  {tag.date && <><span>•</span><span>{formatDate(tag.date)}</span></>}
                </div>
              </div>
              <div className="flex gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handlePushTag(tag.name)}
                  className="p-1.5 text-[#4fc1ff] hover:bg-[#094771] rounded transition-colors"
                  title="원격에 푸시"
                >
                  <Upload size={13} />
                </button>
                <button
                  onClick={() => handleDeleteTag(tag.name)}
                  className="p-1.5 text-[#e57373] hover:bg-[#3a1e1e] rounded transition-colors"
                  title="삭제"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Tag Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl p-5 w-full max-w-md">
            <h3 className="text-[14px] font-semibold mb-4 text-white">새 태그 생성</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] text-[#888] mb-1">태그 이름</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isAnnotated && handleCreateTag()}
                  className="w-full px-3 py-2 text-[13px] border border-[#3c3c3c] rounded bg-[#1e1e1e] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4]"
                  placeholder="v1.0.0"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnnotated}
                  onChange={(e) => setIsAnnotated(e.target.checked)}
                  className="rounded"
                />
                <span className="text-[12px] text-[#ccc]">Annotated 태그 (메시지 포함)</span>
              </label>
              {isAnnotated && (
                <div>
                  <label className="block text-[12px] text-[#888] mb-1">메시지</label>
                  <textarea
                    value={newTagMessage}
                    onChange={(e) => setNewTagMessage(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-[#3c3c3c] rounded bg-[#1e1e1e] text-[#ccc] placeholder-[#555] outline-none focus:border-[#0078d4] resize-none"
                    rows={3}
                    placeholder="Release v1.0.0"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowCreateDialog(false); setNewTagName(''); setNewTagMessage(''); }}
                className="px-3 py-1.5 text-[13px] text-[#ccc] hover:bg-[#3c3c3c] rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateTag}
                disabled={loading || !newTagName.trim()}
                className="px-3 py-1.5 text-[13px] bg-[#0078d4] text-white rounded hover:bg-[#1a8ad4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManager;
