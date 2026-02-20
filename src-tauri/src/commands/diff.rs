use git2::{Diff, DiffOptions, Repository, Oid};
use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffLine {
    pub line_type: String,  // "context", "addition", "deletion"
    pub old_line_no: Option<u32>,
    pub new_line_no: Option<u32>,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedDiff {
    pub file_path: String,
    pub old_path: String,
    pub new_path: String,
    pub is_binary: bool,
    pub hunks: Vec<DiffHunk>,
    pub additions: u32,
    pub deletions: u32,
}

/// Normalize Unicode (NFC)
fn normalize_unicode(s: &str) -> String {
    s.nfc().collect()
}

/// Get diff for a specific file (staged or unstaged)
#[tauri::command]
pub async fn get_file_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
) -> Result<String, String> {
    let normalized_path = normalize_unicode(&file_path);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let mut opts = DiffOptions::new();
    opts.pathspec(&normalized_path);
    opts.context_lines(3);
    opts.interhunk_lines(0);

    let diff = if staged {
        // Staged changes: diff between HEAD and index
        let head = repo.head().map_err(|e| e.to_string())?;
        let head_tree = head.peel_to_tree().map_err(|e| e.to_string())?;
        let index = repo.index().map_err(|e| e.to_string())?;
        let index_tree = repo.find_tree(index.write_tree().map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        
        repo.diff_tree_to_tree(Some(&head_tree), Some(&index_tree), Some(&mut opts))
            .map_err(|e| e.to_string())?
    } else {
        // Unstaged changes: diff between index and working directory
        repo.diff_index_to_workdir(None, Some(&mut opts))
            .map_err(|e| e.to_string())?
    };

    // Format diff as patch text
    let mut patch_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let content = String::from_utf8_lossy(line.content());
        patch_text.push_str(&content);
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(patch_text)
}

/// Get diff for a specific commit
#[tauri::command]
pub async fn get_commit_diff(repo_path: String, commit_id: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let oid = Oid::from_str(&commit_id).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

    let commit_tree = commit.tree().map_err(|e| e.to_string())?;
    
    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0).map_err(|e| e.to_string())?.tree().map_err(|e| e.to_string())?)
    } else {
        None
    };

    let mut opts = DiffOptions::new();
    opts.context_lines(3);

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&commit_tree), Some(&mut opts))
        .map_err(|e| e.to_string())?;

    // Format as patch
    let mut patch_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let content = String::from_utf8_lossy(line.content());
        patch_text.push_str(&content);
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(patch_text)
}

/// Parse unified diff format into structured data
#[tauri::command]
pub async fn parse_diff(diff_text: String) -> Result<ParsedDiff, String> {
    let lines: Vec<&str> = diff_text.lines().collect();
    
    let mut file_path = String::new();
    let mut old_path = String::new();
    let mut new_path = String::new();
    let mut is_binary = false;
    let mut hunks: Vec<DiffHunk> = Vec::new();
    let mut additions = 0u32;
    let mut deletions = 0u32;

    let mut current_hunk: Option<DiffHunk> = None;
    let mut old_line_no = 0u32;
    let mut new_line_no = 0u32;

    for line in lines {
        if line.starts_with("diff --git") {
            // Extract file path
            if let Some(parts) = line.split_whitespace().nth(2) {
                file_path = parts.trim_start_matches("a/").to_string();
            }
        } else if line.starts_with("---") {
            old_path = line.trim_start_matches("--- a/").to_string();
        } else if line.starts_with("+++") {
            new_path = line.trim_start_matches("+++ b/").to_string();
        } else if line.starts_with("Binary files") {
            is_binary = true;
        } else if line.starts_with("@@") {
            // Save previous hunk
            if let Some(hunk) = current_hunk.take() {
                hunks.push(hunk);
            }

            // Parse hunk header: @@ -1,3 +1,4 @@
            let header = line.to_string();
            let parts: Vec<&str> = line.split_whitespace().collect();
            
            if parts.len() >= 3 {
                // Parse old range
                let old_range = parts[1].trim_start_matches('-');
                let old_parts: Vec<&str> = old_range.split(',').collect();
                let old_start = old_parts[0].parse::<u32>().unwrap_or(1);
                let old_lines = if old_parts.len() > 1 {
                    old_parts[1].parse::<u32>().unwrap_or(1)
                } else {
                    1
                };

                // Parse new range
                let new_range = parts[2].trim_start_matches('+');
                let new_parts: Vec<&str> = new_range.split(',').collect();
                let new_start = new_parts[0].parse::<u32>().unwrap_or(1);
                let new_lines = if new_parts.len() > 1 {
                    new_parts[1].parse::<u32>().unwrap_or(1)
                } else {
                    1
                };

                old_line_no = old_start;
                new_line_no = new_start;

                current_hunk = Some(DiffHunk {
                    old_start,
                    old_lines,
                    new_start,
                    new_lines,
                    header,
                    lines: Vec::new(),
                });
            }
        } else if let Some(ref mut hunk) = current_hunk {
            // Parse diff line
            if line.starts_with('+') && !line.starts_with("+++") {
                hunk.lines.push(DiffLine {
                    line_type: "addition".to_string(),
                    old_line_no: None,
                    new_line_no: Some(new_line_no),
                    content: line[1..].to_string(),
                });
                new_line_no += 1;
                additions += 1;
            } else if line.starts_with('-') && !line.starts_with("---") {
                hunk.lines.push(DiffLine {
                    line_type: "deletion".to_string(),
                    old_line_no: Some(old_line_no),
                    new_line_no: None,
                    content: line[1..].to_string(),
                });
                old_line_no += 1;
                deletions += 1;
            } else if line.starts_with(' ') {
                hunk.lines.push(DiffLine {
                    line_type: "context".to_string(),
                    old_line_no: Some(old_line_no),
                    new_line_no: Some(new_line_no),
                    content: line[1..].to_string(),
                });
                old_line_no += 1;
                new_line_no += 1;
            }
        }
    }

    // Save last hunk
    if let Some(hunk) = current_hunk {
        hunks.push(hunk);
    }

    Ok(ParsedDiff {
        file_path: normalize_unicode(&file_path),
        old_path: normalize_unicode(&old_path),
        new_path: normalize_unicode(&new_path),
        is_binary,
        hunks,
        additions,
        deletions,
    })
}

/// Get file content at a specific commit (or current working directory)
#[tauri::command]
pub async fn get_file_content(
    repo_path: String,
    file_path: String,
    commit_id: Option<String>,
) -> Result<String, String> {
    let normalized_path = normalize_unicode(&file_path);
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    if let Some(commit_str) = commit_id {
        // Get content at specific commit
        let oid = Oid::from_str(&commit_str).map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        let tree = commit.tree().map_err(|e| e.to_string())?;
        
        let entry = tree
            .get_path(std::path::Path::new(&normalized_path))
            .map_err(|e| e.to_string())?;
        
        let object = entry.to_object(&repo).map_err(|e| e.to_string())?;
        let blob = object.as_blob().ok_or("Not a blob")?;
        
        let content = String::from_utf8_lossy(blob.content()).to_string();
        Ok(content)
    } else {
        // Get current working directory content
        let full_path = std::path::Path::new(&repo_path).join(&normalized_path);
        std::fs::read_to_string(full_path).map_err(|e| e.to_string())
    }
}

/// Get list of changed files with diff stats
#[tauri::command]
pub async fn get_diff_stats(
    repo_path: String,
    staged: bool,
) -> Result<Vec<DiffStat>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let diff = if staged {
        let head = repo.head().map_err(|e| e.to_string())?;
        let head_tree = head.peel_to_tree().map_err(|e| e.to_string())?;
        let index = repo.index().map_err(|e| e.to_string())?;
        let index_tree = repo
            .find_tree(index.write_tree().map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        
        repo.diff_tree_to_tree(Some(&head_tree), Some(&index_tree), None)
            .map_err(|e| e.to_string())?
    } else {
        repo.diff_index_to_workdir(None, None)
            .map_err(|e| e.to_string())?
    };

    let mut stats = Vec::new();

    diff.foreach(
        &mut |delta, _progress| {
            let path = delta.new_file().path().unwrap_or(std::path::Path::new(""));
            let path_str = normalize_unicode(path.to_str().unwrap_or(""));
            
            stats.push(DiffStat {
                file_path: path_str,
                additions: 0,
                deletions: 0,
                is_binary: delta.new_file().is_binary(),
            });
            true
        },
        None,
        None,
        None,
    )
    .map_err(|e| e.to_string())?;

    // Get detailed stats
    let diff_stats = diff.stats().map_err(|e| e.to_string())?;
    for (i, delta) in diff.deltas().enumerate() {
        if i < stats.len() {
            // Note: libgit2 doesn't provide per-file stats directly
            // We'll need to calculate them by parsing the diff
            stats[i].additions = 0;  // Placeholder
            stats[i].deletions = 0;  // Placeholder
        }
    }

    Ok(stats)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffStat {
    pub file_path: String,
    pub additions: u32,
    pub deletions: u32,
    pub is_binary: bool,
}
