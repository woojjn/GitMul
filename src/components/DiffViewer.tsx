import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { ParsedDiff } from '../types/git';
import ImageDiff from './ImageDiff';

interface DiffViewerProps {
  repoPath: string;
  filePath: string;
  staged: boolean;
  onClose?: () => void;
}

/** Check if a file path is an image based on extension */
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)$/i;
const isImageFile = (path: string): boolean => IMAGE_EXTENSIONS.test(path);

/**
 * DiffViewer - Routes to ImageDiff for image files, TextDiffViewer for text files
 */
export default function DiffViewer(props: DiffViewerProps) {
  if (isImageFile(props.filePath)) {
    return (
      <ImageDiff
        repoPath={props.repoPath}
        filePath={props.filePath}
        staged={props.staged}
        onClose={props.onClose}
      />
    );
  }

  return <TextDiffViewer {...props} />;
}

/**
 * TextDiffViewer - Dark-themed diff viewer matching the VS Code / Fork style
 */
function TextDiffViewer({
  repoPath,
  filePath,
  staged,
  onClose,
}: DiffViewerProps) {
  const [parsedDiff, setParsedDiff] = useState<ParsedDiff | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [wordDiffEnabled, setWordDiffEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDiff();
  }, [repoPath, filePath, staged]);

  const loadDiff = async () => {
    try {
      setLoading(true);
      setError('');
      const diff = await api.getFileDiff(repoPath, filePath, staged);
      const parsed = await api.parseDiff(diff);
      setParsedDiff(parsed);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  /**
   * Word-level diff rendering helper
   */
  const renderWordDiff = (content: string, lineType: string) => {
    if (!wordDiffEnabled || lineType === 'context') {
      return <span className="whitespace-pre">{content}</span>;
    }

    const words = content.split(/(\s+)/);

    if (lineType === 'addition') {
      return (
        <>
          {words.map((word, idx) =>
            word.trim() ? (
              <span key={idx} className="bg-green-800/60 rounded px-0.5 font-semibold">
                {word}
              </span>
            ) : (
              word
            )
          )}
        </>
      );
    }

    if (lineType === 'deletion') {
      return (
        <>
          {words.map((word, idx) =>
            word.trim() ? (
              <span key={idx} className="bg-red-800/60 rounded px-0.5 font-semibold">
                {word}
              </span>
            ) : (
              word
            )
          )}
        </>
      );
    }

    return <span className="whitespace-pre">{content}</span>;
  };

  const renderUnifiedView = () => {
    if (!parsedDiff) return null;

    return (
      <div className="font-mono text-[12px]">
        {parsedDiff.hunks.map((hunk, hunkIdx) => (
          <div key={hunkIdx} className="mb-2">
            {/* Hunk header */}
            <div className="bg-[#1e3a5f] text-[#569cd6] px-4 py-1 border-l-4 border-[#569cd6] text-[11px]">
              {hunk.header}
            </div>

            {/* Diff lines */}
            <div>
              {hunk.lines.map((line, lineIdx) => {
                const bgColor =
                  line.line_type === 'addition'
                    ? 'bg-[#1e3a1e]'
                    : line.line_type === 'deletion'
                    ? 'bg-[#3a1e1e]'
                    : 'bg-[#1e1e1e]';

                const textColor =
                  line.line_type === 'addition'
                    ? 'text-[#73c991]'
                    : line.line_type === 'deletion'
                    ? 'text-[#e57373]'
                    : 'text-[#ccc]';

                const prefix =
                  line.line_type === 'addition'
                    ? '+'
                    : line.line_type === 'deletion'
                    ? '-'
                    : ' ';

                return (
                  <div
                    key={lineIdx}
                    className={`flex ${bgColor} ${textColor} hover:brightness-110`}
                  >
                    {/* Line numbers */}
                    <div className="flex-shrink-0 select-none">
                      <span className="inline-block w-12 text-right px-2 text-[#555] border-r border-[#333]">
                        {line.old_line_no || ''}
                      </span>
                      <span className="inline-block w-12 text-right px-2 text-[#555] border-r border-[#333]">
                        {line.new_line_no || ''}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-4 py-0.5 overflow-x-auto">
                      <span className="inline-block w-4 text-[#666]">{prefix}</span>
                      {renderWordDiff(line.content, line.line_type)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSplitView = () => {
    if (!parsedDiff) return null;

    return (
      <div className="font-mono text-[12px]">
        {parsedDiff.hunks.map((hunk, hunkIdx) => (
          <div key={hunkIdx} className="mb-2">
            {/* Hunk header */}
            <div className="bg-[#1e3a5f] text-[#569cd6] px-4 py-1 border-l-4 border-[#569cd6] text-[11px]">
              {hunk.header}
            </div>

            {/* Split view */}
            <div className="grid grid-cols-2 gap-0 divide-x divide-[#333]">
              {/* Left (old) */}
              <div className="overflow-x-auto">
                {hunk.lines.map((line, lineIdx) => {
                  if (line.line_type === 'addition') {
                    return (
                      <div key={`left-${lineIdx}`} className="h-6 bg-[#252526]" />
                    );
                  }

                  const bgColor =
                    line.line_type === 'deletion'
                      ? 'bg-[#3a1e1e]'
                      : 'bg-[#1e1e1e]';

                  return (
                    <div key={`left-${lineIdx}`} className={`flex ${bgColor}`}>
                      <span className="inline-block w-12 text-right px-2 text-[#555] border-r border-[#333]">
                        {line.old_line_no || ''}
                      </span>
                      <span className="flex-1 px-4 py-0.5 text-[#e57373]">
                        <span className="inline-block w-4 text-[#666]">
                          {line.line_type === 'deletion' ? '-' : ' '}
                        </span>
                        {renderWordDiff(line.content, line.line_type)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right (new) */}
              <div className="overflow-x-auto">
                {hunk.lines.map((line, lineIdx) => {
                  if (line.line_type === 'deletion') {
                    return (
                      <div key={`right-${lineIdx}`} className="h-6 bg-[#252526]" />
                    );
                  }

                  const bgColor =
                    line.line_type === 'addition'
                      ? 'bg-[#1e3a1e]'
                      : 'bg-[#1e1e1e]';

                  return (
                    <div key={`right-${lineIdx}`} className={`flex ${bgColor}`}>
                      <span className="inline-block w-12 text-right px-2 text-[#555] border-r border-[#333]">
                        {line.new_line_no || ''}
                      </span>
                      <span className="flex-1 px-4 py-0.5 text-[#73c991]">
                        <span className="inline-block w-4 text-[#666]">
                          {line.line_type === 'addition' ? '+' : ' '}
                        </span>
                        {renderWordDiff(line.content, line.line_type)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#0078d4] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[#1e1e1e]">
        <div className="bg-[#3a1e1e] border border-[#5a2d2d] rounded-md p-4">
          <p className="text-[#e57373] text-[13px]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3c3c3c] bg-[#252526] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-[13px] font-semibold text-white truncate font-mono">
            {filePath}
          </h3>
          {parsedDiff && (
            <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
              <span className="px-1.5 py-0.5 bg-[#1e3a1e] text-[#73c991] rounded">
                +{parsedDiff.additions}
              </span>
              <span className="px-1.5 py-0.5 bg-[#3a1e1e] text-[#e57373] rounded">
                -{parsedDiff.deletions}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View mode toggle */}
          <div className="flex rounded overflow-hidden border border-[#3c3c3c]">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2.5 py-1 text-[11px] transition-colors ${
                viewMode === 'unified'
                  ? 'bg-[#0078d4] text-white'
                  : 'bg-[#333] text-[#888] hover:text-[#ccc]'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 text-[11px] transition-colors border-l border-[#3c3c3c] ${
                viewMode === 'split'
                  ? 'bg-[#0078d4] text-white'
                  : 'bg-[#333] text-[#888] hover:text-[#ccc]'
              }`}
            >
              Split
            </button>
          </div>

          {/* Word Diff Toggle */}
          <button
            onClick={() => setWordDiffEnabled(!wordDiffEnabled)}
            className={`px-2.5 py-1 text-[11px] rounded transition-colors border ${
              wordDiffEnabled
                ? 'bg-[#0078d4] text-white border-[#0078d4]'
                : 'bg-[#333] text-[#888] border-[#3c3c3c] hover:text-[#ccc]'
            }`}
            title="Toggle word-level diff highlighting"
          >
            {wordDiffEnabled ? '\u2714 ' : ''}Word Diff
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-[#888] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {parsedDiff?.is_binary ? (
          <div className="p-4 text-center text-[#555] text-[13px]">
            Binary file — cannot show diff
          </div>
        ) : !parsedDiff || parsedDiff.hunks.length === 0 ? (
          <div className="p-4 text-center text-[#555] text-[13px]">
            No changes to display
          </div>
        ) : viewMode === 'unified' ? (
          renderUnifiedView()
        ) : (
          renderSplitView()
        )}
      </div>
    </div>
  );
}
