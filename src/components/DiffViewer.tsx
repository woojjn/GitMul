import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api';
import type { ParsedDiff, DiffLine } from '../types/git';
import ImageDiff from './ImageDiff';

interface DiffViewerProps {
  repoPath: string;
  filePath: string;
  staged: boolean;
  commitSha?: string;
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
  commitSha,
  onClose,
}: DiffViewerProps) {
  const [parsedDiff, setParsedDiff] = useState<ParsedDiff | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [wordDiffEnabled, setWordDiffEnabled] = useState(true);
  const [showFullFile, setShowFullFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Refs for minimap
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const [scrollInfo, setScrollInfo] = useState({ scrollTop: 0, scrollHeight: 1, clientHeight: 1 });
  const isDraggingMinimap = useRef(false);

  useEffect(() => {
    loadDiff();
  }, [repoPath, filePath, staged, commitSha, showFullFile]);

  const loadDiff = async () => {
    try {
      setLoading(true);
      setError('');
      const ctxLines = showFullFile ? 999999 : undefined;
      const diff = commitSha
        ? await api.getFileDiffAtCommit(repoPath, filePath, commitSha, ctxLines)
        : await api.getFileDiff(repoPath, filePath, staged, ctxLines);
      const parsed = await api.parseDiff(diff);
      setParsedDiff(parsed);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  // ── Word Diff ─────────────────────────────────────────────────

  const computeWordDiff = (oldStr: string, newStr: string) => {
    const oldTokens = oldStr.split(/(\s+)/);
    const newTokens = newStr.split(/(\s+)/);
    const m = oldTokens.length;
    const n = newTokens.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = oldTokens[i - 1] === newTokens[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const oldStack: { text: string; changed: boolean }[] = [];
    const newStack: { text: string; changed: boolean }[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
        oldStack.push({ text: oldTokens[i - 1], changed: false });
        newStack.push({ text: newTokens[j - 1], changed: false });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        newStack.push({ text: newTokens[j - 1], changed: true });
        j--;
      } else {
        oldStack.push({ text: oldTokens[i - 1], changed: true });
        i--;
      }
    }
    oldStack.reverse();
    newStack.reverse();
    return { oldSegs: oldStack, newSegs: newStack };
  };

  const buildWordDiffMap = (lines: DiffLine[]) => {
    const map = new Map<number, { text: string; changed: boolean }[]>();
    let i = 0;
    while (i < lines.length) {
      const delStart = i;
      while (i < lines.length && lines[i].line_type === 'deletion') i++;
      const delEnd = i;
      const addStart = i;
      while (i < lines.length && lines[i].line_type === 'addition') i++;
      const addEnd = i;
      const delCount = delEnd - delStart;
      const addCount = addEnd - addStart;
      if (delCount > 0 && addCount > 0) {
        const paired = Math.min(delCount, addCount);
        for (let p = 0; p < paired; p++) {
          const { oldSegs, newSegs } = computeWordDiff(
            lines[delStart + p].content,
            lines[addStart + p].content
          );
          map.set(delStart + p, oldSegs);
          map.set(addStart + p, newSegs);
        }
      }
      if (i === delEnd && i === addEnd) i++;
    }
    return map;
  };

  const renderLineContent = (
    content: string,
    lineType: string,
    segments?: { text: string; changed: boolean }[]
  ) => {
    if (!wordDiffEnabled || lineType === 'context' || !segments) {
      return <span className="whitespace-pre">{content}</span>;
    }
    const hl = lineType === 'addition'
      ? 'bg-[#2ea04370] rounded-sm'
      : 'bg-[#f8514970] rounded-sm';
    return (
      <>
        {segments.map((seg, idx) =>
          seg.changed ? (
            <span key={idx} className={hl}>{seg.text}</span>
          ) : (
            <span key={idx} className="whitespace-pre">{seg.text}</span>
          )
        )}
      </>
    );
  };

  // ── Minimap ───────────────────────────────────────────────────

  /** Collect all lines with their types for minimap rendering */
  const getAllLines = useCallback(() => {
    if (!parsedDiff) return [];
    const result: { type: string }[] = [];
    for (const hunk of parsedDiff.hunks) {
      for (const line of hunk.lines) {
        result.push({ type: line.line_type });
      }
    }
    return result;
  }, [parsedDiff]);

  /** Draw minimap on canvas */
  const drawMinimap = useCallback(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lines = getAllLines();
    const totalLines = lines.length;
    if (totalLines === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, cssW, cssH);

    // Draw lines
    const lineH = Math.max(1, cssH / totalLines);
    for (let i = 0; i < totalLines; i++) {
      const lt = lines[i].type;
      if (lt === 'addition') {
        ctx.fillStyle = '#2ea04380';
      } else if (lt === 'deletion') {
        ctx.fillStyle = '#f8514980';
      } else {
        continue; // skip context lines for cleaner minimap
      }
      const y = (i / totalLines) * cssH;
      ctx.fillRect(0, y, cssW, Math.max(lineH, 2));
    }

    // Viewport indicator
    const { scrollTop, scrollHeight, clientHeight } = scrollInfo;
    if (scrollHeight > clientHeight) {
      const vpTop = (scrollTop / scrollHeight) * cssH;
      const vpH = (clientHeight / scrollHeight) * cssH;
      ctx.fillStyle = '#ffffff15';
      ctx.fillRect(0, vpTop, cssW, vpH);
      ctx.strokeStyle = '#ffffff30';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, vpTop + 0.5, cssW - 1, vpH);
    }
  }, [getAllLines, scrollInfo]);

  useEffect(() => {
    drawMinimap();
  }, [drawMinimap, parsedDiff]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrollInfo({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    });
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    // Initial measurement
    handleScroll();
    const ro = new ResizeObserver(handleScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      ro.disconnect();
    };
  }, [handleScroll, parsedDiff]);

  const handleMinimapMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingMinimap.current = true;
    scrollToMinimapPosition(e);
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingMinimap.current) return;
      const canvas = minimapRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = (ev.clientY - rect.top) / rect.height;
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
      }
    };
    const onMouseUp = () => {
      isDraggingMinimap.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const scrollToMinimapPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = minimapRef.current;
    const el = scrollContainerRef.current;
    if (!canvas || !el) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
  }, []);

  // ── Render Views ──────────────────────────────────────────────

  const renderUnifiedView = () => {
    if (!parsedDiff) return null;
    return (
      <div className="font-mono text-[12px]">
        {parsedDiff.hunks.map((hunk, hunkIdx) => {
          const wordDiffMap = wordDiffEnabled ? buildWordDiffMap(hunk.lines) : null;
          return (
            <div key={hunkIdx}>
              {!showFullFile && (
                <div className="bg-[#1e3a5f] text-[#569cd6] px-4 py-1 border-l-4 border-[#569cd6] text-[11px]">
                  {hunk.header}
                </div>
              )}
              <div>
                {hunk.lines.map((line, lineIdx) => {
                  const hasWordDiff = wordDiffEnabled && wordDiffMap?.has(lineIdx);
                  const bgColor = hasWordDiff
                    ? ''
                    : line.line_type === 'addition'
                      ? 'bg-[#1e3a1e]'
                      : line.line_type === 'deletion'
                      ? 'bg-[#3a1e1e]'
                      : '';
                  return (
                    <div
                      key={lineIdx}
                      className={`flex ${bgColor} text-[#ccc] hover:brightness-110`}
                    >
                      <div className="flex-shrink-0 select-none">
                        <span className="inline-block w-12 text-right px-2 text-[#555] border-r border-[#333]">
                          {line.old_line_no || ''}
                        </span>
                        <span className="inline-block w-12 text-right px-2 text-[#555] border-r border-[#333]">
                          {line.new_line_no || ''}
                        </span>
                      </div>
                      <div className="flex-1 px-4 py-0.5 overflow-x-auto">
                        {renderLineContent(line.content, line.line_type, wordDiffMap?.get(lineIdx))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSplitView = () => {
    if (!parsedDiff) return null;
    return (
      <div className="font-mono text-[12px]">
        {parsedDiff.hunks.map((hunk, hunkIdx) => {
          const wordDiffMap = wordDiffEnabled ? buildWordDiffMap(hunk.lines) : null;
          return (
            <div key={hunkIdx}>
              {!showFullFile && (
                <div className="bg-[#1e3a5f] text-[#569cd6] px-4 py-1 border-l-4 border-[#569cd6] text-[11px]">
                  {hunk.header}
                </div>
              )}
              <div className="grid grid-cols-2 gap-0 divide-x divide-[#333]">
                {/* Left (old) */}
                <div className="overflow-x-auto">
                  {hunk.lines.map((line, lineIdx) => {
                    if (line.line_type === 'addition') {
                      return <div key={`left-${lineIdx}`} className="h-6 bg-[#252526]" />;
                    }
                    const hasWordDiff = wordDiffEnabled && wordDiffMap?.has(lineIdx);
                    const bgColor = hasWordDiff ? '' : line.line_type === 'deletion' ? 'bg-[#3a1e1e]' : '';
                    return (
                      <div key={`left-${lineIdx}`} className={`flex ${bgColor}`}>
                        <span className="inline-block w-12 text-right px-2 text-[#555] border-r border-[#333]">
                          {line.old_line_no || ''}
                        </span>
                        <span className="flex-1 px-4 py-0.5 text-[#ccc]">
                          {renderLineContent(line.content, line.line_type, wordDiffMap?.get(lineIdx))}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Right (new) */}
                <div className="overflow-x-auto">
                  {hunk.lines.map((line, lineIdx) => {
                    if (line.line_type === 'deletion') {
                      return <div key={`right-${lineIdx}`} className="h-6 bg-[#252526]" />;
                    }
                    const hasWordDiff = wordDiffEnabled && wordDiffMap?.has(lineIdx);
                    const bgColor = hasWordDiff ? '' : line.line_type === 'addition' ? 'bg-[#1e3a1e]' : '';
                    return (
                      <div key={`right-${lineIdx}`} className={`flex ${bgColor}`}>
                        <span className="inline-block w-12 text-right px-2 text-[#555] border-r border-[#333]">
                          {line.new_line_no || ''}
                        </span>
                        <span className="flex-1 px-4 py-0.5 text-[#ccc]">
                          {renderLineContent(line.content, line.line_type, wordDiffMap?.get(lineIdx))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Main Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#0078d4] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    const isTooBig = error.includes('파일이 너무 큽니다') || error.includes('too large');
    return (
      <div className="p-4 bg-[#1e1e1e]">
        <div className={`border rounded-md p-4 ${isTooBig ? 'bg-[#1e2a3a] border-[#2d5a8a]' : 'bg-[#3a1e1e] border-[#5a2d2d]'}`}>
          {isTooBig ? (
            <div className="text-center">
              <p className="text-[#5b9bd5] text-[13px] font-semibold mb-1">파일이 너무 큽니다 (10MB 초과)</p>
              <p className="text-[#888] text-[12px]">외부 에디터나 터미널에서 확인하세요.</p>
            </div>
          ) : (
            <p className="text-[#e57373] text-[13px]">{error}</p>
          )}
        </div>
      </div>
    );
  }

  const hasContent = parsedDiff && !parsedDiff.is_binary && parsedDiff.hunks.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3c3c3c] bg-[#252526] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-[13px] font-semibold text-white truncate font-mono">
            {filePath}
          </h3>
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

          {/* Full File Toggle */}
          <button
            onClick={() => setShowFullFile(!showFullFile)}
            className={`px-2.5 py-1 text-[11px] rounded transition-colors border ${
              showFullFile
                ? 'bg-[#0078d4] text-white border-[#0078d4]'
                : 'bg-[#333] text-[#888] border-[#3c3c3c] hover:text-[#ccc]'
            }`}
            title="Toggle full file view"
          >
            {showFullFile ? '\u2714 ' : ''}Full File
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

      {/* Diff content + Minimap */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Scrollable diff content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto"
        >
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

        {/* Minimap scrollbar */}
        {hasContent && (
          <div className="w-[60px] flex-shrink-0 border-l border-[#333] bg-[#1e1e1e] relative">
            <canvas
              ref={minimapRef}
              className="w-full h-full cursor-pointer"
              onMouseDown={handleMinimapMouseDown}
            />
          </div>
        )}
      </div>
    </div>
  );
}
