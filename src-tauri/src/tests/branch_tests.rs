use crate::tests::korean_encoding_tests::TestRepo;
use serial_test::serial;
use std::time::Instant;

/// 브랜치 관리 테스트
#[cfg(test)]
mod branch_tests {
    use super::*;

    #[test]
    #[serial]
    fn test_create_branch() {
        let test_repo = TestRepo::new().unwrap();
        
        // 초기 커밋 생성 (브랜치는 커밋이 있어야 생성 가능)
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        // 브랜치 생성
        let branch_name = "feature/new-feature";
        let branch = test_repo.repo.branch(branch_name, &test_repo.get_last_commit().unwrap(), false);
        
        assert!(branch.is_ok(), "브랜치 생성 실패");
    }

    #[test]
    #[serial]
    fn test_create_korean_branch() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        // 한글 브랜치명
        let korean_branch = "기능/사용자인증";
        let branch = test_repo.repo.branch(korean_branch, &test_repo.get_last_commit().unwrap(), false);
        
        assert!(branch.is_ok(), "한글 브랜치 생성 실패: {:?}", branch.err());
    }

    #[test]
    #[serial]
    fn test_list_branches() {
        let test_repo = TestRepo::new().unwrap();
        
        // 초기 커밋
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 여러 브랜치 생성
        test_repo.repo.branch("feature/auth", &commit, false).unwrap();
        test_repo.repo.branch("feature/dashboard", &commit, false).unwrap();
        test_repo.repo.branch("기능/한글브랜치", &commit, false).unwrap();
        
        // 브랜치 목록 조회
        let branches = test_repo.repo.branches(None).unwrap();
        let branch_names: Vec<String> = branches
            .filter_map(|b| b.ok())
            .filter_map(|(branch, _)| branch.name().ok().flatten().map(|s| s.to_string()))
            .collect();
        
        assert!(branch_names.contains(&"feature/auth".to_string()));
        assert!(branch_names.contains(&"feature/dashboard".to_string()));
        assert!(branch_names.contains(&"기능/한글브랜치".to_string()));
        assert!(branch_names.len() >= 4, "브랜치 수: {} (main 포함)", branch_names.len());
    }

    #[test]
    #[serial]
    fn test_switch_branch() {
        let test_repo = TestRepo::new().unwrap();
        
        // 초기 커밋
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 새 브랜치 생성
        let branch_name = "feature/test";
        test_repo.repo.branch(branch_name, &commit, false).unwrap();
        
        // 브랜치 전환
        let obj = test_repo.repo.revparse_single(&format!("refs/heads/{}", branch_name)).unwrap();
        test_repo.repo.checkout_tree(&obj, None).unwrap();
        test_repo.repo.set_head(&format!("refs/heads/{}", branch_name)).unwrap();
        
        // 현재 브랜치 확인
        let head = test_repo.repo.head().unwrap();
        let current_branch = head.shorthand().unwrap();
        
        assert_eq!(current_branch, branch_name, "브랜치 전환 실패");
    }

    #[test]
    #[serial]
    fn test_switch_korean_branch() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 한글 브랜치 생성 및 전환
        let korean_branch = "기능/대시보드";
        test_repo.repo.branch(korean_branch, &commit, false).unwrap();
        
        let obj = test_repo.repo.revparse_single(&format!("refs/heads/{}", korean_branch)).unwrap();
        test_repo.repo.checkout_tree(&obj, None).unwrap();
        test_repo.repo.set_head(&format!("refs/heads/{}", korean_branch)).unwrap();
        
        let head = test_repo.repo.head().unwrap();
        let current_branch = head.shorthand().unwrap();
        
        assert_eq!(current_branch, korean_branch);
    }

    #[test]
    #[serial]
    fn test_delete_branch() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 브랜치 생성
        let branch_name = "feature/to-delete";
        test_repo.repo.branch(branch_name, &commit, false).unwrap();
        
        // 브랜치 삭제
        let mut branch = test_repo.repo.find_branch(branch_name, git2::BranchType::Local).unwrap();
        branch.delete().unwrap();
        
        // 삭제 확인
        let result = test_repo.repo.find_branch(branch_name, git2::BranchType::Local);
        assert!(result.is_err(), "브랜치가 삭제되지 않음");
    }

    #[test]
    #[serial]
    fn test_delete_korean_branch() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        let korean_branch = "삭제할브랜치";
        test_repo.repo.branch(korean_branch, &commit, false).unwrap();
        
        let mut branch = test_repo.repo.find_branch(korean_branch, git2::BranchType::Local).unwrap();
        branch.delete().unwrap();
        
        let result = test_repo.repo.find_branch(korean_branch, git2::BranchType::Local);
        assert!(result.is_err(), "한글 브랜치가 삭제되지 않음");
    }

    #[test]
    #[serial]
    fn test_branch_with_commits() {
        let test_repo = TestRepo::new().unwrap();
        
        // main 브랜치에 초기 커밋
        test_repo.create_file("main.txt", "main content").unwrap();
        test_repo.stage_file("main.txt").unwrap();
        test_repo.commit("Main commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 새 브랜치 생성 및 전환
        let branch_name = "feature/new";
        test_repo.repo.branch(branch_name, &commit, false).unwrap();
        
        let obj = test_repo.repo.revparse_single(&format!("refs/heads/{}", branch_name)).unwrap();
        test_repo.repo.checkout_tree(&obj, None).unwrap();
        test_repo.repo.set_head(&format!("refs/heads/{}", branch_name)).unwrap();
        
        // 새 브랜치에서 커밋
        test_repo.create_file("feature.txt", "feature content").unwrap();
        test_repo.stage_file("feature.txt").unwrap();
        test_repo.commit("Feature commit").unwrap();
        
        // 커밋 확인
        let feature_commit = test_repo.get_last_commit().unwrap();
        assert_eq!(feature_commit.message().unwrap(), "Feature commit");
    }

    #[test]
    #[serial]
    fn test_special_korean_branch_names() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 다양한 한글 브랜치명
        let special_names = vec![
            "기능/사용자-인증",
            "버그수정/로그인_오류",
            "개선/UI(디자인)",
            "릴리스/v1.0.0",
        ];
        
        for name in special_names {
            let result = test_repo.repo.branch(name, &commit, false);
            assert!(result.is_ok(), "{} 브랜치 생성 실패", name);
        }
    }
}

/// 성능 테스트
#[cfg(test)]
mod branch_performance_tests {
    use super::*;

    #[test]
    #[serial]
    fn bench_create_branch() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 브랜치 생성 속도 측정
        let start = Instant::now();
        for i in 0..10 {
            test_repo.repo.branch(&format!("branch-{}", i), &commit, false).unwrap();
        }
        let duration = start.elapsed();
        
        println!("10개 브랜치 생성 시간: {:?}", duration);
        println!("평균 시간: {:?}", duration / 10);
        
        assert!(duration.as_millis() < 100, "브랜치 생성이 너무 느림: {:?}", duration);
    }

    #[test]
    #[serial]
    fn bench_list_branches() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 100개 브랜치 생성
        for i in 0..100 {
            test_repo.repo.branch(&format!("branch-{}", i), &commit, false).unwrap();
        }
        
        // 브랜치 목록 조회 속도 측정
        let start = Instant::now();
        let branches = test_repo.repo.branches(None).unwrap();
        let count = branches.count();
        let duration = start.elapsed();
        
        println!("{}개 브랜치 조회 시간: {:?}", count, duration);
        
        assert!(duration.as_millis() < 50, "브랜치 목록 조회가 너무 느림: {:?}", duration);
    }

    #[test]
    #[serial]
    fn bench_switch_branch() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 브랜치 생성
        test_repo.repo.branch("test-branch", &commit, false).unwrap();
        
        // 브랜치 전환 속도 측정
        let start = Instant::now();
        let obj = test_repo.repo.revparse_single("refs/heads/test-branch").unwrap();
        test_repo.repo.checkout_tree(&obj, None).unwrap();
        test_repo.repo.set_head("refs/heads/test-branch").unwrap();
        let duration = start.elapsed();
        
        println!("브랜치 전환 시간: {:?}", duration);
        
        assert!(duration.as_millis() < 50, "브랜치 전환이 너무 느림: {:?}", duration);
    }

    #[test]
    #[serial]
    fn bench_korean_branch_operations() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "initial").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("Initial commit").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        
        // 한글 브랜치 생성 속도
        let start = Instant::now();
        for i in 0..10 {
            test_repo.repo.branch(&format!("기능/테스트-{}", i), &commit, false).unwrap();
        }
        let create_duration = start.elapsed();
        
        // 한글 브랜치 목록 조회 속도
        let start = Instant::now();
        let branches = test_repo.repo.branches(None).unwrap();
        let _count = branches.count();
        let list_duration = start.elapsed();
        
        println!("한글 브랜치 10개 생성: {:?}", create_duration);
        println!("한글 브랜치 목록 조회: {:?}", list_duration);
        
        assert!(create_duration.as_millis() < 100, "한글 브랜치 생성 느림");
        assert!(list_duration.as_millis() < 50, "한글 브랜치 조회 느림");
    }
}
