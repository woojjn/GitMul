// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::amend::{amend_commit, get_last_commit_message};
use commands::branch::{
    create_branch, delete_branch, get_current_branch, list_branches, rename_branch, switch_branch,
};
use commands::cherrypick::{cherry_pick, cherry_pick_abort, cherry_pick_continue};
use commands::conflict::{abort_merge, get_conflicts, resolve_conflict};
use commands::diff::{
    check_is_image, get_commit_diff, get_commit_file_changes, get_diff_stats, get_file_content,
    get_file_diff, get_image_at_commit, get_image_diff, parse_diff,
};
use commands::git::{
    create_commit, get_commit_history, get_repository_status, open_repository, stage_all,
    stage_file, unstage_file,
};
use commands::history::{get_file_at_commit, get_file_history};
use commands::merge::{can_merge, get_merge_conflicts, merge_branch};
use commands::rebase::{get_rebase_status, rebase_abort, rebase_continue, start_rebase};
use commands::reflog::{get_reflog, reset_to_reflog};
use commands::remote::{
    add_remote, check_remote_connection, fetch_remote, get_remote_branches, get_sync_progress,
    list_remotes, pull_changes, push_changes, remove_remote,
};
use commands::repos::{add_recent_repo, get_recent_repos};
use commands::revert::revert_commit;
use commands::stash::{stash_apply, stash_drop, stash_list, stash_pop, stash_save};
use commands::tags::{create_annotated_tag, create_tag, delete_tag, list_tags, push_tag};
use commands::bundle::{
    list_bundle_refs, create_bundle, verify_bundle, fetch_from_bundle, clone_from_bundle,
};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Repository core
            open_repository,
            get_commit_history,
            get_repository_status,
            stage_file,
            unstage_file,
            stage_all,
            create_commit,
            // Recent repos
            get_recent_repos,
            add_recent_repo,
            // Branch
            list_branches,
            create_branch,
            switch_branch,
            delete_branch,
            rename_branch,
            get_current_branch,
            // Diff
            get_file_diff,
            get_commit_diff,
            get_commit_file_changes,
            parse_diff,
            get_file_content,
            get_diff_stats,
            check_is_image,
            get_image_diff,
            get_image_at_commit,
            // Remote
            list_remotes,
            add_remote,
            remove_remote,
            fetch_remote,
            pull_changes,
            push_changes,
            get_remote_branches,
            get_sync_progress,
            check_remote_connection,
            // Amend
            amend_commit,
            get_last_commit_message,
            // Stash
            stash_save,
            stash_list,
            stash_apply,
            stash_pop,
            stash_drop,
            // Merge
            merge_branch,
            can_merge,
            get_merge_conflicts,
            // Conflict Resolution
            get_conflicts,
            resolve_conflict,
            abort_merge,
            // Cherry-pick
            cherry_pick,
            cherry_pick_continue,
            cherry_pick_abort,
            // Revert
            revert_commit,
            // Tags
            list_tags,
            create_tag,
            create_annotated_tag,
            delete_tag,
            push_tag,
            // File History
            get_file_history,
            get_file_at_commit,
            // Rebase
            start_rebase,
            rebase_continue,
            rebase_abort,
            get_rebase_status,
            // Reflog
            get_reflog,
            reset_to_reflog,
            // Bundle
            list_bundle_refs,
            create_bundle,
            verify_bundle,
            fetch_from_bundle,
            clone_from_bundle,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
