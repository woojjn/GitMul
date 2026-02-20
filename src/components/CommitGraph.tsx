import { useState, useEffect, useRef } from 'react';
import type { CommitInfo } from '../types/git';

interface CommitGraphProps {
  repoPath: string;
  commits: CommitInfo[];
}

interface GraphNode {
  commit: CommitInfo;
  x: number;
  y: number;
  column: number;
  color: string;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export default function CommitGraph({ repoPath, commits }: CommitGraphProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const COMMIT_RADIUS = 6;
  const ROW_HEIGHT = 50;
  const COLUMN_WIDTH = 30;
  const MARGIN_LEFT = 20;

  useEffect(() => {
    if (commits.length > 0) {
      calculateGraph();
    }
  }, [commits]);

  useEffect(() => {
    if (nodes.length > 0) {
      drawGraph();
    }
  }, [nodes, selectedCommit]);

  const calculateGraph = () => {
    // Simple graph layout: each commit gets a column based on parent
    const columnMap = new Map<string, number>();
    const newNodes: GraphNode[] = [];
    let nextColumn = 0;

    commits.forEach((commit, index) => {
      const commitId = commit.sha;
      let column = columnMap.get(commitId);
      
      if (column === undefined) {
        // New branch or first commit
        column = nextColumn++;
        columnMap.set(commitId, column);
      }

      const color = COLORS[column % COLORS.length];
      const node: GraphNode = {
        commit,
        x: MARGIN_LEFT + column * COLUMN_WIDTH,
        y: index * ROW_HEIGHT + ROW_HEIGHT / 2,
        column,
        color,
      };

      newNodes.push(node);

      // Assign columns to parents
      commit.parent_ids.forEach((parentId) => {
        if (!columnMap.has(parentId)) {
          columnMap.set(parentId, column);
        }
      });
    });

    setNodes(newNodes);
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines between commits
    nodes.forEach((node, index) => {
      node.commit.parent_ids.forEach((parentId) => {
        const parentNode = nodes.find((n) => n.commit.sha === parentId);
        if (parentNode) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(parentNode.x, parentNode.y);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });

    // Draw commit nodes
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, COMMIT_RADIUS, 0, 2 * Math.PI);
      
      if (selectedCommit === node.commit.sha) {
        ctx.fillStyle = '#fbbf24'; // yellow for selected
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
      } else {
        ctx.fillStyle = node.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
      }
      
      ctx.fill();
      ctx.stroke();
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked node
    const clickedNode = nodes.find((node) => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= COMMIT_RADIUS + 5;
    });

    if (clickedNode) {
      setSelectedCommit(clickedNode.commit.sha);
    }
  };

  const selectedCommitData = nodes.find((n) => n.commit.sha === selectedCommit)?.commit;

  const graphWidth = Math.max(300, (commits.length > 0 ? Math.max(...nodes.map(n => n.column)) + 1 : 1) * COLUMN_WIDTH + MARGIN_LEFT * 2);
  const graphHeight = commits.length * ROW_HEIGHT + ROW_HEIGHT;

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Graph canvas */}
      <div className="flex-1 overflow-auto p-4">
        <canvas
          ref={canvasRef}
          width={graphWidth}
          height={graphHeight}
          onClick={handleCanvasClick}
          className="cursor-pointer"
          style={{ minWidth: '100%' }}
        />
      </div>

      {/* Commit list */}
      <div className="w-96 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            커밋 목록 ({commits.length})
          </h3>
          <div className="space-y-2">
            {commits.map((commit, index) => {
              const node = nodes[index];
              return (
                <div
                  key={commit.sha}
                  onClick={() => setSelectedCommit(commit.sha)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedCommit === commit.sha
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400'
                      : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {node && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: node.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {commit.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-500">
                        <span className="font-mono">{commit.sha.substring(0, 7)}</span>
                        <span>•</span>
                        <span>{commit.author}</span>
                        <span>•</span>
                        <span>{new Date(commit.timestamp * 1000).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected commit details */}
      {selectedCommitData && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-800">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              커밋 상세
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">SHA</label>
                <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                  {selectedCommitData.sha}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">메시지</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {selectedCommitData.message}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">작성자</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {selectedCommitData.author}{selectedCommitData.email ? ` <${selectedCommitData.email}>` : ''}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">날짜</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {new Date(selectedCommitData.timestamp * 1000).toLocaleString('ko-KR')}
                </p>
              </div>
              {selectedCommitData.parent_ids.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    부모 커밋 ({selectedCommitData.parent_ids.length})
                  </label>
                  <div className="space-y-1 mt-1">
                    {selectedCommitData.parent_ids.map((parentId) => (
                      <p
                        key={parentId}
                        className="font-mono text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600"
                        onClick={() => setSelectedCommit(parentId)}
                      >
                        {parentId.substring(0, 7)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
