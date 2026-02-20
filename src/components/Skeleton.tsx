export function FileChangesSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-gray-50 dark:bg-gray-800">
        <div className="h-5 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Staged section */}
        <div className="mb-4">
          <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
                <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Unstaged section */}
        <div>
          <div className="h-4 w-28 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
                <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BranchListSkeleton() {
  return (
    <div className="space-y-2 p-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-3 rounded bg-gray-100 dark:bg-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-5 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-5 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 flex-1 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommitHistorySkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="h-5 w-3/4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RemoteManagerSkeleton() {
  return (
    <div className="p-4 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>

      {/* Remote selector */}
      <div className="space-y-2">
        <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="h-10 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 flex-1 bg-gray-300 dark:bg-gray-600 rounded"></div>
        ))}
      </div>

      {/* Remote branches */}
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
            <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
