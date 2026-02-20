# 테스트 실행 가이드

## 🚀 빠른 시작

### 사전 요구사항

테스트를 실행하려면 다음이 설치되어 있어야 합니다:

1. **Rust** (1.70+)
   ```bash
   # 설치
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # 확인
   cargo --version
   ```

2. **Git**
   ```bash
   git --version
   ```

---

## 📋 테스트 실행

### 방법 1: 스크립트 실행 (권장)

**Linux/macOS:**
```bash
chmod +x test-korean.sh
./test-korean.sh
```

**Windows:**
```cmd
test-korean.bat
```

### 방법 2: 수동 실행

```bash
# 프로젝트 디렉토리로 이동
cd gitflow-prototype/src-tauri

# 모든 테스트 실행
cargo test --all-features -- --test-threads=1 --nocapture

# 특정 테스트만 실행
cargo test test_korean_filename_create_and_stage

# 통합 테스트만 실행
cargo test integration_tests

# 한글 인코딩 테스트만 실행
cargo test korean_encoding_tests
```

---

## 📊 예상 출력

### 성공 시

```
====================================
🧪 GitFlow 한글 인코딩 테스트
====================================

📋 Git 설정 확인...
✓ Git UTF-8 설정 완료

🧪 Rust 유닛 테스트 실행...

running 18 tests
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

======================================
✅ 모든 테스트 통과!
======================================

📊 테스트 커버리지 요약:

✅ 한글 파일명 생성 및 Stage
✅ 한글 커밋 메시지
✅ 유니코드 정규화 (NFC/NFD)
✅ 혼합 한글/영어 파일명
✅ 한글 디렉토리
✅ 특수 한글 문자
✅ 여러 줄 한글 커밋 메시지
✅ 이모지 + 한글
✅ 한글 작성자 이름
✅ Git 로그 한글 출력
✅ Tauri Commands 통합 테스트

🎉 한글 완벽 지원 검증 완료!
```

---

## 🐛 문제 해결

### 1. Cargo 없음

**오류:**
```
bash: cargo: command not found
```

**해결:**
```bash
# Rust 설치
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. Git 설정 오류

**오류:**
```
fatal: not in a git repository
```

**해결:**
```bash
git config --global core.quotepath false
git config --global i18n.commitEncoding utf-8
git config --global i18n.logOutputEncoding utf-8
```

### 3. 테스트 실패

**디버그 모드로 실행:**
```bash
RUST_BACKTRACE=1 cargo test --all-features -- --nocapture
```

**특정 테스트만 디버그:**
```bash
cargo test test_korean_filename_create_and_stage -- --nocapture
```

---

## 📈 테스트 커버리지 확인

```bash
# Tarpaulin 설치 (코드 커버리지 도구)
cargo install cargo-tarpaulin

# 커버리지 실행
cargo tarpaulin --all-features --out Html

# 결과 확인
open tarpaulin-report.html
```

---

## 🔄 지속적 통합 (CI)

### GitHub Actions

프로젝트에 `.github/workflows/test.yml` 추가:

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
      
      - name: Configure Git
        run: |
          git config --global core.quotepath false
          git config --global i18n.commitEncoding utf-8
          git config --global i18n.logOutputEncoding utf-8
      
      - name: Run Tests
        run: |
          cd src-tauri
          cargo test --all-features -- --test-threads=1
```

---

## 📝 테스트 작성 가이드

새로운 한글 관련 기능 추가 시:

1. **테스트 먼저 작성** (TDD)
2. **실패 확인**
3. **기능 구현**
4. **테스트 통과 확인**

### 예시:

```rust
#[test]
#[serial]
fn test_new_korean_feature() {
    let test_repo = TestRepo::new().unwrap();
    
    // Given: 한글 데이터 준비
    let korean_data = "한글 테스트 데이터";
    
    // When: 기능 실행
    let result = your_function(korean_data);
    
    // Then: 검증
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), expected_value);
}
```

---

## 🎯 베스트 프랙티스

1. **항상 UTF-8 사용**
2. **유니코드 정규화 고려** (NFC/NFD)
3. **실제 한글 데이터로 테스트**
4. **모든 플랫폼에서 검증**
5. **명확한 실패 메시지**

---

## 📚 더 읽기

- [TDD_GUIDE.md](TDD_GUIDE.md) - 상세 TDD 가이드
- [CHANGELOG.md](CHANGELOG.md) - 변경 이력
- [README.md](README.md) - 프로젝트 개요

---

**테스트 실행 중 문제가 있으면 이슈를 열어주세요!** 🙏
