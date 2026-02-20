# GitMul v1.6 🚀

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-1.5-orange)](https://tauri.app/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)

**GitMul** - Modern Git GUI Tool built with Tauri, React, and TypeScript

> **이름의 의미**: GitMul = Git + Multiple (다중 탭, 다중 레포지토리 지원을 강조)

---

## ✨ Features

### ✅ **Completed (v1.6)**

- **🍒 Cherry-pick & Revert UI** (Phase 1)
  - Interactive commit selection
  - Visual conflict resolution
  - Undo support

- **📝 Word-level Diff** (Phase 2)
  - Side-by-side comparison
  - Syntax highlighting
  - Toggle word-level highlighting

- **📑 Multiple Tabs** (Phase 3)
  - Up to 10 concurrent repositories
  - Tab state persistence (localStorage)
  - Context menu (close, close others, close all)
  - Keyboard shortcuts (Ctrl+Tab, Ctrl+W)

- **🏗️ Code Refactoring**
  - App.tsx: 768 → 462 lines (-40%)
  - Custom hooks: useRepository, useGitOperations
  - Component extraction: WelcomeScreen, Toolbar

### ⏳ **In Progress**

- **🖼️ Image Diff** (Phase 4)
  - Side-by-side image comparison
  - Metadata display
  - Binary file support

---

## 🏗️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS |
| **Backend** | Rust (Tauri) |
| **Build Tool** | Vite |
| **State Management** | React Hooks (Custom) |
| **Styling** | Tailwind CSS + Dark Mode |

---

## 📊 Project Stats

```
App.tsx:                462 lines (-40% from 768)
TypeScript Errors:      0
Build Size:             283.79 kB (gzipped: 74.52 kB)
Components:             20+
Custom Hooks:           5
Tests:                  Passing
Git Commits:            2
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust (for Tauri)
- Git

### Installation

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/gitmul.git
cd gitmul

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run Tauri app
npm run tauri dev
```

---

## 📁 Project Structure

```
gitmul/
├── src/
│   ├── App.tsx              # Main app (462 lines)
│   ├── components/          # 20+ React components
│   │   ├── TabBar.tsx
│   │   ├── Toolbar.tsx
│   │   ├── WelcomeScreen.tsx
│   │   ├── DiffViewer.tsx
│   │   └── ...
│   ├── hooks/               # Custom hooks
│   │   ├── useTabManager.ts
│   │   ├── useRepository.ts
│   │   ├── useGitOperations.ts
│   │   └── ...
│   ├── types/               # TypeScript types
│   │   ├── git.ts
│   │   └── tab.ts
│   └── utils/               # Utilities
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   └── commands/        # Git operations
│   └── Cargo.toml
├── package.json
└── README.md
```

---

## 🎨 Architecture

### Component Hierarchy

```
App
├── WelcomeScreen (no tabs)
└── Main Layout
    ├── TabBar
    ├── Sidebar
    └── MainArea
        ├── Toolbar
        └── Content
            ├── CommitHistory
            ├── FileChanges
            ├── DiffViewer
            ├── BranchManager
            ├── RemoteManager
            └── ...
```

### State Management

- **Tab State**: `useTabManager` hook (localStorage: `gitmul_tabs`)
- **Repository**: `useRepository` hook  
- **Git Operations**: `useGitOperations` hook
- **UI State**: Per-tab state (isolated)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open repository |
| `Ctrl+R` | Refresh |
| `Ctrl+K` | Commit dialog |
| `Ctrl+Shift+A` | Stage all |
| `Ctrl+B` | Branch manager |
| `Ctrl+M` | Remote manager |
| `Ctrl+Tab` | Next tab |
| `Ctrl+W` | Close tab |

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run Rust tests
cd src-tauri && cargo test
```

---

## 📝 Development Guide

### Adding a New Feature

1. Create feature branch
   ```bash
   git checkout -b feature/your-feature
   ```

2. Implement feature

3. Test thoroughly

4. Commit with conventional commit message
   ```bash
   git commit -m "feat: add awesome feature"
   ```

5. Push and create PR
   ```bash
   git push origin feature/your-feature
   ```

### Commit Message Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

---

## 🗺️ Roadmap

### v1.6 (Current)
- [x] Cherry-pick/Revert UI
- [x] Word-level Diff
- [x] Multiple Tabs
- [x] Code Refactoring
- [x] Project rename (GitFlow → GitMul)
- [ ] Image Diff

### v1.7 (Future)
- [ ] Graph visualization improvements
- [ ] Search & filter commits
- [ ] Blame view
- [ ] Submodule support
- [ ] Performance optimizations

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👏 Acknowledgments

- [Tauri](https://tauri.app/) - Rust-powered app framework
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icon library

---

## 📧 Contact

- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/gitmul/issues)

---

**Made with ❤️ by GitMul Team**
