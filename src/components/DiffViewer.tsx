import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import ImageDiff from './ImageDiff';

interface DiffLine {
  line_type: string;
  old_line_no: number | null;
  new_line_no: number | null;
  content: string;
}

interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}

interface ParsedDiff {
  file_path: string;
  old_path: string;
  new_path: string;
  is_binary: boolean;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

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
  // Phase 4: Image Diff - delegate to ImageDiff component for image files
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
 * TextDiffViewer - Original text diff logic (extracted to avoid Rules of Hooks violation)
 */
function TextDiffViewer({
  repoPath,
  filePath,
  staged,
  onClose,
}: DiffViewerProps) {
  const [diffText, setDiffText] = useState<string>('');
  const [parsedDiff, setParsedDiff] = useState<ParsedDiff | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [wordDiffEnabled, setWordDiffEnabled] = useState(true); // Word-level diff toggle
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDiff();
  }, [repoPath, filePath, staged]);

  const loadDiff = async () => {
    try {
      setLoading(true);
      setError('');

      // Get diff text
      const diff = await invoke<string>('get_file_diff', {
        repoPath,
        filePath,
        staged,
      });
      setDiffText(diff);

      // Parse diff
      const parsed = await invoke<ParsedDiff>('parse_diff', {
        diffText: diff,
      });
      setParsedDiff(parsed);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      rb: 'ruby',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      php: 'php',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sh: 'bash',
      sql: 'sql',
    };
    return langMap[ext] || 'text';
  };

  /**
   * Word-level diff rendering helper
   * Highlights added/deleted words.
   */
  const renderWordDiff = (content: string, lineType: string) => {
    if (!wordDiffEnabled || lineType === 'context') {
      return <span className="whitespace-pre">{content}</span>;
    }

    const words = content.split(/(\s+)/);
    
    if (lineType === 'addition') {
      return (
        <>
          {words.map((word, idx) => {
            if (word.trim()) {
              return (
                <span
                  key={idx}
                  className="bg-green-300 dark:bg-green-700 font-semibold rounded px-0.5"
                >
                  {word}
                </span>
              );
            }
            return word;
          })}
        </>
      );
    }

    if (lineType === 'deletion') {
      return (
        <>
          {words.map((word, idx) => {
            if (word.trim()) {
              return (
                <span
                  key={idx}
                  className="bg-red-300 dark:bg-red-700 font-semibold rounded px-0.5"
                >
                  {word}
                </span>
              );
            }
            return word;
          })}
        </>
      );
    }

    return <span className="whitespace-pre">{content}</span>;
  };

  const renderUnifiedView = () => {
    if (!parsedDiff) return null;

    return (
      <div className="font-mono text-sm">
        {parsedDiff.hunks.map((hunk, hunkIdx) => (
          <div key={hunkIdx} className="mb-4">
            {/* Hunk header */}
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 px-4 py-1 border-l-4 border-blue-500">
              {hunk.header}
            </div>

            {/* Diff lines */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {hunk.lines.map((line, lineIdx) => {
                const bgColor =
                  line.line_type === 'addition'
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : line.line_type === 'deletion'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-white dark:bg-gray-800';

                const textColor =
                  line.line_type === 'addition'
                    ? 'text-green-800 dark:text-green-300'
                    : line.line_type === 'deletion'
                    ? 'text-red-800 dark:text-red-300'
                    : 'text-gray-800 dark:text-gray-300';

                const prefix =
                  line.line_type === 'addition'
                    ? '+'
                    : line.line_type === 'deletion'
                    ? '-'
                    : ' ';

                return (
                  <div
                    key={lineIdx}
                    className={`flex ${bgColor} ${textColor} hover:bg-opacity-80`}
                  >
                    {/* Line numbers */}
                    <div className="flex-shrink-0 select-none">
                      <span className="inline-block w-12 text-right px-2 text-gray-500 dark:text-gray-500 border-r border-gray-300 dark:border-gray-600">
                        {line.old_line_no || ''}
                      </span>
                      <span className="inline-block w-12 text-right px-2 text-gray-500 dark:text-gray-500 border-r border-gray-300 dark:border-gray-600">
                        {line.new_line_no || ''}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-4 py-0.5 overflow-x-auto">
                      <span className="inline-block w-4">{prefix}</span>
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
      <div className="font-mono text-sm">
        {parsedDiff.hunks.map((hunk, hunkIdx) => (
          <div key={hunkIdx} className="mb-4">
            {/* Hunk header */}
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 px-4 py-1 border-l-4 border-blue-500">
              {hunk.header}
            </div>

            {/* Split view */}
            <div className="grid grid-cols-2 gap-0 divide-x divide-gray-300 dark:divide-gray-600">
              {/* Left (old) */}
              <div className="overflow-x-auto">
                {hunk.lines.map((line, lineIdx) => {
                  if (line.line_type === 'addition') {
                    return (
                      <div
                        key={`left-${lineIdx}`}
                        className="h-6 bg-gray-100 dark:bg-gray-700"
                      />
                    );
                  }

                  const bgColor =
                    line.line_type === 'deletion'
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : 'bg-white dark:bg-gray-800';

                  return (
                    <div key={`left-${lineIdx}`} className={`flex ${bgColor}`}>
                      <span className="inline-block w-12 text-right px-2 text-gray-500 dark:text-gray-500 border-r border-gray-300 dark:border-gray-600">
                        {line.old_line_no || ''}
                      </span>
                      <span className="flex-1 px-4 py-0.5">
                        <span className="inline-block w-4">
                          {line.line_type === 'deletion' ? '-' : ' '}
                        </span>
                        <span className="whitespace-pre text-gray-800 dark:text-gray-300">
                          {line.content}
                        </span>
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
                      <div
                        key={`right-${lineIdx}`}
                        className="h-6 bg-gray-100 dark:bg-gray-700"
                      />
                    );
                  }

                  const bgColor =
                    line.line_type === 'addition'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-white dark:bg-gray-800';

                  return (
                    <div key={`right-${lineIdx}`} className={`flex ${bgColor}`}>
                      <span className="inline-block w-12 text-right px-2 text-gray-500 dark:text-gray-500 border-r border-gray-300 dark:border-gray-600">
                        {line.new_line_no || ''}
                      </span>
                      <span className="flex-1 px-4 py-0.5">
                        <span className="inline-block w-4">
                          {line.line_type === 'addition' ? '+' : ' '}
                        </span>
                        <span className="whitespace-pre text-gray-800 dark:text-gray-300">
                          {line.content}
                        </span>
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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {filePath}
          </h3>
          {parsedDiff && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                +{parsedDiff.additions}
              </span>
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                -{parsedDiff.deletions}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1 text-sm transition-colors ${
                viewMode === 'unified'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-sm transition-colors border-l border-gray-300 dark:border-gray-600 ${
                viewMode === 'split'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Split
            </button>
          </div>

          {/* Word Diff Toggle */}
          <button
            onClick={() => setWordDiffEnabled(!wordDiffEnabled)}
            className={`px-3 py-1 text-sm rounded-md transition-colors border ${
              wordDiffEnabled
                ? 'bg-blue-500 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Toggle word-level diff highlighting"
          >
            {wordDiffEnabled ? '\u2714' : ''} Word Diff
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {parsedDiff?.is_binary ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Binary file - cannot show diff
          </div>
        ) : !parsedDiff || parsedDiff.hunks.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
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
