use git2::{Diff, DiffOptions, Repository, Oid};
use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;
use std::path::Path;

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

// ==========================================
// Phase 4: Image Diff Support
// ==========================================

/// Image metadata and Base64-encoded content
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageData {
    /// Base64-encoded image data
    pub data: String,
    /// MIME type (e.g., "image/png", "image/jpeg")
    pub mime_type: String,
    /// File size in bytes
    pub size: u64,
    /// Image width in pixels (0 if not determinable)
    pub width: u32,
    /// Image height in pixels (0 if not determinable)
    pub height: u32,
    /// File format (e.g., "PNG", "JPEG", "GIF", "SVG", "WebP")
    pub format: String,
}

/// Result of image diff comparison
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageDiffResult {
    /// Old (previous) image data (None if file is newly added)
    pub old_image: Option<ImageData>,
    /// New (current) image data (None if file is deleted)
    pub new_image: Option<ImageData>,
    /// Whether the file is recognized as an image
    pub is_image: bool,
    /// File path
    pub file_path: String,
}

/// Known image file extensions
const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico", "tiff", "tif",
];

/// Check if a file path is an image based on extension
fn is_image_file(path: &str) -> bool {
    let path_lower = path.to_lowercase();
    IMAGE_EXTENSIONS.iter().any(|ext| path_lower.ends_with(&format!(".{}", ext)))
}

/// Get MIME type from file extension
fn get_mime_type(path: &str) -> String {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    match ext.as_str() {
        "png" => "image/png".to_string(),
        "jpg" | "jpeg" => "image/jpeg".to_string(),
        "gif" => "image/gif".to_string(),
        "svg" => "image/svg+xml".to_string(),
        "webp" => "image/webp".to_string(),
        "bmp" => "image/bmp".to_string(),
        "ico" => "image/x-icon".to_string(),
        "tiff" | "tif" => "image/tiff".to_string(),
        _ => "application/octet-stream".to_string(),
    }
}

/// Get format name from file extension
fn get_format_name(path: &str) -> String {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    match ext.as_str() {
        "png" => "PNG".to_string(),
        "jpg" | "jpeg" => "JPEG".to_string(),
        "gif" => "GIF".to_string(),
        "svg" => "SVG".to_string(),
        "webp" => "WebP".to_string(),
        "bmp" => "BMP".to_string(),
        "ico" => "ICO".to_string(),
        "tiff" | "tif" => "TIFF".to_string(),
        _ => ext.to_uppercase(),
    }
}

/// Parse PNG dimensions from raw bytes (IHDR chunk)
fn parse_png_dimensions(data: &[u8]) -> (u32, u32) {
    // PNG signature: 8 bytes, then IHDR chunk starts at byte 8
    // IHDR: 4 bytes length + 4 bytes "IHDR" + 4 bytes width + 4 bytes height
    if data.len() >= 24 && &data[0..8] == b"\x89PNG\r\n\x1a\n" {
        let width = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
        let height = u32::from_be_bytes([data[20], data[21], data[22], data[23]]);
        return (width, height);
    }
    (0, 0)
}

/// Parse JPEG dimensions from raw bytes (SOF0/SOF2 marker)
fn parse_jpeg_dimensions(data: &[u8]) -> (u32, u32) {
    if data.len() < 4 || data[0] != 0xFF || data[1] != 0xD8 {
        return (0, 0);
    }
    
    let mut i = 2;
    while i + 1 < data.len() {
        if data[i] != 0xFF {
            i += 1;
            continue;
        }
        let marker = data[i + 1];
        
        // SOF0 (0xC0) or SOF2 (0xC2) - Start of Frame
        if marker == 0xC0 || marker == 0xC2 {
            if i + 9 < data.len() {
                let height = u16::from_be_bytes([data[i + 5], data[i + 6]]) as u32;
                let width = u16::from_be_bytes([data[i + 7], data[i + 8]]) as u32;
                return (width, height);
            }
        }
        
        // Skip to next marker
        if i + 3 < data.len() {
            let len = u16::from_be_bytes([data[i + 2], data[i + 3]]) as usize;
            i += 2 + len;
        } else {
            break;
        }
    }
    (0, 0)
}

/// Parse GIF dimensions from raw bytes
fn parse_gif_dimensions(data: &[u8]) -> (u32, u32) {
    if data.len() >= 10 && (data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a")) {
        let width = u16::from_le_bytes([data[6], data[7]]) as u32;
        let height = u16::from_le_bytes([data[8], data[9]]) as u32;
        return (width, height);
    }
    (0, 0)
}

/// Parse WebP dimensions from raw bytes
fn parse_webp_dimensions(data: &[u8]) -> (u32, u32) {
    if data.len() >= 30 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        // VP8 lossy
        if &data[12..16] == b"VP8 " && data.len() >= 30 {
            if data[23] == 0x9D && data[24] == 0x01 && data[25] == 0x2A {
                let width = u16::from_le_bytes([data[26], data[27]]) as u32 & 0x3FFF;
                let height = u16::from_le_bytes([data[28], data[29]]) as u32 & 0x3FFF;
                return (width, height);
            }
        }
        // VP8L lossless
        if &data[12..16] == b"VP8L" && data.len() >= 25 {
            let bits = u32::from_le_bytes([data[21], data[22], data[23], data[24]]);
            let width = (bits & 0x3FFF) + 1;
            let height = ((bits >> 14) & 0x3FFF) + 1;
            return (width, height);
        }
    }
    (0, 0)
}

/// Try to parse image dimensions from raw bytes based on file format
fn parse_image_dimensions(data: &[u8], format: &str) -> (u32, u32) {
    match format {
        "PNG" => parse_png_dimensions(data),
        "JPEG" => parse_jpeg_dimensions(data),
        "GIF" => parse_gif_dimensions(data),
        "WebP" => parse_webp_dimensions(data),
        _ => (0, 0),
    }
}

/// Build ImageData from raw bytes and file path
fn build_image_data(data: &[u8], file_path: &str) -> ImageData {
    use base64::Engine;
    
    let mime_type = get_mime_type(file_path);
    let format = get_format_name(file_path);
    let (width, height) = parse_image_dimensions(data, &format);
    
    // For SVG, try to get dimensions from the SVG content
    let (width, height) = if format == "SVG" && width == 0 && height == 0 {
        parse_svg_dimensions(data)
    } else {
        (width, height)
    };
    
    let base64_data = base64::engine::general_purpose::STANDARD.encode(data);
    
    ImageData {
        data: base64_data,
        mime_type,
        size: data.len() as u64,
        width,
        height,
        format,
    }
}

/// Try to parse SVG dimensions from SVG XML content
fn parse_svg_dimensions(data: &[u8]) -> (u32, u32) {
    let content = String::from_utf8_lossy(data);
    
    // Simple regex-like parsing for width="..." height="..."
    let mut width = 0u32;
    let mut height = 0u32;
    
    if let Some(svg_start) = content.find("<svg") {
        let svg_tag = &content[svg_start..content[svg_start..].find('>').map(|i| svg_start + i + 1).unwrap_or(content.len())];
        
        // Parse width attribute
        if let Some(w_start) = svg_tag.find("width=\"") {
            let w_val = &svg_tag[w_start + 7..];
            if let Some(w_end) = w_val.find('"') {
                let w_str = &w_val[..w_end];
                // Remove px, em, etc.
                let numeric: String = w_str.chars().take_while(|c| c.is_ascii_digit() || *c == '.').collect();
                width = numeric.parse::<f64>().unwrap_or(0.0) as u32;
            }
        }
        
        // Parse height attribute
        if let Some(h_start) = svg_tag.find("height=\"") {
            let h_val = &svg_tag[h_start + 8..];
            if let Some(h_end) = h_val.find('"') {
                let h_str = &h_val[..h_end];
                let numeric: String = h_str.chars().take_while(|c| c.is_ascii_digit() || *c == '.').collect();
                height = numeric.parse::<f64>().unwrap_or(0.0) as u32;
            }
        }
    }
    
    (width, height)
}

/// Check if a file path is an image
#[tauri::command]
pub async fn check_is_image(file_path: String) -> Result<bool, String> {
    Ok(is_image_file(&file_path))
}

/// Get image data for diff comparison (old and new versions)
#[tauri::command]
pub async fn get_image_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
) -> Result<ImageDiffResult, String> {
    let normalized_path = normalize_unicode(&file_path);
    
    if !is_image_file(&normalized_path) {
        return Ok(ImageDiffResult {
            old_image: None,
            new_image: None,
            is_image: false,
            file_path: normalized_path,
        });
    }
    
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // Get the OLD image (from HEAD or index)
    let old_image = get_old_image_data(&repo, &normalized_path, staged);
    
    // Get the NEW image (from index for staged, or working directory for unstaged)
    let new_image = get_new_image_data(&repo, &repo_path, &normalized_path, staged);
    
    Ok(ImageDiffResult {
        old_image,
        new_image,
        is_image: true,
        file_path: normalized_path,
    })
}

/// Get old version of image from HEAD tree
fn get_old_image_data(repo: &Repository, file_path: &str, staged: bool) -> Option<ImageData> {
    // For both staged and unstaged, the "old" version is from HEAD
    let head = repo.head().ok()?;
    let tree = head.peel_to_tree().ok()?;
    let entry = tree.get_path(Path::new(file_path)).ok()?;
    let object = entry.to_object(repo).ok()?;
    let blob = object.as_blob()?;
    
    Some(build_image_data(blob.content(), file_path))
}

/// Get new version of image
fn get_new_image_data(repo: &Repository, repo_path: &str, file_path: &str, staged: bool) -> Option<ImageData> {
    if staged {
        // For staged: get from index
        let index = repo.index().ok()?;
        let entry = index.get_path(Path::new(file_path), 0)?;
        let oid = entry.id;
        let blob = repo.find_blob(oid).ok()?;
        Some(build_image_data(blob.content(), file_path))
    } else {
        // For unstaged: get from working directory
        let full_path = Path::new(repo_path).join(file_path);
        let data = std::fs::read(&full_path).ok()?;
        Some(build_image_data(&data, file_path))
    }
}

/// Get image data at a specific commit
#[tauri::command]
pub async fn get_image_at_commit(
    repo_path: String,
    file_path: String,
    commit_id: String,
) -> Result<Option<ImageData>, String> {
    let normalized_path = normalize_unicode(&file_path);
    
    if !is_image_file(&normalized_path) {
        return Ok(None);
    }
    
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let oid = Oid::from_str(&commit_id).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;
    
    let entry = tree
        .get_path(Path::new(&normalized_path))
        .map_err(|e| e.to_string())?;
    let object = entry.to_object(&repo).map_err(|e| e.to_string())?;
    let blob = object.as_blob().ok_or("Not a blob")?;
    
    Ok(Some(build_image_data(blob.content(), &normalized_path)))
}
