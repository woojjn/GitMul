import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Tag, Plus, Trash2, Upload, X } from 'lucide-react';

interface TagInfo {
  name: string;
  target: string;
  message: string | null;
  tagger: string | null;
  date: number | null;
}

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
      const result = await invoke<TagInfo[]>('list_tags', { repoPath });
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
      alert('태그 이름을 입력하세요');
      return;
    }

    try {
      setLoading(true);
      if (isAnnotated) {
        await invoke('create_annotated_tag', {
          repoPath,
          tagName: newTagName,
          message: newTagMessage || newTagName,
          target: null,
        });
      } else {
        await invoke('create_tag', {
          repoPath,
          tagName: newTagName,
          target: null,
        });
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
      await invoke('delete_tag', { repoPath, tagName });
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
      await invoke('push_tag', { repoPath, remoteName, tagName });
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          <h2 className="text-lg font-semibold">태그 관리</h2>
          <span className="text-sm text-gray-500">({tags.length}개)</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            새 태그
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded">
          {error}
        </div>
      )}

      {/* Tags List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && tags.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : tags.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            태그가 없습니다
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.name}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <h3 className="font-semibold text-lg">{tag.name}</h3>
                    {tag.message && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        Annotated
                      </span>
                    )}
                  </div>
                  {tag.message && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {tag.message}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-mono">{tag.target.substring(0, 7)}</span>
                    {tag.tagger && <span>{tag.tagger}</span>}
                    {tag.date && <span>{formatDate(tag.date)}</span>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handlePushTag(tag.name)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="원격에 푸시"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.name)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Tag Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">새 태그 생성</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">태그 이름</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                  placeholder="v1.0.0"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAnnotated}
                    onChange={(e) => setIsAnnotated(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Annotated 태그 (메시지 포함)</span>
                </label>
              </div>
              {isAnnotated && (
                <div>
                  <label className="block text-sm font-medium mb-2">메시지</label>
                  <textarea
                    value={newTagMessage}
                    onChange={(e) => setNewTagMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 resize-none"
                    rows={3}
                    placeholder="Release v1.0.0"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewTagName('');
                  setNewTagMessage('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                취소
              </button>
              <button
                onClick={handleCreateTag}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
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
