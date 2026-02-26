import { useCallback, useRef, useEffect } from 'react';

/* ================================================================== */
/* ResizeHandle – a draggable splitter for split panels                */
/*                                                                     */
/* Props:                                                              */
/*   direction  – 'horizontal' (left↔right) or 'vertical' (top↔bottom)*/
/*   onResize   – called with delta px during drag                     */
/*   onResizeEnd – called when drag ends                               */
/* ================================================================== */

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export default function ResizeHandle({ direction, onResize, onResizeEnd }: ResizeHandleProps) {
  const dragging = useRef(false);
  const startPos = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const current = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = current - startPos.current;
      if (delta !== 0) {
        onResize(delta);
        startPos.current = current;
      }
    };

    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onResizeEnd?.();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onResize, onResizeEnd]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`flex-shrink-0 relative group ${
        isHorizontal
          ? 'w-[4px] cursor-col-resize hover:bg-[#0078d4] active:bg-[#0078d4]'
          : 'h-[4px] cursor-row-resize hover:bg-[#0078d4] active:bg-[#0078d4]'
      } bg-[#3c3c3c] transition-colors`}
      style={{ zIndex: 10 }}
    >
      {/* Wider invisible hit area for easier grabbing */}
      <div
        className={`absolute ${
          isHorizontal
            ? 'top-0 bottom-0 -left-[3px] -right-[3px] cursor-col-resize'
            : 'left-0 right-0 -top-[3px] -bottom-[3px] cursor-row-resize'
        }`}
      />
    </div>
  );
}
