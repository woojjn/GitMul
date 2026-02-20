// Git commit information
export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  email?: string;
  timestamp: number;
  date: string;
  parent_ids: string[];
}

// Branch information  
export interface BranchInfo {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  commit_sha: string;
}

// Repository information
export interface RecentRepo {
  path: string;
  name: string;
}

export interface RepositoryInfo {
  path: string;
  name: string;
  current_branch: string;
}

// File status
export interface FileStatus {
  path: string;
  status: string;
  staged: boolean;
}
