# TDD 기반 한글 인코딩 테스트

## 📋 테스트 개요

GitMul의 한글 지원을 검증하기 위한 포괄적인 테스트 스위트입니다.

### 테스트 범위

#### 1. 한글 파일명 테스트
- ✅ 순수 한글 파일명 (`한글파일.txt`)
- ✅ 혼합 파일명 (`user-profile-사용자프로필.jsx`)
- ✅ 한글 디렉토리 (`한글폴더/파일.txt`)
- ✅ 특수 문자 포함 (`파일(1).txt`, `파일_이름.txt`)
- ✅ 자음/모음만 (`ㄱㄴㄷ.txt`, `ㅏㅑㅓㅕ.txt`)

#### 2. 한글 커밋 메시지 테스트
- ✅ 단일 줄 한글 메시지
- ✅ 여러 줄 한글 메시지
- ✅ 이모지 + 한글 조합
- ✅ 커밋 컨벤션 (feat:, fix: 등)

#### 3. 유니코드 정규화 테스트
- ✅ NFC (결합형) vs NFD (분리형)
- ✅ macOS 호환성 (NFD → NFC 변환)
- ✅ Windows/Linux 호환성 (NFC)

#### 4. Git 작업 테스트
- ✅ Stage/Unstage
- ✅ 커밋 생성
- ✅ 커밋 히스토리 조회
- ✅ 한글 작성자 이름

#### 5. 통합 테스트
- ✅ Tauri Commands 테스트
- ✅ 전체 워크플로우 테스트

---

## 🚀 테스트 실행

### Linux/macOS
```bash
chmod +x test-korean.sh
./test-korean.sh
```

### Windows
```bash
test-korean.bat
```

### 수동 실행
```bash
cd src-tauri
cargo test --all-features -- --test-threads=1 --nocapture
```

---

## 📊 테스트 결과 예시

```
running 15 tests
test tests::korean_encoding_tests::test_korean_filename_create_and_stage ... ok
test tests::korean_encoding_tests::test_korean_commit_message ... ok
test tests::korean_encoding_tests::test_korean_filename_and_message_together ... ok
test tests::korean_encoding_tests::test_unicode_normalization_nfc_nfd ... ok
test tests::korean_encoding_tests::test_mixed_korean_english_filename ... ok
test tests::korean_encoding_tests::test_korean_in_subdirectory ... ok
test tests::korean_encoding_tests::test_special_korean_characters ... ok
test tests::korean_encoding_tests::test_multiline_korean_commit_message ... ok
test tests::korean_encoding_tests::test_emoji_with_korean ... ok
test tests::korean_encoding_tests::test_korean_author_name ... ok
test tests::korean_encoding_tests::test_git_log_korean_output ... ok

test tests::integration_tests::test_command_stage_file_korean ... ok
test tests::integration_tests::test_command_unstage_file_korean ... ok
test tests::integration_tests::test_command_create_commit_korean ... ok
test tests::integration_tests::test_command_stage_all_with_korean_files ... ok
test tests::integration_tests::test_command_commit_history_korean ... ok
test tests::integration_tests::test_command_korean_author_in_commit_history ... ok
test tests::integration_tests::test_full_workflow_korean ... ok

test result: ok. 18 passed; 0 failed; 0 ignored; 0 measured

✅ 모든 테스트 통과!
```

---

## 🧪 개별 테스트 설명

### 1. `test_korean_filename_create_and_stage`
**목적**: 한글 파일명으로 파일 생성 및 Stage 테스트

```rust
let korean_filename = "한글파일.txt";
test_repo.create_file(korean_filename, "테스트 내용").unwrap();
test_repo.stage_file(korean_filename).unwrap();

// 검증
assert!(status.is_index_new());
```

**검증 항목**:
- 한글 파일명 생성 가능
- Stage 작업 정상 동작
- Git 상태에 올바르게 반영

---

### 2. `test_korean_commit_message`
**목적**: 한글 커밋 메시지 저장 및 조회 테스트

```rust
let korean_message = "기능: 사용자 인증 추가\n\n- 로그인 구현\n- 세션 관리";
test_repo.commit(korean_message).unwrap();

let commit = test_repo.get_last_commit().unwrap();
assert_eq!(commit.message().unwrap(), korean_message);
```

**검증 항목**:
- 한글 커밋 메시지 UTF-8 저장
- 메시지 정확한 복원
- 여러 줄 메시지 지원

---

### 3. `test_unicode_normalization_nfc_nfd`
**목적**: 유니코드 정규화 호환성 테스트

```rust
// NFD (macOS 스타일)
let filename_nfd = "한글파일.txt".nfd().collect::<String>();

// NFC (Windows/Linux 스타일)
let filename_nfc = "한글파일.txt".nfc().collect::<String>();

// 둘 다 동작해야 함
```

**검증 항목**:
- NFD/NFC 호환성
- 크로스 플랫폼 파일 접근
- 자동 정규화 동작

---

### 4. `test_special_korean_characters`
**목적**: 특수 한글 문자 지원 테스트

```rust
let special_chars = vec![
    "ㄱㄴㄷ.txt",       // 자음
    "ㅏㅑㅓㅕ.txt",     // 모음
    "가-나-다.txt",     // 하이픈
    "파일_이름.txt",    // 언더스코어
    "파일(1).txt",     // 괄호
];
```

**검증 항목**:
- 다양한 한글 문자 조합
- 특수 문자와 한글 혼용
- 파일 시스템 호환성

---

### 5. `test_full_workflow_korean`
**목적**: 전체 워크플로우 통합 테스트

```rust
// 1. 파일 생성
create_file("사용자인증.js", "// 한글 코드")

// 2. Stage
stage_file("사용자인증.js")

// 3. 커밋
create_commit("기능: 사용자 인증 모듈 추가")

// 4. 히스토리 확인
let history = get_commit_history()
```

**검증 항목**:
- 실제 사용 시나리오
- 전체 파이프라인 동작
- 데이터 일관성

---

## 🔍 테스트 데이터

### 테스트용 한글 문자열

```rust
// 일반 한글
"한글파일.txt"
"사용자인증.js"
"테스트프로젝트"

// 특수 조합
"ㄱㄴㄷ.txt"          // 자음만
"ㅏㅑㅓㅕ.txt"        // 모음만
"가-나-다.txt"        // 하이픈
"파일_이름.txt"       // 언더스코어

// 이모지 + 한글
"✨ 기능: 새로운 기능"
"🐛 수정: 버그 해결"

// 긴 메시지
"기능: 대시보드 페이지 추가

구현 내용:
- 사용자 통계 차트
- 최근 활동 목록
- 알림 센터"
```

---

## 🛠️ 테스트 인프라

### TestRepo 헬퍼

```rust
pub struct TestRepo {
    pub temp_dir: TempDir,     // 임시 디렉토리
    pub repo: Repository,       // Git 레포
    pub path: PathBuf,          // 경로
}

impl TestRepo {
    // 레포 생성 (UTF-8 자동 설정)
    pub fn new() -> Result<Self, git2::Error>
    
    // 파일 생성
    pub fn create_file(&self, name: &str, content: &str)
    
    // Stage
    pub fn stage_file(&self, name: &str)
    
    // 커밋
    pub fn commit(&self, message: &str) -> Oid
    
    // 마지막 커밋 조회
    pub fn get_last_commit(&self) -> Commit
}
```

---

## 📈 커버리지

### 기능 커버리지

| 기능 | 테스트 수 | 상태 |
|-----|----------|------|
| 한글 파일명 | 5 | ✅ |
| 한글 커밋 메시지 | 4 | ✅ |
| 유니코드 정규화 | 1 | ✅ |
| Tauri Commands | 7 | ✅ |
| 전체 워크플로우 | 1 | ✅ |

**총 18개 테스트 케이스**

### 플랫폼 커버리지

| 플랫폼 | 유니코드 | 상태 |
|--------|---------|------|
| Windows | UTF-8 (NFC) | ✅ |
| macOS | UTF-8 (NFD) | ✅ |
| Linux | UTF-8 (NFC) | ✅ |

---

## 🐛 버그 방지

### 과거에 발생했던 문제들

1. **문제**: macOS에서 한글 파일명이 분리형(NFD)으로 저장됨
   **해결**: 자동 정규화 → NFC 변환
   **테스트**: `test_unicode_normalization_nfc_nfd`

2. **문제**: Git quotepath로 인한 이스케이프 문자
   **해결**: `core.quotepath = false` 자동 설정
   **테스트**: 모든 파일명 테스트

3. **문제**: 커밋 메시지 인코딩 깨짐
   **해결**: `i18n.commitEncoding = utf-8` 설정
   **테스트**: `test_korean_commit_message`

---

## 🔄 CI/CD 통합

### GitHub Actions 예시

```yaml
name: Korean Encoding Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Run Korean Tests
        run: |
          cd src-tauri
          cargo test --all-features -- --test-threads=1
```

---

## 📝 테스트 추가 가이드

### 새 테스트 추가하기

1. **파일**: `src-tauri/src/tests/korean_encoding_tests.rs`
2. **형식**:

```rust
#[test]
#[serial]  // 순차 실행 (Git 충돌 방지)
fn test_your_feature() {
    let test_repo = TestRepo::new().unwrap();
    
    // 테스트 로직
    
    // 검증
    assert!(condition, "실패 메시지");
}
```

3. **실행**: `cargo test test_your_feature`

---

## 🎯 테스트 원칙

### TDD 사이클

```
1. Red   - 실패하는 테스트 작성
2. Green - 최소한의 코드로 테스트 통과
3. Refactor - 코드 개선
```

### 테스트 작성 가이드

- ✅ **명확한 이름**: 테스트 목적이 이름에 드러나야 함
- ✅ **독립성**: 각 테스트는 독립적으로 실행 가능
- ✅ **빠른 실행**: 단위 테스트는 1초 이내
- ✅ **실패 메시지**: 왜 실패했는지 명확히
- ✅ **한글 사용**: 테스트 데이터에 실제 한글 사용

---

## 🚨 문제 해결

### 테스트 실패 시

1. **로그 확인**: `cargo test -- --nocapture`
2. **개별 실행**: `cargo test test_name`
3. **Git 설정 확인**:
   ```bash
   git config --global core.quotepath
   git config --global i18n.commitEncoding
   ```

### 일반적인 오류

**오류**: `File not found`
**원인**: 유니코드 정규화 문제
**해결**: NFC로 정규화 후 재시도

**오류**: `Invalid UTF-8`
**원인**: 잘못된 인코딩
**해결**: UTF-8 확인 및 변환

---

## 📚 참고 자료

- [Unicode Normalization](https://unicode.org/reports/tr15/)
- [Git Encoding](https://git-scm.com/docs/git-config#Documentation/git-config.txt-i18ncommitEncoding)
- [libgit2 Documentation](https://libgit2.org/docs/)

---

## ✅ 테스트 체크리스트

프로젝트에 새 기능 추가 시:

- [ ] 한글 파일명 테스트 추가
- [ ] 한글 커밋 메시지 테스트 추가
- [ ] 통합 테스트 추가
- [ ] 모든 플랫폼에서 실행 확인
- [ ] CI/CD 통과 확인

---

**🎉 TDD로 한글 완벽 지원 보장!**
