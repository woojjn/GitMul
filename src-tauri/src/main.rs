// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;


use commands::git::{
    open_repository, 
    get_commit_history, 
    get_repository_status,
    stage_file,
    unstage_file,
    stage_all,
    create_commit
};
use commands::repos::{get_recent_repos, add_recent_repo};
use commands::branch::{
    list_branches,
    create_branch,
    switch_branch,
    delete_branch,
    rename_branch,
    get_current_branch
};
use commands::diff::{
    get_file_diff,
    get_commit_diff,
    parse_diff,
    get_file_content,
    get_diff_stats,
    check_is_image,
    get_image_diff,
    get_image_at_commit
};
use commands::remote::{
    list_remotes,
    add_remote,
    remove_remote,
    fetch_remote,
    pull_changes,
    push_changes,
    get_remote_branches,
    get_sync_progress,
    check_remote_connection
};
use commands::amend::{amend_commit, get_last_commit_message};
use commands::stash::{stash_save, stash_list, stash_apply, stash_pop, stash_drop};
use commands::merge::{merge_branch, can_merge, get_merge_conflicts};
use commands::conflict::{get_conflicts, resolve_conflict, abort_merge};
use commands::cherrypick::{cherry_pick, cherry_pick_continue, cherry_pick_abort};
use commands::revert::revert_commit;
use commands::tags::{list_tags, create_tag, create_annotated_tag, delete_tag, push_tag};
use commands::history::{get_file_history, get_file_at_commit};
use commands::rebase::{start_rebase, rebase_continue, rebase_abort, get_rebase_status};
use commands::reflog::{get_reflog, reset_to_reflog};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_repository,
            get_commit_history,
            get_repository_status,
            stage_file,
            unstage_file,
            stage_all,
            create_commit,
            get_recent_repos,
            add_recent_repo,
            list_branches,
            create_branch,
            switch_branch,
            delete_branch,
            rename_branch,
            get_current_branch,
            get_file_diff,
            get_commit_diff,
            parse_diff,
            get_file_content,
            get_diff_stats,
            // v1.6 Image Diff
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
            // v1.3 commands
            amend_commit,
            get_last_commit_message,
            stash_save,
            stash_list,
            stash_apply,
            stash_pop,
            stash_drop,
            merge_branch,
            can_merge,
            get_merge_conflicts,
            // v1.3 Conflict Resolution
            get_conflicts,
            resolve_conflict,
            abort_merge,
            // v1.4 Cherry-pick
            cherry_pick,
            cherry_pick_continue,
            cherry_pick_abort,
            // v1.4 Revert
            revert_commit,
            // v1.4 Tags
            list_tags,
            create_tag,
            create_annotated_tag,
            delete_tag,
            push_tag,
            // v1.4 File History
            get_file_history,
            get_file_at_commit,
            // v1.5 Interactive Rebase
            start_rebase,
            rebase_continue,
            rebase_abort,
            get_rebase_status,
            // v1.5 Reflog
            get_reflog,
            reset_to_reflog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
