use git2::{DiffOptions, Oid, Repository};
use std::path::Path;

use super::models::{
    DiffHunk, DiffLine, DiffStat, ImageData, ImageDiffResult, ParsedDiff,
};
use super::utils::{normalize_unicode, open_repo};

// ============================================================================
// Text Diff Commands
// ============================================================================

/// Get diff for a specific file (staged or unstaged).
#[tauri::command]
pub async fn get_file_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
) -> Result<String, String> {
    let normalized_path = normalize_unicode(&file_path);
    let repo = open_repo(&repo_path)?;

    let mut opts = DiffOptions::new();
    opts.pathspec(&normalized_path);
    opts.context_lines(3);
    opts.interhunk_lines(0);

    let diff = if staged {
        let head = repo.head().map_err(|e| format!("HEAD 접근 실패: {}", e))?;
        let head_tree = head.peel_to_tree().map_err(|e| format!("트리 접근 실패: {}", e))?;
        let mut index = repo.index().map_err(|e| format!("인덱스 접근 실패: {}", e))?;
        let index_tree = repo
            .find_tree(index.write_tree().map_err(|e| format!("트리 쓰기 실패: {}", e))?)
            .map_err(|e| format!("트리 찾기 실패: {}", e))?;
        repo.diff_tree_to_tree(Some(&head_tree), Some(&index_tree), Some(&mut opts))
            .map_err(|e| format!("Diff 생성 실패: {}", e))?
    } else {
        repo.diff_index_to_workdir(None, Some(&mut opts))
            .map_err(|e| format!("Diff 생성 실패: {}", e))?
    };

    let mut patch_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let content = String::from_utf8_lossy(line.content());
        patch_text.push_str(&content);
        true
    })
    .map_err(|e| format!("Diff 출력 실패: {}", e))?;

    Ok(patch_text)
}

/// Get diff for a specific commit.
#[tauri::command]
pub async fn get_commit_diff(repo_path: String, commit_id: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let oid = Oid::from_str(&commit_id).map_err(|e| format!("잘못된 커밋 SHA: {}", e))?;
    let commit = repo.find_commit(oid).map_err(|e| format!("커밋 찾기 실패: {}", e))?;

    let commit_tree = commit.tree().map_err(|e| format!("트리 접근 실패: {}", e))?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(
            commit
                .parent(0)
                .map_err(|e| format!("부모 커밋 접근 실패: {}", e))?
                .tree()
                .map_err(|e| format!("부모 트리 접근 실패: {}", e))?,
        )
    } else {
        None
    };

    let mut opts = DiffOptions::new();
    opts.context_lines(3);

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&commit_tree), Some(&mut opts))
        .map_err(|e| format!("Diff 생성 실패: {}", e))?;

    let mut patch_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let content = String::from_utf8_lossy(line.content());
        patch_text.push_str(&content);
        true
    })
    .map_err(|e| format!("Diff 출력 실패: {}", e))?;

    Ok(patch_text)
}

/// Parse unified diff format into structured data.
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
            if let Some(hunk) = current_hunk.take() {
                hunks.push(hunk);
            }

            let header = line.to_string();
            let parts: Vec<&str> = line.split_whitespace().collect();

            if parts.len() >= 3 {
                let old_range = parts[1].trim_start_matches('-');
                let old_parts: Vec<&str> = old_range.split(',').collect();
                let old_start = old_parts[0].parse::<u32>().unwrap_or(1);
                let old_lines_count = if old_parts.len() > 1 {
                    old_parts[1].parse::<u32>().unwrap_or(1)
                } else {
                    1
                };

                let new_range = parts[2].trim_start_matches('+');
                let new_parts: Vec<&str> = new_range.split(',').collect();
                let new_start = new_parts[0].parse::<u32>().unwrap_or(1);
                let new_lines_count = if new_parts.len() > 1 {
                    new_parts[1].parse::<u32>().unwrap_or(1)
                } else {
                    1
                };

                old_line_no = old_start;
                new_line_no = new_start;

                current_hunk = Some(DiffHunk {
                    old_start,
                    old_lines: old_lines_count,
                    new_start,
                    new_lines: new_lines_count,
                    header,
                    lines: Vec::new(),
                });
            }
        } else if let Some(ref mut hunk) = current_hunk {
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

/// Get file content at a specific commit (or current working directory).
#[tauri::command]
pub async fn get_file_content(
    repo_path: String,
    file_path: String,
    commit_id: Option<String>,
) -> Result<String, String> {
    let normalized_path = normalize_unicode(&file_path);
    let repo = open_repo(&repo_path)?;

    if let Some(commit_str) = commit_id {
        let oid = Oid::from_str(&commit_str).map_err(|e| format!("잘못된 커밋 SHA: {}", e))?;
        let commit = repo.find_commit(oid).map_err(|e| format!("커밋 찾기 실패: {}", e))?;
        let tree = commit.tree().map_err(|e| format!("트리 접근 실패: {}", e))?;

        let entry = tree
            .get_path(std::path::Path::new(&normalized_path))
            .map_err(|e| format!("파일 찾기 실패: {}", e))?;

        let object = entry
            .to_object(&repo)
            .map_err(|e| format!("오브젝트 접근 실패: {}", e))?;
        let blob = object.as_blob().ok_or("Blob이 아닙니다")?;
        Ok(String::from_utf8_lossy(blob.content()).to_string())
    } else {
        let full_path = std::path::Path::new(&repo_path).join(&normalized_path);
        std::fs::read_to_string(full_path).map_err(|e| format!("파일 읽기 실패: {}", e))
    }
}

/// Get per-file diff statistics.
#[tauri::command]
pub async fn get_diff_stats(repo_path: String, staged: bool) -> Result<Vec<DiffStat>, String> {
    let repo = open_repo(&repo_path)?;

    let diff = if staged {
        let head = repo.head().map_err(|e| format!("HEAD 접근 실패: {}", e))?;
        let head_tree = head.peel_to_tree().map_err(|e| format!("트리 접근 실패: {}", e))?;
        let mut index = repo.index().map_err(|e| format!("인덱스 접근 실패: {}", e))?;
        let index_tree = repo
            .find_tree(index.write_tree().map_err(|e| format!("트리 쓰기 실패: {}", e))?)
            .map_err(|e| format!("트리 찾기 실패: {}", e))?;
        repo.diff_tree_to_tree(Some(&head_tree), Some(&index_tree), None)
            .map_err(|e| format!("Diff 생성 실패: {}", e))?
    } else {
        repo.diff_index_to_workdir(None, None)
            .map_err(|e| format!("Diff 생성 실패: {}", e))?
    };

    let mut stats = Vec::new();

    // Step 1: Collect file paths and binary flags
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
    .map_err(|e| format!("Diff 순회 실패: {}", e))?;

    // Step 2: Count per-file additions and deletions
    if !stats.is_empty() {
        use std::cell::Cell;
        let current_file_idx: Cell<i32> = Cell::new(-1);
        diff.foreach(
            &mut |_delta, _progress| {
                current_file_idx.set(current_file_idx.get() + 1);
                true
            },
            None,
            None,
            Some(&mut |_delta, _hunk, line| {
                let idx = current_file_idx.get() as usize;
                if idx < stats.len() {
                    match line.origin() {
                        '+' => stats[idx].additions += 1,
                        '-' => stats[idx].deletions += 1,
                        _ => {}
                    }
                }
                true
            }),
        )
        .map_err(|e| format!("Diff 통계 수집 실패: {}", e))?;
    }

    Ok(stats)
}

// ============================================================================
// Image Diff Support
// ============================================================================

/// Known image file extensions.
const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico", "tiff", "tif",
];

fn is_image_file(path: &str) -> bool {
    let path_lower = path.to_lowercase();
    IMAGE_EXTENSIONS
        .iter()
        .any(|ext| path_lower.ends_with(&format!(".{}", ext)))
}

fn get_mime_type(path: &str) -> String {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "tiff" | "tif" => "image/tiff",
        _ => "application/octet-stream",
    }
    .to_string()
}

fn get_format_name(path: &str) -> String {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "png" => "PNG",
        "jpg" | "jpeg" => "JPEG",
        "gif" => "GIF",
        "svg" => "SVG",
        "webp" => "WebP",
        "bmp" => "BMP",
        "ico" => "ICO",
        "tiff" | "tif" => "TIFF",
        _ => return ext.to_uppercase(),
    }
    .to_string()
}

fn parse_png_dimensions(data: &[u8]) -> (u32, u32) {
    if data.len() >= 24 && &data[0..8] == b"\x89PNG\r\n\x1a\n" {
        let width = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
        let height = u32::from_be_bytes([data[20], data[21], data[22], data[23]]);
        return (width, height);
    }
    (0, 0)
}

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
        if (marker == 0xC0 || marker == 0xC2) && i + 9 < data.len() {
            let height = u16::from_be_bytes([data[i + 5], data[i + 6]]) as u32;
            let width = u16::from_be_bytes([data[i + 7], data[i + 8]]) as u32;
            return (width, height);
        }
        if i + 3 < data.len() {
            let len = u16::from_be_bytes([data[i + 2], data[i + 3]]) as usize;
            i += 2 + len;
        } else {
            break;
        }
    }
    (0, 0)
}

fn parse_gif_dimensions(data: &[u8]) -> (u32, u32) {
    if data.len() >= 10 && (data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a")) {
        let width = u16::from_le_bytes([data[6], data[7]]) as u32;
        let height = u16::from_le_bytes([data[8], data[9]]) as u32;
        return (width, height);
    }
    (0, 0)
}

fn parse_webp_dimensions(data: &[u8]) -> (u32, u32) {
    if data.len() >= 30 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        if &data[12..16] == b"VP8 " && data.len() >= 30 {
            if data[23] == 0x9D && data[24] == 0x01 && data[25] == 0x2A {
                let width = u16::from_le_bytes([data[26], data[27]]) as u32 & 0x3FFF;
                let height = u16::from_le_bytes([data[28], data[29]]) as u32 & 0x3FFF;
                return (width, height);
            }
        }
        if &data[12..16] == b"VP8L" && data.len() >= 25 {
            let bits = u32::from_le_bytes([data[21], data[22], data[23], data[24]]);
            let width = (bits & 0x3FFF) + 1;
            let height = ((bits >> 14) & 0x3FFF) + 1;
            return (width, height);
        }
    }
    (0, 0)
}

fn parse_svg_dimensions(data: &[u8]) -> (u32, u32) {
    let content = String::from_utf8_lossy(data);
    let mut width = 0u32;
    let mut height = 0u32;

    if let Some(svg_start) = content.find("<svg") {
        let svg_tag = &content[svg_start..content[svg_start..]
            .find('>')
            .map(|i| svg_start + i + 1)
            .unwrap_or(content.len())];

        if let Some(w_start) = svg_tag.find("width=\"") {
            let w_val = &svg_tag[w_start + 7..];
            if let Some(w_end) = w_val.find('"') {
                let numeric: String = w_val[..w_end]
                    .chars()
                    .take_while(|c| c.is_ascii_digit() || *c == '.')
                    .collect();
                width = numeric.parse::<f64>().unwrap_or(0.0) as u32;
            }
        }
        if let Some(h_start) = svg_tag.find("height=\"") {
            let h_val = &svg_tag[h_start + 8..];
            if let Some(h_end) = h_val.find('"') {
                let numeric: String = h_val[..h_end]
                    .chars()
                    .take_while(|c| c.is_ascii_digit() || *c == '.')
                    .collect();
                height = numeric.parse::<f64>().unwrap_or(0.0) as u32;
            }
        }
    }
    (width, height)
}

fn parse_image_dimensions(data: &[u8], format: &str) -> (u32, u32) {
    match format {
        "PNG" => parse_png_dimensions(data),
        "JPEG" => parse_jpeg_dimensions(data),
        "GIF" => parse_gif_dimensions(data),
        "WebP" => parse_webp_dimensions(data),
        _ => (0, 0),
    }
}

fn build_image_data(data: &[u8], file_path: &str) -> ImageData {
    use base64::Engine;
    let mime_type = get_mime_type(file_path);
    let format = get_format_name(file_path);
    let (mut width, mut height) = parse_image_dimensions(data, &format);

    if format == "SVG" && width == 0 && height == 0 {
        let dims = parse_svg_dimensions(data);
        width = dims.0;
        height = dims.1;
    }

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

/// Check if a file path is an image.
#[tauri::command]
pub async fn check_is_image(file_path: String) -> Result<bool, String> {
    Ok(is_image_file(&file_path))
}

/// Get image data for diff comparison (old and new versions).
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

    let repo = open_repo(&repo_path)?;
    let old_image = get_old_image_data(&repo, &normalized_path);
    let new_image = get_new_image_data(&repo, &repo_path, &normalized_path, staged);

    Ok(ImageDiffResult {
        old_image,
        new_image,
        is_image: true,
        file_path: normalized_path,
    })
}

fn get_old_image_data(repo: &Repository, file_path: &str) -> Option<ImageData> {
    let head = repo.head().ok()?;
    let tree = head.peel_to_tree().ok()?;
    let entry = tree.get_path(Path::new(file_path)).ok()?;
    let object = entry.to_object(repo).ok()?;
    let blob = object.as_blob()?;
    Some(build_image_data(blob.content(), file_path))
}

fn get_new_image_data(
    repo: &Repository,
    repo_path: &str,
    file_path: &str,
    staged: bool,
) -> Option<ImageData> {
    if staged {
        let index = repo.index().ok()?;
        let entry = index.get_path(Path::new(file_path), 0)?;
        let blob = repo.find_blob(entry.id).ok()?;
        Some(build_image_data(blob.content(), file_path))
    } else {
        let full_path = Path::new(repo_path).join(file_path);
        let data = std::fs::read(&full_path).ok()?;
        Some(build_image_data(&data, file_path))
    }
}

/// Get image data at a specific commit.
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

    let repo = open_repo(&repo_path)?;
    let oid = Oid::from_str(&commit_id).map_err(|e| format!("잘못된 커밋 SHA: {}", e))?;
    let commit = repo.find_commit(oid).map_err(|e| format!("커밋 찾기 실패: {}", e))?;
    let tree = commit.tree().map_err(|e| format!("트리 접근 실패: {}", e))?;

    let entry = tree
        .get_path(Path::new(&normalized_path))
        .map_err(|e| format!("파일 찾기 실패: {}", e))?;
    let object = entry
        .to_object(&repo)
        .map_err(|e| format!("오브젝트 접근 실패: {}", e))?;
    let blob = object.as_blob().ok_or("Blob이 아닙니다")?;

    Ok(Some(build_image_data(blob.content(), &normalized_path)))
}
