// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

#[cfg(test)]
mod tests;

#[cfg(test)]
mod diff_tests;

#[cfg(test)]
mod remote_tests;

use commands::
    git::{
        open_repository, 
        get_commit_history, 
        get_repository_status,
        stage_file,
        unstage_file,
        stage_all,
        create_commit
    },
    repos::{get_recent_repos, add_recent_repo},
    branch::{
        list_branches,
        create_branch,
        switch_branch,
        delete_branch,
        rename_branch,
        get_current_branch
    },
    diff::{
        get_file_diff,
        get_commit_diff,
        parse_diff,
        get_file_content,
        get_diff_stats
    },
    remote::{
        list_remotes,
        add_remote,
        remove_remote,
        fetch_remote,
        pull_changes,
        push_changes,
        get_remote_branches,
        get_sync_progress,
        check_remote_connection
    },
    amend::{amend_commit, get_last_commit_message},
    stash::{stash_save, stash_list, stash_apply, stash_pop, stash_drop},
    merge::{merge_branch, can_merge, get_merge_conflicts},
    conflict::{get_conflicts, resolve_conflict, abort_merge},
    cherrypick::{cherry_pick, cherry_pick_continue, cherry_pick_abort},
    revert::{revert_commit},
    tags::{list_tags, create_tag, create_annotated_tag, delete_tag, push_tag},
    history::{get_file_history, get_file_at_commit},
    rebase::{start_rebase, rebase_continue, rebase_abort, get_rebase_status},
    reflog::{get_reflog, reset_to_reflog}
};

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
            pull_changes,
            push_changes,
            get_remote_branches,
            get_sync_progress,
            check_remote_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
