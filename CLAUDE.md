# GitMul (깃물) - AI 개발자를 위한 프로젝트 가이드 📘

> **이 문서는 Claude나 다른 AI 개발자가 이 프로젝트를 즉시 이해하고 작업할 수 있도록 작성되었습니다.**

---

## 🎯 프로젝트 개요

**GitMul (깃물)** - Modern Git GUI Tool with Multiple Tabs

- **이름 의미**: Git + 물(Mul, Korean for "water")
  - 한국어 "물"의 흐름(flow)과 유동성을 표현
  - Multiple의 의미 포함: 다중 탭, 다중 레포지토리 동시 관리
- **목표**: Fork/SourceTree 같은 고품질 Git GUI 도구를 Tauri + React로 구현
- **특징**: 한국어 완벽 지원, 다중 탭, Word-level Diff, Cherry-pick UI

---

## 📊 현재 상태 (v1.7 - 85% 완료)

### ✅ **완료된 기능**

#### Phase 1: Cherry-pick & Revert UI (100%)
- **위치**: `src/components/CherryPickDialog.tsx`, `RevertDialog.tsx`
- **기능**: 
  - Interactive commit 선택
  - Visual conflict resolution
  - Undo 지원
- **백엔드**: `src-tauri/src/commands/cherrypick.rs`, `revert.rs`

#### Phase 2: Word-level Diff (100%)
- **위치**: `src/components/DiffViewer.tsx`, `src/utils/wordDiff.ts`
- **기능**:
  - Side-by-side diff 비교
  - 구문 강조 (Syntax highlighting)
  - Word-level 하이라이팅 토글 (기본: ON)
  - Unified/Split 뷰 모드
- **구현**:
  - `renderWordDiff()`: 단어 단위 diff 렌더링 (green/red 배경)
  - `wordDiffEnabled` 상태로 토글 제어

#### Phase 3: Multiple Tabs (100%)
- **위치**: `src/hooks/useTabManager.ts`, `src/components/TabBar.tsx`
- **기능**:
  - 최대 10개 탭 동시 지원
  - localStorage 자동 저장/복원 (`gitmul_tabs`, `gitmul_active_tab`)
  - 탭별 독립 상태 (UI + Data)
  - Context menu: Close, Close Others, Close Right, Close All
  - 키보드 단축키: Ctrl+Tab (다음), Ctrl+Shift+Tab (이전), Ctrl+W (닫기)
- **구조**:
  ```typescript
  interface Tab {
    id: string;
    title: string;
    repoPath: string;
    uiState: TabUIState;    // 다이얼로그, 뷰 상태
    dataState: TabDataState; // 커밋, 파일, 브랜치 데이터
  }
  ```

#### 코드 리팩토링 (100%)
- **App.tsx**: 768줄 → 462줄 (-40%)
- **신규 Hooks**:
  - `useRepository.ts` (147줄): 레포지토리 작업 (열기, 새로고침, 데이터 로드)
  - `useGitOperations.ts` (112줄): Git 작업 (stage, unstage, commit)
- **신규 컴포넌트**:
  - `WelcomeScreen.tsx` (55줄): 탭 없을 때 환영 화면
  - `Toolbar.tsx` (200줄): 메인 툴바 (모든 버튼)

#### Phase 4: Image Diff (100%)
- **위치**: `src/components/ImageDiff.tsx`, `src/components/DiffViewer.tsx`
- **백엔드**: `src-tauri/src/commands/diff.rs` (Image Diff 관련 커맨드 추가)
- **기능**:
  - 이미지 파일 자동 감지 (png, jpg, jpeg, gif, svg, webp, bmp, ico, tiff)
  - 3가지 뷰 모드: **Side-by-side**, **Onion Skin**, **Swipe** 슬라이더
  - 이미지 메타데이터: 크기(px), 파일 용량, 포맷 표시
  - 파일 크기 변화량(+/-) 표시
  - Base64 인코딩으로 프론트엔드 전달
  - 체커보드 배경 (투명 이미지 지원)
  - Added/Deleted/Modified 상태 표시
  - 다크 모드 완벽 지원
- **백엔드 커맨드**:
  - `check_is_image`: 이미지 파일 여부 확인
  - `get_image_diff`: Old/New 이미지 데이터 비교 (staged/unstaged)
  - `get_image_at_commit`: 특정 커밋의 이미지 데이터 조회
- **이미지 포맷 파싱**: PNG, JPEG, GIF, WebP, SVG 해상도 자동 추출
- **구현 패턴**: DiffViewer에서 이미지 파일 감지 시 ImageDiff로 위임 (래퍼 패턴)

---

### ⏳ **진행 중 / 미완성**

#### Phase 5: 향후 작업
- **Commit Graph 개선**: 더 나은 시각화, 브랜치 병합 표시 개선
- **검색 & 필터**: 커밋 검색, 파일 필터링, 작성자 필터
- **Blame 뷰**: 라인별 작성자 표시, 커밋 히스토리 추적
- **Submodule 지원**: Submodule 감지, 서브모듈 업데이트
- **성능 최적화**: 대용량 레포지토리 지원, Virtual scrolling

---

## 🏗️ 기술 스택

| 분야 | 기술 | 버전 |
|------|------|------|
| **Frontend** | React | 18.2.0 |
| **언어** | TypeScript | 5.3.3 |
| **스타일링** | Tailwind CSS | 3.3.6 |
| **Backend** | Rust (Tauri) | 1.5.9 |
| **빌드 도구** | Vite | 5.0.8 |
| **상태 관리** | Custom Hooks | - |
| **Git 라이브러리** | git2 (Rust) | 0.18 |

---

## 📁 프로젝트 구조

```
gitmul/
├── src/                          # React 프론트엔드
│   ├── App.tsx                   # 메인 앱 (462줄) ⭐
│   ├── components/               # 20+ React 컴포넌트
│   │   ├── TabBar.tsx           # 탭 UI
│   │   ├── Toolbar.tsx          # 툴바 (200줄)
│   │   ├── WelcomeScreen.tsx    # 환영 화면
│   │   ├── DiffViewer.tsx       # Diff 뷰어 (이미지 감지 포함) ⭐
│   │   ├── ImageDiff.tsx        # 이미지 Diff 뷰어 ⭐ NEW
│   │   ├── CommitHistory.tsx    # 커밋 히스토리
│   │   ├── FileChanges.tsx      # 파일 변경 목록
│   │   ├── BranchManager.tsx    # 브랜치 관리
│   │   ├── RemoteManager.tsx    # 원격 저장소 관리
│   │   ├── CommitGraph.tsx      # 커밋 그래프
│   │   ├── CherryPickDialog.tsx # Cherry-pick UI
│   │   ├── RevertDialog.tsx     # Revert UI
│   │   ├── MergeDialog.tsx      # 병합 UI
│   │   ├── StashManager.tsx     # Stash 관리
│   │   ├── TagManager.tsx       # 태그 관리
│   │   ├── ReflogViewer.tsx     # Reflog 뷰어
│   │   ├── ConflictResolver.tsx # 충돌 해결
│   │   ├── FileHistory.tsx      # 파일 히스토리
│   │   └── ...
│   ├── hooks/                    # Custom Hooks
│   │   ├── useTabManager.ts     # 탭 관리 ⭐
│   │   ├── useRepository.ts     # 레포지토리 작업 (147줄) ⭐
│   │   ├── useGitOperations.ts  # Git 작업 (112줄) ⭐
│   │   ├── useKeyboardShortcuts.ts # 키보드 단축키
│   │   ├── useToast.ts          # 토스트 알림
│   │   └── useAccessibility.ts  # 접근성
│   ├── types/                    # TypeScript 타입
│   │   ├── git.ts               # Git 관련 타입 ⭐
│   │   └── tab.ts               # 탭 시스템 타입 ⭐
│   ├── utils/                    # 유틸리티
│   │   ├── wordDiff.ts          # Word-level diff ⭐
│   │   ├── i18n.ts              # 다국어 (한국어/영어)
│   │   └── accessibility.ts     # 접근성 헬퍼
│   ├── index.css                 # 전역 스타일
│   └── main.tsx                  # 엔트리 포인트
│
├── src-tauri/                    # Rust 백엔드
│   ├── src/
│   │   ├── main.rs              # Tauri 메인
│   │   ├── commands/            # Git 명령어 구현 ⭐
│   │   │   ├── git.rs           # 기본 Git 작업
│   │   │   ├── branch.rs        # 브랜치 관리
│   │   │   ├── diff.rs          # Diff 생성
│   │   │   ├── cherrypick.rs    # Cherry-pick
│   │   │   ├── revert.rs        # Revert
│   │   │   ├── merge.rs         # 병합
│   │   │   ├── stash.rs         # Stash
│   │   │   ├── remote.rs        # 원격 저장소
│   │   │   ├── tags.rs          # 태그
│   │   │   ├── reflog.rs        # Reflog
│   │   │   ├── repos.rs         # 레포지토리 관리
│   │   │   └── ...
│   │   └── tests/               # 통합 테스트
│   ├── Cargo.toml               # Rust 의존성
│   └── tauri.conf.json          # Tauri 설정
│
├── package.json                  # Node.js 의존성
├── tsconfig.json                 # TypeScript 설정
├── tailwind.config.js            # Tailwind 설정
├── vite.config.ts                # Vite 설정
├── README-GIT.md                 # GitHub README
├── CLAUDE.md                     # 이 문서
└── .gitignore

⭐ = 핵심 파일
```

---

## 🚀 빠른 시작

### 1. **환경 요구사항**
- Node.js 18+
- Rust 1.70+ (Tauri용)
- Git

### 2. **설치 및 실행**
```bash
# Clone
git clone https://github.com/woojjn/GitMul.git
cd GitMul

# 의존성 설치
npm install

# 개발 서버 시작 (웹 버전)
npm run dev
# → http://localhost:5173

# Tauri 앱 실행 (데스크톱 앱)
npm run tauri dev

# 프로덕션 빌드
npm run build

# Tauri 앱 빌드
npm run tauri build
```

### 3. **주요 명령어**
```bash
# TypeScript 타입 체크
npx tsc --noEmit

# Rust 테스트
cd src-tauri && cargo test

# 코드 포맷팅
npm run format  # (설정 필요)
```

---

## 🔑 핵심 개념

### 1. **탭 시스템 (Tab System)**

**설계 철학**: 각 탭은 독립적인 레포지토리 상태를 가짐

**구조**:
```typescript
// src/types/tab.ts
interface Tab {
  id: string;           // UUID
  title: string;        // 탭 제목 (레포명)
  repoPath: string;     // 레포지토리 경로
  uiState: TabUIState;  // UI 상태 (다이얼로그, 뷰)
  dataState: TabDataState; // 데이터 (커밋, 파일, 브랜치)
}

interface TabUIState {
  commitDialogOpen: boolean;
  showBranchManager: boolean;
  showRemoteManager: boolean;
  showCommitGraph: boolean;
  // ... 기타 UI 상태
}

interface TabDataState {
  currentRepo: RepositoryInfo | null;
  commits: CommitInfo[];
  fileChanges: FileStatus[];
  branches: BranchInfo[];
  loading: boolean;
}
```

**사용 예시**:
```typescript
// App.tsx에서
const tabManager = useTabManager();
const { tabs, activeTab, addTab, closeTab, updateTabDataState } = tabManager;

// 탭 추가
const newTab = addTab('/path/to/repo', 'RepoName');

// 탭 데이터 업데이트
updateTabDataState(tabId, { commits: [...] });

// 탭 UI 상태 업데이트
updateTabUIState(tabId, { commitDialogOpen: true });
```

---

### 2. **Repository Operations Hook**

**역할**: 레포지토리 관련 모든 작업 처리

**위치**: `src/hooks/useRepository.ts`

**제공 함수**:
```typescript
const {
  recentRepos,           // 최근 레포 목록
  loadRecentRepos,       // 최근 레포 로드
  openRepository,        // 레포 열기 (다이얼로그)
  openRepositoryPath,    // 특정 경로 레포 열기
  refreshRepository,     // 현재 레포 새로고침
} = useRepository({
  tabManager,
  onSuccess: showSuccess,
  onError: showError,
});
```

**내부 동작**:
1. `openRepositoryPath()` 호출
2. Tauri `open_repository` 커맨드 실행
3. 탭 생성 또는 기존 탭 활성화
4. `loadRepositoryData()` 호출
5. 커밋, 파일, 브랜치 데이터 로드
6. `updateTabDataState()` 업데이트

---

### 3. **Git Operations Hook**

**역할**: Git 작업 실행

**위치**: `src/hooks/useGitOperations.ts`

**제공 함수**:
```typescript
const {
  stageFile,      // 파일 스테이징
  unstageFile,    // 파일 언스테이징
  stageAll,       // 전체 스테이징
  commit,         // 커밋 생성/수정
} = useGitOperations({
  activeTab,
  refreshRepository,
  onSuccess,
  onError,
});
```

**특징**:
- 모든 작업 후 자동 `refreshRepository()` 호출
- 에러 처리 및 Toast 알림 자동 처리

---

### 4. **Word-level Diff**

**위치**: `src/utils/wordDiff.ts`, `src/components/DiffViewer.tsx`

**동작 방식**:
```typescript
// wordDiff.ts
export function renderWordDiff(content: string, lineType: string) {
  if (!wordDiffEnabled || lineType === 'context') {
    return <span>{content}</span>;
  }
  
  const words = content.split(/(\s+)/);
  return words.map((word, i) => {
    if (lineType === 'addition' && word.trim()) {
      return <span key={i} className="bg-green-300 dark:bg-green-700">{word}</span>;
    }
    if (lineType === 'deletion' && word.trim()) {
      return <span key={i} className="bg-red-300 dark:bg-red-700">{word}</span>;
    }
    return <span key={i}>{word}</span>;
  });
}
```

**토글**:
```typescript
// DiffViewer.tsx
const [wordDiffEnabled, setWordDiffEnabled] = useState(true);

<button onClick={() => setWordDiffEnabled(!wordDiffEnabled)}>
  {wordDiffEnabled ? 'Disable' : 'Enable'} Word Diff
</button>
```

---

## 🎨 UI/UX 가이드

### 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Ctrl+O` | 레포지토리 열기 |
| `Ctrl+R` | 새로고침 |
| `Ctrl+K` | 커밋 다이얼로그 |
| `Ctrl+Shift+A` | 전체 스테이징 |
| `Ctrl+B` | 브랜치 관리 |
| `Ctrl+M` | 원격 저장소 관리 |
| `Ctrl+Tab` | 다음 탭 |
| `Ctrl+Shift+Tab` | 이전 탭 |
| `Ctrl+W` | 탭 닫기 |

**구현**: `src/hooks/useKeyboardShortcuts.ts`

---

### 다크 모드

**구현**: Tailwind CSS의 `dark:` prefix 사용

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  ...
</div>
```

**토글**:
```typescript
// App.tsx
const [darkMode, setDarkMode] = useState(true);

useEffect(() => {
  if (darkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [darkMode]);
```

---

## 🧪 테스트

### 현재 테스트 현황
- **Rust 백엔드**: `src-tauri/src/tests/` (통합 테스트 존재)
- **React 프론트엔드**: 아직 없음 (TODO)

### 백엔드 테스트 실행
```bash
cd src-tauri
cargo test
```

### 프론트엔드 테스트 (향후 추가 필요)
```bash
# TODO: Vitest 또는 Jest 설정
npm test
```

---

## 📝 코딩 컨벤션

### Commit Message
```
<type>: <subject>

<body> (optional)
```

**Types**:
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드/설정 변경

**예시**:
```
feat: Add image diff viewer component

- Side-by-side image comparison
- Display metadata (size, resolution)
- Support png, jpg, gif, svg formats
```

---

### TypeScript 스타일
- **함수**: camelCase
- **컴포넌트**: PascalCase
- **상수**: UPPER_SNAKE_CASE
- **인터페이스**: PascalCase (prefix 없음)
- **타입**: PascalCase

---

### React 컴포넌트 구조
```typescript
// 1. Imports
import { useState } from 'react';
import { SomeIcon } from 'lucide-react';

// 2. Types/Interfaces
interface MyComponentProps {
  prop1: string;
  prop2?: number;
}

// 3. Component
export default function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // 3.1. State
  const [state, setState] = useState('');
  
  // 3.2. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 3.3. Handlers
  const handleClick = () => {
    // ...
  };
  
  // 3.4. Render
  return (
    <div>...</div>
  );
}
```

---

## 🗺️ Roadmap

### v1.7 (현재 - 85%)
- [x] Cherry-pick/Revert UI
- [x] Word-level Diff
- [x] Multiple Tabs
- [x] Code Refactoring
- [x] **Image Diff** ← 완료!

### v1.8 (미래)
- [ ] Commit Graph 개선
  - 더 나은 시각화
  - 브랜치 병합 표시 개선
- [ ] 검색 & 필터
  - 커밋 검색
  - 파일 필터링
  - 작성자 필터
- [ ] Blame 뷰
  - 라인별 작성자 표시
  - 커밋 히스토리 추적
- [ ] Submodule 지원
  - Submodule 감지
  - 서브모듈 업데이트
- [ ] 성능 최적화
  - 대용량 레포지토리 지원
  - Virtual scrolling
  - 메모이제이션

### v2.0 (장기)
- [ ] Git LFS 지원
- [ ] GPG 서명
- [ ] Interactive Rebase
- [ ] Worktree 관리
- [ ] 플러그인 시스템

---

## 🐛 알려진 이슈 & 제한사항

### 현재 제한사항
1. **이미지 Diff 미지원** → ✅ v1.7에서 완료 (Phase 4)
2. **대용량 레포지토리 성능 이슈** (커밋 1000개 이상)
3. **Submodule 미지원**
4. **Git LFS 미지원**
5. **Windows 경로 이슈** (일부 케이스)

### 해결 필요 (TODO)
- [ ] `CommitGraph.tsx`: 복잡한 브랜치 병합 시 그래프 겹침
- [ ] `DiffViewer.tsx`: 매우 긴 라인 처리 (가로 스크롤)
- [ ] `useTabManager.ts`: 10개 이상 탭 시 성능 저하
- [ ] localStorage 용량 제한 (큰 레포 데이터)

---

## 🔧 문제 해결 (Troubleshooting)

### 빌드 오류
```bash
# TypeScript 오류
npx tsc --noEmit

# Rust 오류
cd src-tauri && cargo check

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
```

### Tauri 실행 안 됨
```bash
# Rust 툴체인 확인
rustc --version
cargo --version

# Tauri CLI 재설치
npm install -D @tauri-apps/cli@latest
```

### 한글 깨짐
- **원인**: 파일 인코딩 문제
- **해결**: `src-tauri/src/commands/git.rs`에서 UTF-8 강제 사용
- **확인**: `unicode-normalization` 크레이트 사용 중

---

## 📚 참고 자료

### 공식 문서
- [Tauri](https://tauri.app/): Rust 기반 데스크톱 앱
- [React](https://react.dev/): UI 라이브러리
- [TypeScript](https://www.typescriptlang.org/): 타입 시스템
- [Tailwind CSS](https://tailwindcss.com/): 스타일링
- [git2-rs](https://docs.rs/git2/): Rust Git 라이브러리

### 유사 프로젝트
- [Fork](https://git-fork.com/): macOS/Windows Git GUI
- [SourceTree](https://www.sourcetreeapp.com/): Atlassian Git GUI
- [GitKraken](https://www.gitkraken.com/): 크로스 플랫폼 Git GUI

---

## 💡 개발 팁

### 1. **새 기능 추가 시**
```bash
# 1. Feature 브랜치 생성
git checkout -b feature/my-feature

# 2. 코드 작성

# 3. 테스트 (백엔드)
cd src-tauri && cargo test

# 4. 빌드 확인
npm run build

# 5. 커밋
git add .
git commit -m "feat: Add my awesome feature"

# 6. Push
git push origin feature/my-feature
```

### 2. **디버깅**
```typescript
// React DevTools 사용
console.log('Debug:', { activeTab, tabs });

// Rust 디버깅
// src-tauri/src/main.rs
println!("Debug: {:?}", value);
```

### 3. **성능 최적화**
```typescript
// useMemo 사용
const expensiveValue = useMemo(() => {
  return heavyComputation(data);
}, [data]);

// useCallback 사용
const handleClick = useCallback(() => {
  // ...
}, [deps]);
```

---

## 🤝 기여 가이드

### Pull Request 프로세스
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

### 리뷰 체크리스트
- [ ] 코드가 빌드되는가?
- [ ] TypeScript 오류가 없는가?
- [ ] 기존 기능이 동작하는가?
- [ ] 커밋 메시지가 컨벤션을 따르는가?
- [ ] README 업데이트가 필요한가?

---

## 📞 연락처

- **GitHub**: https://github.com/woojjn/GitMul
- **Issues**: https://github.com/woojjn/GitMul/issues
- **Owner**: @woojjn

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

**최종 업데이트**: 2026-02-20  
**버전**: v1.7 (85% 완료)  
**다음 작업**: Phase 5 - Commit Graph 개선 / 검색 & 필터

---

## 🚀 즉시 시작하기 (Quick Commands)

```bash
# 프로젝트 클론 및 실행
git clone https://github.com/woojjn/GitMul.git
cd GitMul
npm install
npm run dev

# Phase 4 시작하기 → 이미 완료!
# Phase 5 시작하기
# 1. src/components/CommitGraph.tsx 개선
# 2. 검색/필터 기능 추가
```

**이 문서로 누구나 바로 개발을 시작할 수 있습니다!** 🎉
