<div align="center">

# WordCapture

**Capture English words from any webpage, translate them to Spanish, and build your vocabulary through spaced repetition.**

[![Chrome](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange)]()

</div>

---

## Features

- **Word Capture** -- Select any English word or phrase on a webpage and translate it instantly
- **Multiple Translations** -- Get several Spanish translations with part-of-speech tags for each word
- **Smart Positioning** -- Widget auto-positions based on available viewport space
- **Vocabulary Learning** -- Flashcards with spaced repetition (SM-2 algorithm)
- **Statistics Dashboard** -- Track your learning progress over time
- **Offline Storage** -- All data stored locally via IndexedDB, no server required
- **Lightweight** -- Direct Google Translate API calls, no heavy dependencies

---

## Installation

### From Source (Developer Mode)

1. Clone the repository:
   ```bash
   git clone https://github.com/JhonyLezama/word-capture.git
   cd word-capture
   ```

2. Open Chrome or Brave and navigate to `chrome://extensions`

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** and select the `word-capture` folder

5. The extension icon appears in your toolbar

### From a `.zip` File

1. Download or extract the project folder
2. Follow steps 2-5 above

---

## Usage

1. Navigate to any webpage with English content
2. **Select** a word or phrase with your mouse
3. A popup widget appears with the Spanish translation(s)
4. Click **Save** to add the word to your vocabulary
5. Click the extension icon to open the **popup** and review your saved words
6. Use **Flashcards** to practice with spaced repetition
7. Check **Statistics** to track your progress

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Close widget | `Escape` |

---

## Architecture

The project follows **Clean Architecture** with **SOLID** principles:

```
word-capture/
  core/
    entities/          # Business entities (Word)
    interfaces/        # Contracts (ITranslator, IWordRepository)
    use-cases/         # Application logic (TranslateWord, SaveWord, etc.)
  infrastructure/
    translators/       # Google Translate API adapter
    storage/           # IndexedDB adapter
    config/            # App configuration
  presentation/
    content/           # Content script + widget UI
    popup/             # Extension popup
    options/           # Settings page
  shared/
    DIContainer.js     # Dependency injection
    EventBus.js        # Event-driven communication
    utils/             # Helpers and utilities
  icons/               # SVG icons (16, 48, 128)
  background.js        # Service worker
  manifest.json        # Extension manifest
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Platform | Chrome / Brave Extension (Manifest V3) |
| Translation | Google Translate API (dual endpoint fallback) |
| Fallback | MyMemory API |
| Storage | IndexedDB v2 |
| Architecture | Clean Architecture + SOLID |
| Linting | ESLint (flat config) |
| Package Manager | pnpm |

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [pnpm](https://pnpm.io/)
- Google Chrome or Brave Browser

### Setup

```bash
pnpm install
```

### Lint

```bash
pnpm lint          # Check for errors
pnpm lint:fix      # Auto-fix issues
```

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `contextMenus` | Right-click menu to translate selected words |
| `storage` | Persist extension settings |
| `activeTab` | Access the current tab for content script injection |

---

## License

MIT
