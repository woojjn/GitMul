@echo off
REM GitFlow - 한글 인코딩 테스트 실행 스크립트 (Windows)

echo ======================================
echo 🧪 GitFlow 한글 인코딩 테스트
echo ======================================
echo.

REM UTF-8 코드페이지 설정
chcp 65001 > nul

REM Git 설정 확인
echo 📋 Git 설정 확인...
git config --global core.quotepath false
git config --global i18n.commitEncoding utf-8
git config --global i18n.logOutputEncoding utf-8

echo ✓ Git UTF-8 설정 완료
echo.

REM 테스트 실행
echo 🧪 Rust 유닛 테스트 실행...
cd src-tauri

cargo test --all-features -- --test-threads=1 --nocapture

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================
    echo ✅ 모든 테스트 통과!
    echo ======================================
) else (
    echo.
    echo ======================================
    echo ❌ 테스트 실패
    echo ======================================
    exit /b 1
)

echo.
echo 📊 테스트 커버리지 요약:
echo.
echo ✅ 한글 파일명 생성 및 Stage
echo ✅ 한글 커밋 메시지
echo ✅ 유니코드 정규화 (NFC/NFD)
echo ✅ 혼합 한글/영어 파일명
echo ✅ 한글 디렉토리
echo ✅ 특수 한글 문자
echo ✅ 여러 줄 한글 커밋 메시지
echo ✅ 이모지 + 한글
echo ✅ 한글 작성자 이름
echo ✅ Git 로그 한글 출력
echo ✅ Tauri Commands 통합 테스트
echo.

echo 🎉 한글 완벽 지원 검증 완료!
pause
