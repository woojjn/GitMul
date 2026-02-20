import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ==========================================
// Types
// ==========================================

interface ImageData {
  data: string;       // Base64-encoded
  mime_type: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

interface ImageDiffResult {
  old_image: ImageData | null;
  new_image: ImageData | null;
  is_image: boolean;
  file_path: string;
}

type ImageDiffViewMode = 'side-by-side' | 'onion-skin' | 'swipe';

interface ImageDiffProps {
  repoPath: string;
  filePath: string;
  staged: boolean;
  onClose?: () => void;
}

// ==========================================
// Utility functions
// ==========================================

/** Format file size to human-readable string */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Calculate size difference as a string */
function getSizeDiff(oldSize: number, newSize: number): { text: string; color: string } {
  const diff = newSize - oldSize;
  if (diff === 0) return { text: '0 B', color: 'text-gray-500' };
  const sign = diff > 0 ? '+' : '';
  const color = diff > 0 ? 'text-red-500' : 'text-green-500';
  return { text: `${sign}${formatFileSize(Math.abs(diff))}`, color };
}

/** Build data URI from Base64 data and MIME type */
function toDataUri(data: string, mimeType: string): string {
  return `data:${mimeType};base64,${data}`;
}

// ==========================================
// Sub-components
// ==========================================

/** Image metadata badge row */
function ImageMetaBadge({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>
      {value}
    </span>
  );
}

/** Single image panel with metadata */
function ImagePanel({
  image,
  label,
  labelColor,
}: {
  image: ImageData | null;
  label: string;
  labelColor: string;
}) {
  if (!image) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-gray-400 dark:text-gray-500 text-center">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="font-medium">{label === 'Old' ? '이전 이미지 없음' : '새 이미지 없음'}</p>
          <p className="text-sm mt-1">{label === 'Old' ? '새로 추가된 파일입니다' : '삭제된 파일입니다'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Label */}
      <div className={`px-3 py-1.5 text-sm font-semibold ${labelColor} rounded-t-lg flex items-center justify-between`}>
        <span>{label}</span>
        <span className="text-xs opacity-80">{image.format}</span>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-4 bg-checkered rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-600 overflow-auto min-h-[200px]">
        <img
          src={toDataUri(image.data, image.mime_type)}
          alt={`${label} version`}
          className="max-w-full max-h-[400px] object-contain shadow-md"
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {image.width > 0 && image.height > 0 && (
          <ImageMetaBadge label="Size" value={`${image.width} x ${image.height}`} />
        )}
        <ImageMetaBadge label="File" value={formatFileSize(image.size)} />
        <ImageMetaBadge label="Format" value={image.format} />
      </div>
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export default function ImageDiff({ repoPath, filePath, staged, onClose }: ImageDiffProps) {
  const [diffResult, setDiffResult] = useState<ImageDiffResult | null>(null);
  const [viewMode, setViewMode] = useState<ImageDiffViewMode>('side-by-side');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Onion skin opacity
  const [opacity, setOpacity] = useState(0.5);
  
  // Swipe position (0-100%)
  const [swipePosition, setSwipePosition] = useState(50);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Load image diff data
  useEffect(() => {
    loadImageDiff();
  }, [repoPath, filePath, staged]);

  const loadImageDiff = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await invoke<ImageDiffResult>('get_image_diff', {
        repoPath,
        filePath,
        staged,
      });
      setDiffResult(result);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  // Swipe drag handlers
  const handleSwipeMove = useCallback((clientX: number) => {
    if (!swipeContainerRef.current || !isDragging.current) return;
    const rect = swipeContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSwipePosition(percent);
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleSwipeMove(e.clientX);
  }, [handleSwipeMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleSwipeMove(e.touches[0].clientX);
    }
  }, [handleSwipeMove]);

  // Global mouse up listener for swipe
  useEffect(() => {
    const handleGlobalMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // ==========================================
  // Render helpers
  // ==========================================

  const renderSideBySide = () => {
    if (!diffResult) return null;
    return (
      <div className="flex gap-4 p-4 overflow-auto">
        <ImagePanel
          image={diffResult.old_image}
          label="Old"
          labelColor="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300"
        />
        
        {/* Arrow separator */}
        <div className="flex items-center">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
        
        <ImagePanel
          image={diffResult.new_image}
          label="New"
          labelColor="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
        />
      </div>
    );
  };

  const renderOnionSkin = () => {
    if (!diffResult) return null;
    const { old_image, new_image } = diffResult;
    
    // Need at least one image to show
    if (!old_image && !new_image) return null;

    return (
      <div className="p-4">
        {/* Opacity slider */}
        <div className="flex items-center gap-3 mb-4 px-2">
          <span className="text-sm text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Old</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-red-300 to-green-300 dark:from-red-700 dark:to-green-700"
          />
          <span className="text-sm text-green-600 dark:text-green-400 font-medium whitespace-nowrap">New</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
            {Math.round(opacity * 100)}%
          </span>
        </div>

        {/* Overlaid images */}
        <div className="relative flex items-center justify-center bg-checkered rounded-lg border border-gray-200 dark:border-gray-600 min-h-[300px] overflow-auto p-4">
          {/* Old image (bottom layer) */}
          {old_image && (
            <img
              src={toDataUri(old_image.data, old_image.mime_type)}
              alt="Old version"
              className="max-w-full max-h-[500px] object-contain"
              style={{ opacity: 1 - opacity }}
            />
          )}
          
          {/* New image (top layer) */}
          {new_image && (
            <img
              src={toDataUri(new_image.data, new_image.mime_type)}
              alt="New version"
              className="absolute max-w-full max-h-[500px] object-contain"
              style={{ opacity }}
            />
          )}
        </div>
      </div>
    );
  };

  const renderSwipe = () => {
    if (!diffResult) return null;
    const { old_image, new_image } = diffResult;
    
    if (!old_image || !new_image) {
      // Fall back to side-by-side if one image is missing
      return renderSideBySide();
    }

    const oldUri = toDataUri(old_image.data, old_image.mime_type);
    const newUri = toDataUri(new_image.data, new_image.mime_type);

    return (
      <div className="p-4">
        <div
          ref={swipeContainerRef}
          className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600 bg-checkered min-h-[300px] cursor-col-resize select-none"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {/* New image (full width, behind) */}
          <div className="flex items-center justify-center p-4 min-h-[300px]">
            <img
              src={newUri}
              alt="New version"
              className="max-w-full max-h-[500px] object-contain"
              draggable={false}
            />
          </div>

          {/* Old image (clipped from left) */}
          <div
            className="absolute inset-0 overflow-hidden flex items-center justify-center p-4"
            style={{ width: `${swipePosition}%` }}
          >
            <img
              src={oldUri}
              alt="Old version"
              className="max-w-none max-h-[500px] object-contain"
              style={{
                width: swipeContainerRef.current ? `${swipeContainerRef.current.clientWidth}px` : '100%',
                maxWidth: 'none',
              }}
              draggable={false}
            />
          </div>

          {/* Swipe handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-blue-500 shadow-lg cursor-col-resize z-10"
            style={{ left: `${swipePosition}%`, transform: 'translateX(-50%)' }}
          >
            {/* Handle knob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 rounded-full shadow-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500/80 text-white text-xs rounded font-medium">
            Old
          </div>
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500/80 text-white text-xs rounded font-medium">
            New
          </div>
        </div>

        {/* Swipe position indicator */}
        <div className="flex items-center justify-center mt-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Drag the handle to compare | Position: {Math.round(swipePosition)}%
          </span>
        </div>
      </div>
    );
  };

  // ==========================================
  // Main render
  // ==========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading image diff...</p>
        </div>
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

  if (!diffResult) return null;

  const { old_image, new_image } = diffResult;
  const sizeDiff = old_image && new_image ? getSizeDiff(old_image.size, new_image.size) : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-3 min-w-0">
          {/* Image icon */}
          <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {filePath}
          </h3>

          {/* Status badges */}
          <div className="flex items-center gap-2 text-sm flex-shrink-0">
            {!old_image && new_image && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded font-medium">
                Added
              </span>
            )}
            {old_image && !new_image && (
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded font-medium">
                Deleted
              </span>
            )}
            {old_image && new_image && (
              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded font-medium">
                Modified
              </span>
            )}
            {sizeDiff && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${sizeDiff.color}`}>
                {sizeDiff.text}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View mode toggle */}
          <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
            {(['side-by-side', 'onion-skin', 'swipe'] as ImageDiffViewMode[]).map((mode) => {
              const labels: Record<ImageDiffViewMode, string> = {
                'side-by-side': 'Side by Side',
                'onion-skin': 'Onion Skin',
                'swipe': 'Swipe',
              };
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-sm transition-colors ${
                    viewMode === mode
                      ? 'bg-purple-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${mode !== 'side-by-side' ? 'border-l border-gray-300 dark:border-gray-600' : ''}`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>

          {/* Close button */}
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
        {viewMode === 'side-by-side' && renderSideBySide()}
        {viewMode === 'onion-skin' && renderOnionSkin()}
        {viewMode === 'swipe' && renderSwipe()}
      </div>

      {/* Footer: detailed metadata comparison */}
      {old_image && new_image && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {/* Old image info */}
            <div className="text-center">
              <span className="text-red-600 dark:text-red-400 font-semibold">Old</span>
              <div className="text-gray-600 dark:text-gray-400 mt-0.5">
                {old_image.width > 0 ? `${old_image.width}x${old_image.height}` : 'N/A'} | {formatFileSize(old_image.size)} | {old_image.format}
              </div>
            </div>
            
            {/* Diff summary */}
            <div className="text-center">
              <span className="text-gray-700 dark:text-gray-300 font-semibold">Diff</span>
              <div className="text-gray-600 dark:text-gray-400 mt-0.5">
                {old_image.width > 0 && new_image.width > 0 ? (
                  <>
                    {old_image.width !== new_image.width || old_image.height !== new_image.height
                      ? `${old_image.width}x${old_image.height} -> ${new_image.width}x${new_image.height}`
                      : 'Same dimensions'
                    }
                  </>
                ) : (
                  'Dimensions N/A'
                )}
                {' | '}
                <span className={sizeDiff?.color}>{sizeDiff?.text}</span>
              </div>
            </div>
            
            {/* New image info */}
            <div className="text-center">
              <span className="text-green-600 dark:text-green-400 font-semibold">New</span>
              <div className="text-gray-600 dark:text-gray-400 mt-0.5">
                {new_image.width > 0 ? `${new_image.width}x${new_image.height}` : 'N/A'} | {formatFileSize(new_image.size)} | {new_image.format}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
