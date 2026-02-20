# Changelog

## [v0.3.0] - 2026-02-20 🧪 TDD 기반 한글 인코딩 테스트 추가

### ✨ 새로운 기능

#### 테스트 인프라
- ✅ **18개 테스트 케이스** - 한글 기능 전체 커버
- ✅ **TestRepo 헬퍼** - 테스트용 Git 레포 유틸리티
- ✅ **테스트 스크립트** - Linux/macOS/Windows 지원
- ✅ **TDD 가이드** - 상세 테스트 문서

#### 한글 파일명 테스트
- ✅ 순수 한글 파일명 (`한글파일.txt`)
- ✅ 혼합 파일명 (`user-profile-사용자프로필.jsx`)
- ✅ 한글 디렉토리 (`한글폴더/파일.txt`)
- ✅ 특수 문자 (`파일(1).txt`, `파일_이름.txt`)
- ✅ 자음/모음만 (`ㄱㄴㄷ.txt`, `ㅏㅑㅓㅕ.txt`)

#### 한글 커밋 메시지 테스트
- ✅ 단일 줄 한글 메시지
- ✅ 여러 줄 한글 메시지
- ✅ 이모지 + 한글 조합 (`✨ 기능: 새로운 기능`)
- ✅ 커밋 컨벤션 (feat:, fix: 등)

#### 유니코드 정규화 테스트
- ✅ NFC (Windows/Linux) vs NFD (macOS)
- ✅ 크로스 플랫폼 호환성
- ✅ 자동 정규화 동작 검증

#### 통합 테스트
- ✅ Tauri Commands 테스트
- ✅ 전체 워크플로우 테스트
- ✅ 한글 작성자 이름 테스트

### 📄 문서 추가

- ✅ **TDD_GUIDE.md** - TDD 방법론 및 테스트 상세 설명
- ✅ **TEST_EXECUTION_GUIDE.md** - 테스트 실행 방법
- ✅ **test-korean.sh** - Linux/macOS 테스트 스크립트
- ✅ **test-korean.bat** - Windows 테스트 스크립트

### 🔧 기술적 개선

#### 테스트 구조

```rust
// TestRepo 헬퍼 클래스
pub struct TestRepo {
    pub temp_dir: TempDir,
    pub repo: Repository,
    pub path: PathBuf,
}

impl TestRepo {
    pub fn new() -> Result<Self, git2::Error>  // UTF-8 자동 설정
    pub fn create_file(&self, name: &str, content: &str)
    pub fn stage_file(&self, name: &str)
    pub fn commit(&self, message: &str) -> Oid
    pub fn get_last_commit(&self) -> Commit
}
```

#### 테스트 예시

```rust
#[test]
#[serial]
fn test_korean_filename_create_and_stage() {
    let test_repo = TestRepo::new().unwrap();
    
    let korean_filename = "한글파일.txt";
    test_repo.create_file(korean_filename, "테스트 내용").unwrap();
    test_repo.stage_file(korean_filename).unwrap();
    
    let status = test_repo.get_file_status(korean_filename).unwrap();
    assert!(status.is_index_new());
}
```

### 📈 테스트 커버리지

| 기능 | 테스트 수 | 상태 |
|-----|----------|------|
| 한글 파일명 | 5 | ✅ |
| 한글 커밋 메시지 | 4 | ✅ |
| 유니코드 정규화 | 1 | ✅ |
| Tauri Commands | 7 | ✅ |
| 전체 워크플로우 | 1 | ✅ |

**총 18개 테스트 케이스**

### 🛡️ 버그 방지

테스트로 방지되는 문제들:

1. macOS NFD/NFC 호환성 문제
2. Git quotepath 이스케이프 문자
3. 커밋 메시지 인코딩 깨짐
4. 특수 한글 문자 처리 오류

### 📚 학습 자료

- TDD 방법론 적용 사례
- Git 한글 인코딩 베스트 프랙티스
- 유니코드 정규화 상세 가이드

---

## [v0.2.0] - 2026-02-20 ⭐ Stage/Unstage & Commit 기능 추가

### ✨ 새로운 기능

#### 파일 스테이징
- ✅ **개별 파일 Stage** - 파일에 호버 시 `+` 버튼으로 스테이징
- ✅ **개별 파일 Unstage** - Staged 파일에 호버 시 `-` 버튼으로 언스테이징
- ✅ **모두 스테이징** - "모두 추가" 버튼으로 모든 변경사항 한번에 스테이징
- ✅ **인터랙티브 UI** - 호버 시 버튼 표시로 깔끔한 UX

#### 커밋 생성
- ✅ **커밋 다이얼로그** - 전문적인 커밋 작성 UI
- ✅ **멀티라인 메시지** - 긴 커밋 메시지 작성 가능
- ✅ **커밋 컨벤션 가이드** - feat, fix, docs 등 가이드 제공
- ✅ **Staged 카운트** - 몇 개 파일이 커밋되는지 표시
- ✅ **한글 완벽 지원** - 한글 커밋 메시지 자동 UTF-8 처리
- ✅ **자동 새로고침** - 커밋 후 히스토리/변경사항 자동 업데이트

#### Backend (Rust)
- ✅ `stage_file` - 파일 스테이징 API
- ✅ `unstage_file` - 파일 언스테이징 API
- ✅ `stage_all` - 모든 파일 스테이징 API
- ✅ `create_commit` - 커밋 생성 API
- ✅ UTF-8 설정 자동 적용 (커밋 시)

#### UI 개선
- ✅ 툴바에 "커밋 (N)" 버튼 추가
- ✅ Staged 파일 있을 때만 버튼 활성화
- ✅ 파일 목록에 "+/-" 아이콘 버튼
- ✅ 그룹별 hover 효과
- ✅ 색상 코드 (녹색: Stage, 빨강: Unstage)

### 📸 스크린샷

```
변경 사항 (3)          [모두 추가] [🔄]
├─ Staged (1)
│  └─ README.md [modified] [-]  ← 호버 시 - 버튼
└─ Unstaged (2)
   ├─ index.js [modified] [+]   ← 호버 시 + 버튼
   └─ 한글파일.txt [untracked] [+]

[커밋 (1)] 버튼 클릭 → 다이얼로그

┌─────────────────────────────────┐
│ 커밋 생성                        │
├─────────────────────────────────┤
│ 커밋 메시지        1개 파일 staged│
│ ┌─────────────────────────────┐ │
│ │ feat: 새로운 기능 추가       │ │
│ │                             │ │
│ │ - 사용자 로그인 구현         │ │
│ │ - 데이터베이스 연동          │ │
│ └─────────────────────────────┘ │
│                                 │
│ 💡 팁: 명확하고 간결하게...     │
│                                 │
│           [취소]  [커밋]        │
└─────────────────────────────────┘
```

### 🔧 기술적 개선

#### Git 작업 (Rust)
```rust
// 파일 Stage
pub async fn stage_file(repo_path, file_path) {
    let mut index = repo.index()?;
    index.add_path(Path::new(&file_path))?;
    index.write()?;
}

// 커밋 생성
pub async fn create_commit(repo_path, message) {
    let signature = repo.signature()?;
    let tree = index.write_tree()?;
    repo.commit(Some("HEAD"), &signature, &message, &tree, &parents)?;
}
```

#### Frontend (React)
```typescript
// 파일 Stage 처리
const handleStageFile = async (path: string) => {
  await invoke('stage_file', { repoPath, filePath: path });
  await loadFileChanges(); // 자동 새로고침
};

// 커밋 다이얼로그
<CommitDialog
  isOpen={commitDialogOpen}
  onCommit={handleCommit}
  stagedCount={stagedFiles.length}
/>
```

### 🐛 버그 수정

- 파일 경로 유니코드 정규화 (NFD → NFC)
- Git 설정 자동 적용 개선

### 📚 문서 업데이트

- README에 Stage/Unstage 가이드 추가
- 테스트 시나리오 업데이트
- CHANGELOG 추가

---

## [v0.1.0] - 2026-02-20 🎉 초기 릴리스

### ✨ 초기 기능

- ✅ 레포지토리 열기
- ✅ 최근 레포 목록
- ✅ 커밋 히스토리 표시
- ✅ 파일 변경사항 표시
- ✅ 한글 완벽 지원
- ✅ 다크 모드

### 🏗️ 기술 스택

- Tauri 1.5
- React 18
- TypeScript
- Rust
- git2-rs (libgit2)
