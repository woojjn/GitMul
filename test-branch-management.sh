#!/bin/bash

# GitFlow v0.4.0 - Branch Management Test Script
# Tests all branch operations with Korean support

set -e

echo "========================================="
echo "GitFlow v0.4.0 Branch Management Tests"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
test_result() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Create test repository
TEST_DIR=$(mktemp -d)
echo -e "${YELLOW}Creating test repository: $TEST_DIR${NC}"
cd "$TEST_DIR"
git init
git config user.name "Test User"
git config user.email "test@example.com"
git config core.quotepath false
git config i18n.commitEncoding utf-8
git config i18n.logOutputEncoding utf-8

# Create initial commit
echo "# Test Repository" > README.md
git add README.md
git commit -m "Initial commit" > /dev/null 2>&1

echo ""
echo "========================================="
echo "Test 1: Basic Branch Operations"
echo "========================================="

# Test 1.1: Create branch
git branch feature/test-1
if git branch --list | grep -q "feature/test-1"; then
    test_result 0 "Create branch 'feature/test-1'"
else
    test_result 1 "Create branch 'feature/test-1'"
fi

# Test 1.2: List branches
BRANCH_COUNT=$(git branch --list | wc -l)
if [ "$BRANCH_COUNT" -ge 2 ]; then
    test_result 0 "List branches (found $BRANCH_COUNT branches)"
else
    test_result 1 "List branches"
fi

# Test 1.3: Switch branch
git checkout feature/test-1 > /dev/null 2>&1
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "feature/test-1" ]; then
    test_result 0 "Switch to branch 'feature/test-1'"
else
    test_result 1 "Switch to branch 'feature/test-1'"
fi

# Test 1.4: Delete branch (switch back to main first)
git checkout main > /dev/null 2>&1 || git checkout master > /dev/null 2>&1
git branch -d feature/test-1 > /dev/null 2>&1
if ! git branch --list | grep -q "feature/test-1"; then
    test_result 0 "Delete branch 'feature/test-1'"
else
    test_result 1 "Delete branch 'feature/test-1'"
fi

echo ""
echo "========================================="
echo "Test 2: Korean Branch Names"
echo "========================================="

# Test 2.1: Create Korean branch
git branch "기능/테스트" > /dev/null 2>&1
if git branch --list | grep -q "기능/테스트"; then
    test_result 0 "Create Korean branch '기능/테스트'"
else
    test_result 1 "Create Korean branch '기능/테스트'"
fi

# Test 2.2: Switch to Korean branch
git checkout "기능/테스트" > /dev/null 2>&1
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "기능/테스트" ]; then
    test_result 0 "Switch to Korean branch '기능/테스트'"
else
    test_result 1 "Switch to Korean branch '기능/테스트'"
fi

# Test 2.3: Commit on Korean branch
echo "Korean test" > korean.txt
git add korean.txt
git commit -m "한글 커밋 메시지" > /dev/null 2>&1
if git log -1 --pretty=%s | grep -q "한글 커밋 메시지"; then
    test_result 0 "Commit on Korean branch"
else
    test_result 1 "Commit on Korean branch"
fi

# Test 2.4: Mixed Korean/English branch
git checkout main > /dev/null 2>&1 || git checkout master > /dev/null 2>&1
git branch "feature/한글-지원" > /dev/null 2>&1
if git branch --list | grep -q "feature/한글-지원"; then
    test_result 0 "Create mixed Korean/English branch"
else
    test_result 1 "Create mixed Korean/English branch"
fi

# Test 2.5: Special characters in Korean branch
git branch "버그수정/이슈#123" > /dev/null 2>&1
if git branch --list | grep -q "버그수정/이슈#123"; then
    test_result 0 "Create Korean branch with special characters"
else
    test_result 1 "Create Korean branch with special characters"
fi

echo ""
echo "========================================="
echo "Test 3: Performance Tests"
echo "========================================="

# Test 3.1: Create 100 branches (performance)
echo -e "${YELLOW}Creating 100 branches...${NC}"
START_TIME=$(date +%s.%N)
for i in {1..100}; do
    git branch "perf-test-$i" > /dev/null 2>&1
done
END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)
echo "Duration: ${DURATION}s"

if (( $(echo "$DURATION < 10" | bc -l) )); then
    test_result 0 "Create 100 branches in < 10s (${DURATION}s)"
else
    test_result 1 "Create 100 branches in < 10s (${DURATION}s)"
fi

# Test 3.2: List branches (performance)
START_TIME=$(date +%s.%N)
git branch --list > /dev/null 2>&1
END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)
DURATION_MS=$(echo "$DURATION * 1000" | bc)
echo "Duration: ${DURATION_MS}ms"

if (( $(echo "$DURATION < 0.1" | bc -l) )); then
    test_result 0 "List branches in < 100ms (${DURATION_MS}ms)"
else
    test_result 1 "List branches in < 100ms (${DURATION_MS}ms)"
fi

# Test 3.3: Switch branch (performance)
START_TIME=$(date +%s.%N)
git checkout perf-test-50 > /dev/null 2>&1
END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)
DURATION_MS=$(echo "$DURATION * 1000" | bc)
echo "Duration: ${DURATION_MS}ms"

if (( $(echo "$DURATION < 0.2" | bc -l) )); then
    test_result 0 "Switch branch in < 200ms (${DURATION_MS}ms)"
else
    test_result 1 "Switch branch in < 200ms (${DURATION_MS}ms)"
fi

echo ""
echo "========================================="
echo "Test 4: Edge Cases"
echo "========================================="

# Test 4.1: Branch name with spaces (should fail)
git branch "branch with spaces" > /dev/null 2>&1
if git branch --list | grep -q "branch with spaces"; then
    test_result 1 "Reject branch name with spaces (security)"
else
    test_result 0 "Reject branch name with spaces (security)"
fi

# Test 4.2: Delete current branch (should fail)
git checkout main > /dev/null 2>&1 || git checkout master > /dev/null 2>&1
CURRENT=$(git branch --show-current)
git branch -d "$CURRENT" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    test_result 0 "Prevent deleting current branch"
else
    test_result 1 "Prevent deleting current branch"
fi

# Test 4.3: Duplicate branch name (should fail)
git branch duplicate-test > /dev/null 2>&1
git branch duplicate-test > /dev/null 2>&1
if [ $? -ne 0 ]; then
    test_result 0 "Prevent duplicate branch names"
else
    test_result 1 "Prevent duplicate branch names"
fi

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total Tests: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED!${NC}"
    EXIT_CODE=0
else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}"
    EXIT_CODE=1
fi

# Cleanup
echo ""
echo "Cleaning up test repository..."
cd ..
rm -rf "$TEST_DIR"

exit $EXIT_CODE
