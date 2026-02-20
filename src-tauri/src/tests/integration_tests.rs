/// 통합 테스트: 실제 Tauri Commands 테스트
use crate::commands::git::*;
use crate::commands::branch::*;
use crate::tests::korean_encoding_tests::TestRepo;
use serial_test::serial;
use std::time::Instant;

#[tokio::test]
#[serial]
async fn test_command_stage_file_korean() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    // 한글 파일 생성
    let korean_file = "한글파일.txt";
    test_repo.create_file(korean_file, "테스트 내용").unwrap();
    
    // Command 테스트
    let result = stage_file(repo_path.clone(), korean_file.to_string()).await;
    assert!(result.is_ok(), "한글 파일 Stage 실패: {:?}", result.err());
    
    // 상태 확인
    let status = get_repository_status(repo_path).await.unwrap();
    let staged_file = status.iter().find(|f| f.path == korean_file);
    
    assert!(staged_file.is_some(), "Staged 파일 목록에 없음");
    assert!(staged_file.unwrap().staged, "파일이 Stage 되지 않음");
}

#[tokio::test]
#[serial]
async fn test_command_unstage_file_korean() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    let korean_file = "테스트파일.js";
    test_repo.create_file(korean_file, "console.log('test');").unwrap();
    test_repo.stage_file(korean_file).unwrap();
    
    // Unstage Command
    let result = unstage_file(repo_path.clone(), korean_file.to_string()).await;
    assert!(result.is_ok(), "Unstage 실패: {:?}", result.err());
    
    // 상태 확인
    let status = get_repository_status(repo_path).await.unwrap();
    let file = status.iter().find(|f| f.path == korean_file).unwrap();
    
    assert!(!file.staged, "파일이 여전히 Staged 상태");
}

#[tokio::test]
#[serial]
async fn test_command_create_commit_korean() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    // 파일 생성 및 Stage
    test_repo.create_file("test.txt", "content").unwrap();
    stage_file(repo_path.clone(), "test.txt".to_string()).await.unwrap();
    
    // 한글 커밋 메시지
    let korean_message = "기능: 사용자 대시보드 추가\n\n- 통계 차트 구현\n- 실시간 업데이트";
    
    let result = create_commit(repo_path.clone(), korean_message.to_string()).await;
    assert!(result.is_ok(), "커밋 생성 실패: {:?}", result.err());
    
    // 커밋 확인
    let commits = get_commit_history(repo_path, 1).await.unwrap();
    assert_eq!(commits.len(), 1);
    assert_eq!(commits[0].message, korean_message);
}

#[tokio::test]
#[serial]
async fn test_command_stage_all_with_korean_files() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    // 여러 한글 파일 생성
    let files = vec![
        "파일1.txt",
        "파일2.js",
        "디렉토리/파일3.css",
    ];
    
    for file in &files {
        if file.contains('/') {
            let dir = test_repo.path.join("디렉토리");
            std::fs::create_dir_all(&dir).unwrap();
        }
        test_repo.create_file(file, "content").unwrap();
    }
    
    // 모두 Stage
    let result = stage_all(repo_path.clone()).await;
    assert!(result.is_ok(), "Stage All 실패: {:?}", result.err());
    
    // 모든 파일이 Staged 되었는지 확인
    let status = get_repository_status(repo_path).await.unwrap();
    let staged_count = status.iter().filter(|f| f.staged).count();
    
    assert_eq!(staged_count, files.len(), "모든 파일이 Stage 되지 않음");
}

#[tokio::test]
#[serial]
async fn test_command_commit_history_korean() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    // 여러 개의 한글 커밋 생성
    let messages = vec![
        "첫 번째 커밋: 프로젝트 초기화",
        "두 번째 커밋: 로그인 기능 추가",
        "세 번째 커밋: 버그 수정 - 한글 입력 오류",
    ];
    
    for (i, msg) in messages.iter().enumerate() {
        let filename = format!("file{}.txt", i);
        test_repo.create_file(&filename, "content").unwrap();
        stage_file(repo_path.clone(), filename).await.unwrap();
        create_commit(repo_path.clone(), msg.to_string()).await.unwrap();
    }
    
    // 커밋 히스토리 확인
    let history = get_commit_history(repo_path, 10).await.unwrap();
    assert_eq!(history.len(), 3);
    
    // 순서 확인 (최신이 먼저)
    assert_eq!(history[0].message, messages[2]);
    assert_eq!(history[1].message, messages[1]);
    assert_eq!(history[2].message, messages[0]);
}

#[tokio::test]
#[serial]
async fn test_command_korean_author_in_commit_history() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    // 한글 작성자 설정
    let mut config = test_repo.repo.config().unwrap();
    config.set_str("user.name", "김철수").unwrap();
    
    test_repo.create_file("test.txt", "content").unwrap();
    stage_file(repo_path.clone(), "test.txt".to_string()).await.unwrap();
    create_commit(repo_path.clone(), "테스트 커밋".to_string()).await.unwrap();
    
    let history = get_commit_history(repo_path, 1).await.unwrap();
    assert_eq!(history[0].author, "김철수");
}

#[tokio::test]
#[serial]
async fn test_full_workflow_korean() {
    // 완전한 워크플로우 테스트
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    // 1. 한글 파일 생성
    test_repo.create_file("사용자인증.js", "// 한글 코드").unwrap();
    test_repo.create_file("README.md", "# 한글 프로젝트").unwrap();
    
    // 2. 상태 확인
    let status = get_repository_status(repo_path.clone()).await.unwrap();
    assert_eq!(status.len(), 2);
    
    // 3. 선택적 Stage
    stage_file(repo_path.clone(), "사용자인증.js".to_string()).await.unwrap();
    
    let status = get_repository_status(repo_path.clone()).await.unwrap();
    let staged = status.iter().filter(|f| f.staged).count();
    assert_eq!(staged, 1);
    
    // 4. 한글 커밋
    let commit_msg = "기능: 사용자 인증 모듈 추가";
    create_commit(repo_path.clone(), commit_msg.to_string()).await.unwrap();
    
    // 5. 히스토리 확인
    let history = get_commit_history(repo_path.clone(), 1).await.unwrap();
    assert_eq!(history[0].message, commit_msg);
    
    // 6. 남은 파일 Stage
    stage_file(repo_path.clone(), "README.md".to_string()).await.unwrap();
    
    // 7. 두 번째 커밋
    let commit_msg2 = "문서: README 작성";
    create_commit(repo_path.clone(), commit_msg2.to_string()).await.unwrap();
    
    // 8. 전체 히스토리 확인
    let history = get_commit_history(repo_path, 10).await.unwrap();
    assert_eq!(history.len(), 2);
    assert_eq!(history[0].message, commit_msg2);
    assert_eq!(history[1].message, commit_msg);
}

// ========================================
// 브랜치 관리 통합 테스트
// ========================================

#[tokio::test]
#[serial]
async fn test_command_get_branches() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    // 초기 커밋
    test_repo.create_file("test.txt", "initial").unwrap();
    stage_file(repo_path.clone(), "test.txt".to_string()).await.unwrap();
    create_commit(repo_path.clone(), "Initial commit".to_string()).await.unwrap();
    
    // 브랜치 생성
    create_branch(repo_path.clone(), "feature/test".to_string()).await.unwrap();
    create_branch(repo_path.clone(), "기능/테스트".to_string()).await.unwrap();
    
    // 브랜치 목록 조회
    let branches = get_branches(repo_path).await.unwrap();
    let branch_names: Vec<String> = branches.iter().map(|b| b.name.clone()).collect();
    
    assert!(branch_names.contains(&"feature/test".to_string()));
    assert!(branch_names.contains(&"기능/테스트".to_string()));
}

#[tokio::test]
#[serial]
async fn test_command_create_korean_branch() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    test_repo.create_file("test.txt", "initial").unwrap();
    stage_file(repo_path.clone(), "test.txt".to_string()).await.unwrap();
    create_commit(repo_path.clone(), "Initial commit".to_string()).await.unwrap();
    
    // 한글 브랜치 생성
    let korean_branch = "기능/사용자인증";
    let result = create_branch(repo_path.clone(), korean_branch.to_string()).await;
    
    assert!(result.is_ok(), "한글 브랜치 생성 실패: {:?}", result.err());
    
    // 확인
    let branches = get_branches(repo_path).await.unwrap();
    let found = branches.iter().any(|b| b.name == korean_branch);
    assert!(found, "한글 브랜치가 목록에 없음");
}

#[tokio::test]
#[serial]
async fn test_command_switch_branch() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    test_repo.create_file("test.txt", "initial").unwrap();
    stage_file(repo_path.clone(), "test.txt".to_string()).await.unwrap();
    create_commit(repo_path.clone(), "Initial commit".to_string()).await.unwrap();
    
    let branch_name = "feature/new";
    create_branch(repo_path.clone(), branch_name.to_string()).await.unwrap();
    
    // 브랜치 전환
    let result = switch_branch(repo_path.clone(), branch_name.to_string()).await;
    assert!(result.is_ok(), "브랜치 전환 실패: {:?}", result.err());
    
    // 현재 브랜치 확인
    let current = get_current_branch(repo_path).await.unwrap();
    assert_eq!(current, branch_name);
}

#[tokio::test]
#[serial]
async fn test_command_switch_korean_branch() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    test_repo.create_file("test.txt", "initial").unwrap();
    stage_file(repo_path.clone(), "test.txt".to_string()).await.unwrap();
    create_commit(repo_path.clone(), "Initial commit".to_string()).await.unwrap();
    
    let korean_branch = "기능/대시보드";
    create_branch(repo_path.clone(), korean_branch.to_string()).await.unwrap();
    
    let result = switch_branch(repo_path.clone(), korean_branch.to_string()).await;
    assert!(result.is_ok());
    
    let current = get_current_branch(repo_path).await.unwrap();
    assert_eq!(current, korean_branch);
}

#[tokio::test]
#[serial]
async fn test_command_delete_branch() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    test_repo.create_file("test.txt", "initial").unwrap();
    stage_file(repo_path.clone(), "test.txt".to_string()).await.unwrap();
    create_commit(repo_path.clone(), "Initial commit".to_string()).await.unwrap();
    
    let branch_name = "to-delete";
    create_branch(repo_path.clone(), branch_name.to_string()).await.unwrap();
    
    // 삭제
    let result = delete_branch(repo_path.clone(), branch_name.to_string()).await;
    assert!(result.is_ok());
    
    // 확인
    let branches = get_branches(repo_path).await.unwrap();
    let found = branches.iter().any(|b| b.name == branch_name);
    assert!(!found, "브랜치가 삭제되지 않음");
}

#[tokio::test]
#[serial]
async fn test_command_branch_performance() {
    let test_repo = TestRepo::new().unwrap();
    let repo_path = test_repo.path.to_str().unwrap().to_string();
    
    test_repo.create_file("test.txt", "initial").unwrap();
    stage_file(repo_path.clone(), "test.txt".to_string()).await.unwrap();
    create_commit(repo_path.clone(), "Initial commit".to_string()).await.unwrap();
    
    // 브랜치 생성 속도
    let start = Instant::now();
    for i in 0..10 {
        create_branch(repo_path.clone(), format!("branch-{}", i)).await.unwrap();
    }
    let create_duration = start.elapsed();
    
    // 브랜치 목록 조회 속도
    let start = Instant::now();
    let _branches = get_branches(repo_path.clone()).await.unwrap();
    let list_duration = start.elapsed();
    
    // 브랜치 전환 속도
    let start = Instant::now();
    switch_branch(repo_path.clone(), "branch-5".to_string()).await.unwrap();
    let switch_duration = start.elapsed();
    
    println!("┌────────────────────────────────────────┐");
    println!("│ 브랜치 작업 성능 벤치마크              │");
    println!("├────────────────────────────────────────┤");
    println!("│ 10개 브랜치 생성: {:?}", create_duration);
    println!("│ 브랜치 목록 조회: {:?}", list_duration);
    println!("│ 브랜치 전환: {:?}", switch_duration);
    println!("└────────────────────────────────────────┘");
    
    assert!(create_duration.as_millis() < 500, "브랜치 생성 느림: {:?}", create_duration);
    assert!(list_duration.as_millis() < 100, "목록 조회 느림: {:?}", list_duration);
    assert!(switch_duration.as_millis() < 100, "전환 느림: {:?}", switch_duration);
}
