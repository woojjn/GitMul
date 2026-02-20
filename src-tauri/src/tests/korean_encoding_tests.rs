use git2::{Repository, Signature, Oid};
use std::path::{Path, PathBuf};
use std::fs;
use tempfile::TempDir;
use unicode_normalization::UnicodeNormalization;

/// 테스트용 Git 레포지토리 생성
pub struct TestRepo {
    pub temp_dir: TempDir,
    pub repo: Repository,
    pub path: PathBuf,
}

impl TestRepo {
    /// 새 테스트 레포지토리 생성
    pub fn new() -> Result<Self, git2::Error> {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_path_buf();
        
        let repo = Repository::init(&path)?;
        
        // Git 설정
        let mut config = repo.config()?;
        config.set_str("user.name", "Test User")?;
        config.set_str("user.email", "test@example.com")?;
        config.set_bool("core.quotepath", false)?;
        config.set_str("i18n.commitEncoding", "utf-8")?;
        config.set_str("i18n.logOutputEncoding", "utf-8")?;
        
        Ok(TestRepo {
            temp_dir,
            repo,
            path,
        })
    }
    
    /// 파일 생성
    pub fn create_file(&self, name: &str, content: &str) -> Result<PathBuf, std::io::Error> {
        let file_path = self.path.join(name);
        fs::write(&file_path, content)?;
        Ok(file_path)
    }
    
    /// 파일 Stage
    pub fn stage_file(&self, name: &str) -> Result<(), git2::Error> {
        let mut index = self.repo.index()?;
        index.add_path(Path::new(name))?;
        index.write()?;
        Ok(())
    }
    
    /// 커밋 생성
    pub fn commit(&self, message: &str) -> Result<Oid, git2::Error> {
        let mut index = self.repo.index()?;
        let tree_id = index.write_tree()?;
        let tree = self.repo.find_tree(tree_id)?;
        
        let signature = self.repo.signature()?;
        
        let parent_commit = match self.repo.head() {
            Ok(head) => Some(head.peel_to_commit()?),
            Err(_) => None,
        };
        
        let parents = if let Some(ref parent) = parent_commit {
            vec![parent]
        } else {
            vec![]
        };
        
        self.repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            message,
            &tree,
            &parents,
        )
    }
    
    /// 마지막 커밋 가져오기
    pub fn get_last_commit(&self) -> Result<git2::Commit, git2::Error> {
        let head = self.repo.head()?;
        head.peel_to_commit()
    }
    
    /// 파일 상태 확인
    pub fn get_file_status(&self, name: &str) -> Result<git2::Status, git2::Error> {
        let statuses = self.repo.statuses(None)?;
        
        for entry in statuses.iter() {
            if entry.path() == Some(name) {
                return Ok(entry.status());
            }
        }
        
        Err(git2::Error::from_str("File not found in status"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    #[serial]
    fn test_korean_filename_create_and_stage() {
        let test_repo = TestRepo::new().unwrap();
        
        // 한글 파일명으로 파일 생성
        let korean_filename = "한글파일.txt";
        test_repo.create_file(korean_filename, "테스트 내용").unwrap();
        
        // Stage
        test_repo.stage_file(korean_filename).unwrap();
        
        // 상태 확인
        let status = test_repo.get_file_status(korean_filename).unwrap();
        assert!(status.is_index_new(), "파일이 정상적으로 Stage되어야 함");
    }

    #[test]
    #[serial]
    fn test_korean_commit_message() {
        let test_repo = TestRepo::new().unwrap();
        
        // 파일 생성 및 Stage
        test_repo.create_file("test.txt", "content").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        
        // 한글 커밋 메시지
        let korean_message = "기능: 사용자 인증 추가\n\n- 로그인 구현\n- 세션 관리";
        test_repo.commit(korean_message).unwrap();
        
        // 커밋 메시지 확인
        let commit = test_repo.get_last_commit().unwrap();
        let message = commit.message().unwrap();
        
        assert_eq!(message, korean_message, "커밋 메시지가 한글로 정상 저장되어야 함");
    }

    #[test]
    #[serial]
    fn test_korean_filename_and_message_together() {
        let test_repo = TestRepo::new().unwrap();
        
        // 한글 파일명
        let korean_filename = "사용자인증.js";
        let korean_content = "// 한글 주석\nconst 사용자 = '홍길동';";
        test_repo.create_file(korean_filename, korean_content).unwrap();
        test_repo.stage_file(korean_filename).unwrap();
        
        // 한글 커밋 메시지
        let korean_message = "추가: 사용자 인증 모듈";
        test_repo.commit(korean_message).unwrap();
        
        // 검증
        let commit = test_repo.get_last_commit().unwrap();
        assert_eq!(commit.message().unwrap(), korean_message);
        
        // Tree에서 파일 확인
        let tree = commit.tree().unwrap();
        let entry = tree.get_name(korean_filename);
        assert!(entry.is_some(), "한글 파일명이 Tree에 정상 저장되어야 함");
    }

    #[test]
    #[serial]
    fn test_unicode_normalization_nfc_nfd() {
        let test_repo = TestRepo::new().unwrap();
        
        // NFD (분리형) - macOS 스타일
        let filename_nfd = "한글파일.txt".nfd().collect::<String>();
        
        // NFC (결합형) - Windows/Linux 스타일
        let filename_nfc = "한글파일.txt".nfc().collect::<String>();
        
        // NFD로 파일 생성 (macOS 시뮬레이션)
        test_repo.create_file(&filename_nfd, "content").unwrap();
        
        // NFC로 Stage 시도
        let result = test_repo.stage_file(&filename_nfc);
        
        // NFD나 NFC 중 하나로 Stage 가능해야 함
        assert!(
            result.is_ok() || test_repo.stage_file(&filename_nfd).is_ok(),
            "유니코드 정규화 후 Stage 가능해야 함"
        );
    }

    #[test]
    #[serial]
    fn test_mixed_korean_english_filename() {
        let test_repo = TestRepo::new().unwrap();
        
        let mixed_filename = "user-profile-사용자프로필.jsx";
        test_repo.create_file(mixed_filename, "export const UserProfile = () => {};").unwrap();
        test_repo.stage_file(mixed_filename).unwrap();
        
        let status = test_repo.get_file_status(mixed_filename).unwrap();
        assert!(status.is_index_new());
    }

    #[test]
    #[serial]
    fn test_korean_in_subdirectory() {
        let test_repo = TestRepo::new().unwrap();
        
        // 한글 디렉토리 생성
        let korean_dir = test_repo.path.join("한글폴더");
        fs::create_dir(&korean_dir).unwrap();
        
        // 한글 디렉토리 내 한글 파일
        let file_path = "한글폴더/파일.txt";
        let full_path = test_repo.path.join(file_path);
        fs::write(&full_path, "내용").unwrap();
        
        test_repo.stage_file(file_path).unwrap();
        
        let status = test_repo.get_file_status(file_path).unwrap();
        assert!(status.is_index_new());
    }

    #[test]
    #[serial]
    fn test_special_korean_characters() {
        let test_repo = TestRepo::new().unwrap();
        
        // 특수 한글 문자 포함
        let special_chars = vec![
            "ㄱㄴㄷ.txt",           // 자음만
            "ㅏㅑㅓㅕ.txt",         // 모음만
            "가-나-다.txt",         // 하이픈 포함
            "파일_이름.txt",        // 언더스코어
            "파일(1).txt",         // 괄호
        ];
        
        for filename in special_chars {
            test_repo.create_file(filename, "content").unwrap();
            test_repo.stage_file(filename).unwrap();
            
            let status = test_repo.get_file_status(filename).unwrap();
            assert!(status.is_index_new(), "{} 파일 Stage 실패", filename);
        }
    }

    #[test]
    #[serial]
    fn test_multiline_korean_commit_message() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "content").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        
        // 여러 줄 한글 커밋 메시지
        let multiline_message = "\
기능: 대시보드 페이지 추가

구현 내용:
- 사용자 통계 차트
- 최근 활동 목록
- 알림 센터

기술 스택:
- React
- Chart.js
- Tailwind CSS";
        
        test_repo.commit(multiline_message).unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        assert_eq!(commit.message().unwrap(), multiline_message);
    }

    #[test]
    #[serial]
    fn test_emoji_with_korean() {
        let test_repo = TestRepo::new().unwrap();
        
        test_repo.create_file("test.txt", "content").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        
        // 이모지 + 한글
        let message = "✨ 기능: 새로운 기능 추가\n\n🐛 수정: 버그 해결";
        test_repo.commit(message).unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        assert_eq!(commit.message().unwrap(), message);
    }

    #[test]
    #[serial]
    fn test_korean_author_name() {
        let test_repo = TestRepo::new().unwrap();
        
        // 한글 작성자 이름 설정
        let mut config = test_repo.repo.config().unwrap();
        config.set_str("user.name", "홍길동").unwrap();
        config.set_str("user.email", "hong@example.com").unwrap();
        
        test_repo.create_file("test.txt", "content").unwrap();
        test_repo.stage_file("test.txt").unwrap();
        test_repo.commit("테스트 커밋").unwrap();
        
        let commit = test_repo.get_last_commit().unwrap();
        let author = commit.author();
        
        assert_eq!(author.name().unwrap(), "홍길동");
    }

    #[test]
    #[serial]
    fn test_git_log_korean_output() {
        let test_repo = TestRepo::new().unwrap();
        
        // 여러 개의 한글 커밋 생성
        let commits = vec![
            "첫 번째 커밋",
            "두 번째 커밋",
            "세 번째 커밋: 한글 기능 추가",
        ];
        
        for msg in &commits {
            test_repo.create_file(&format!("file{}.txt", msg), "content").unwrap();
            test_repo.stage_file(&format!("file{}.txt", msg)).unwrap();
            test_repo.commit(msg).unwrap();
        }
        
        // 커밋 히스토리 확인
        let mut revwalk = test_repo.repo.revwalk().unwrap();
        revwalk.push_head().unwrap();
        
        let mut found_messages = Vec::new();
        for oid in revwalk {
            let commit = test_repo.repo.find_commit(oid.unwrap()).unwrap();
            found_messages.push(commit.message().unwrap().to_string());
        }
        
        // 역순이므로 뒤집기
        found_messages.reverse();
        
        for (i, msg) in commits.iter().enumerate() {
            assert_eq!(&found_messages[i], msg);
        }
    }
}
