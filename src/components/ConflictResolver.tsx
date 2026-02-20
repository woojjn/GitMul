import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { ConflictFile, ConflictInfo, ResolutionChoice } from '../types/git';
import { 
  AlertCircle, CheckCircle, X, ChevronLeft, ChevronRight,
  FileWarning, GitMerge, Undo
} from 'lucide-react';

interface ConflictResolverProps {
  repoPath: string;
  onClose: () => void;
  onResolved: () => void;
}


const ConflictResolver: React.FC<ConflictResolverProps> = ({
  repoPath,
  onClose,
  onResolved,
}) => {
  const [conflicts, setConflicts] = useState<ConflictInfo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolution, setResolution] = useState<ResolutionChoice>('manual');
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadConflicts();
  }, [repoPath]);

  useEffect(() => {
    if (conflicts && conflicts.files.length > 0) {
      const currentFile = conflicts.files[currentIndex];
      // Initialize with manual merge (show both versions with conflict markers)
      initializeContent(currentFile);
    }
  }, [currentIndex, conflicts]);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const result = await api.getConflicts(repoPath);
      setConflicts(result);
      if (result.files.length > 0) {
        initializeContent(result.files[0]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const initializeContent = (file: ConflictFile) => {
    // Start with "both" view showing conflict markers (like VS Code)
    const ours = file.our_content || '';
    const theirs = file.their_content || '';
    const merged = `<<<<<<< HEAD (현재 변경사항)\n${ours}\n=======\n${theirs}\n>>>>>>> MERGE_HEAD (들어오는 변경사항)`;
    setEditedContent(merged);
    setResolution('manual');
  };

  const handleChoiceChange = (choice: ResolutionChoice) => {
    setResolution(choice);
    const currentFile = conflicts!.files[currentIndex];

    switch (choice) {
      case 'ours':
        setEditedContent(currentFile.our_content || '');
        break;
      case 'theirs':
        setEditedContent(currentFile.their_content || '');
        break;
      case 'both':
        // Combine both without conflict markers
        const combined = [
          currentFile.our_content || '',
          currentFile.their_content || ''
        ].filter(Boolean).join('\n');
        setEditedContent(combined);
        break;
      case 'manual':
        initializeContent(currentFile);
        break;
    }
  };

  const handleResolve = async () => {
    if (!conflicts || conflicts.files.length === 0) return;

    const currentFile = conflicts.files[currentIndex];
    
    try {
      setResolving(true);
      setError('');

      await api.resolveConflict(repoPath, currentFile.path, resolution === 'manual' ? 'manual' : resolution, editedContent,
      );

      // Move to next conflict or finish
      if (currentIndex < conflicts.files.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All conflicts resolved
        const updatedConflicts = await api.getConflicts(repoPath);
        if (updatedConflicts.files.length === 0) {
          onResolved();
        } else {
          setConflicts(updatedConflicts);
          setCurrentIndex(0);
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setResolving(false);
    }
  };

  const handleAbort = async () => {
    if (!confirm('⚠️ 병합을 취소하시겠습니까?\n\n모든 변경사항이 손실되며 병합 전 상태로 돌아갑니다.')) return;

    try {
      setLoading(true);
      await api.abortMerge(repoPath);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (conflicts && currentIndex < conflicts.files.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Loading state
  if (loading && !conflicts) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">충돌 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // No conflicts
  if (!conflicts || conflicts.files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">모든 충돌이 해결되었습니다!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            이제 변경사항을 커밋할 수 있습니다.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            완료
          </button>
        </div>
      </div>
    );
  }

  const currentFile = conflicts.files[currentIndex];
  const progress = ((currentIndex + 1) / conflicts.files.length) * 100;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border-b-2 border-orange-500 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <FileWarning className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <div>
              <h2 className="text-lg font-bold text-orange-900 dark:text-orange-100">
                충돌 해결
              </h2>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {currentIndex + 1} / {conflicts.files.length} 파일
              </p>
            </div>
          </div>
          <button
            onClick={handleAbort}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
          >
            <Undo className="w-4 h-4" />
            병합 취소
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-900 dark:text-red-100">오류 발생</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* File Info */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <GitMerge className="w-5 h-5 text-gray-500" />
            <h3 className="font-mono text-lg font-semibold">{currentFile.path}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            아래 옵션 중 하나를 선택하여 충돌을 해결하세요
          </p>
        </div>

        {/* Choice Buttons - VS Code Style */}
        <div className="grid grid-cols-4 gap-3 p-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleChoiceChange('ours')}
            className={`p-4 rounded-lg border-2 transition-all ${
              resolution === 'ours'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">👈</div>
              <p className="font-semibold text-sm mb-1">현재 변경사항 사용</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">(HEAD)</p>
            </div>
          </button>

          <button
            onClick={() => handleChoiceChange('theirs')}
            className={`p-4 rounded-lg border-2 transition-all ${
              resolution === 'theirs'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                : 'border-gray-300 dark:border-gray-600 hover:border-green-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">👉</div>
              <p className="font-semibold text-sm mb-1">들어오는 변경사항 사용</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">(MERGE_HEAD)</p>
            </div>
          </button>

          <button
            onClick={() => handleChoiceChange('both')}
            className={`p-4 rounded-lg border-2 transition-all ${
              resolution === 'both'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">🤝</div>
              <p className="font-semibold text-sm mb-1">둘 다 유지</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">(순서대로 결합)</p>
            </div>
          </button>

          <button
            onClick={() => handleChoiceChange('manual')}
            className={`p-4 rounded-lg border-2 transition-all ${
              resolution === 'manual'
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                : 'border-gray-300 dark:border-gray-600 hover:border-orange-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">✏️</div>
              <p className="font-semibold text-sm mb-1">직접 편집</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">(수동 병합)</p>
            </div>
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {resolution === 'manual' ? '편집 (충돌 마커를 제거하고 최종 내용을 작성하세요)' : '미리보기'}
            </label>
            {resolution === 'manual' && (
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                ⚠️ &#x3C;&#x3C;&#x3C;, ===, &#x3E;&#x3E;&#x3E; 마커를 반드시 제거하세요
              </span>
            )}
          </div>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            disabled={resolution !== 'manual'}
            className={`flex-1 p-4 border rounded-lg font-mono text-sm resize-none ${
              resolution === 'manual'
                ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            style={{ lineHeight: '1.6' }}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= conflicts.files.length - 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleResolve}
            disabled={resolving || (resolution === 'manual' && (editedContent.includes('<<<<<<<') || editedContent.includes('>>>>>>>')))}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {resolving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                처리 중...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {currentIndex < conflicts.files.length - 1 ? '해결 및 다음' : '해결 완료'}
              </>
            )}
          </button>
        </div>

        {resolution === 'manual' && (editedContent.includes('<<<<<<<') || editedContent.includes('>>>>>>>')) && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-right">
            ⚠️ 충돌 마커(&#x3C;&#x3C;&#x3C;, ===, &#x3E;&#x3E;&#x3E;)를 제거해야 계속할 수 있습니다
          </p>
        )}
      </div>
    </div>
  );
};

export default ConflictResolver;
