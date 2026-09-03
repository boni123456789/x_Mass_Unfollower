# ⚡ CleanSweep X (`x_Mass_Unfollower`)

> **The privacy-first, tactile feed auditor & automated mass unfollower for X (Twitter).**  
> Clean up your timeline, purge dead accounts, and curate high-signal follows with Duolingo-level mechanical polish and zero cloud exposure.

---

## 🔥 Is CleanSweep X Right For You? (The Spicy Details)

If you have used other Twitter / X unfollowers in the past, you probably noticed two ugly truths:
1. **Cloud SaaS Scams**: They ask for your raw Twitter password, session tokens, or developer API keys that send your private cookies to their external servers. Your account gets shadowbanned, locked, or compromised.
2. **Clunky Console Scripts**: Other open-source tools force you to open DevTools, copy messy code snippets into the console on an open tab, and babysit the page without any feedback or undo history.

### How CleanSweep X is Radically Different:

- 🛡️ **100% Local & Privacy-First**: Zero third-party cloud servers. Both the frontend UI and proxy backend run exclusively on your own machine (`localhost:5173` & `localhost:3001`). Your credentials never leave your local computer.
- ⚡ **1-Click Extension Toolbar Sync**: No manual script copying. Click the CleanSweep X favicon/icon in your Chrome browser toolbar to silently extract your following list in the background and jump straight into the audit workstation.
- 🤖 **Automated Background Queue Daemon**: Queue up 50 or 500 accounts to unfollow, hit Trigger, and let it run. The extension automatically opens a silent background tab to execute the actions directly through X's authenticated session with humanized delays (1.9s–2.6s).
- 🛑 **Intelligent HTTP 429 Rate-Limit Shield**: If X throttles requests, CleanSweep X immediately catches the 429 status, pauses the queue, and enforces a safety cooldown (90s) before resuming, keeping your account safe from restrictions.
- 🎮 **Tactile Duolingo/Linear Micro-Interactions**: Features 3D push-down physical buttons, spring physics, zero-latency Web Audio sound effects (punchy mechanical thuds for unfollowing, bubbly pops for keeping), confetti streak celebrations, and a visible mechanical keyboard dock.
- 🌍 **Full Internationalization (EN / DE)**: Seamless 1-click language toggle between English and German across all modals, badges, timestamps, and toasts.

---

## 🚀 Step-by-Step Quickstart Guide

Getting up and running takes less than 2 minutes:

### Step 1: Clone the Repository & Install Dependencies
Open your terminal and run:
```bash
git clone https://github.com/boni123456789/x_Mass_Unfollower.git
cd x_Mass_Unfollower
npm install
```

### Step 2: Start the Local Servers
Start both the backend queue proxy and the Vite development server in one command:
```bash
npm run dev
```
- **Web App**: [http://localhost:5173/](http://localhost:5173/)
- **Backend Bridge**: [http://localhost:3001/](http://localhost:3001/) (auto-reloads on edits via `node --watch`)

### Step 3: Load the CleanSweep X Chrome Extension
1. Open Google Chrome (or Brave / Edge / Arc) and navigate to:
   ```text
   chrome://extensions
   ```
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension/` directory inside this project folder.
5. *(Optional but recommended)* Click the puzzle piece icon in Chrome's toolbar and **pin** CleanSweep X so its icon is visible.

### Step 4: Sync Your X Following List
1. Open a tab with [x.com](https://x.com/) and make sure you are logged into your account.
2. Click the **CleanSweep X icon** in your browser toolbar.
3. You will see the icon badge change to `...` (amber), sync your following accounts, and flash `✓` (green).
4. CleanSweep X will automatically open or focus [http://localhost:5173/](http://localhost:5173/) with your real-time following list loaded!

### Step 5: Rapid Audit & Clean
Now use the keyboard or mouse to blitz through your follows:
- **Review Mode**:
  - Press `U` or `←` to **Unfollow** (punches a mechanical thud and queues for background execution).
  - Press `K` or `→` to **Keep** (produces a bubbly chime and stamps account as kept).
  - Press `Ctrl + Z` to **Undo** any previous decision instantly.
- **Auto Clean Filter (Batch Mode)**:
  - Click **Auto Clean** in the top navigation bar.
  - Filter by inactive accounts (>6 months since last post), zero-follower ratios, no profile picture, or missing reciprocal follows.
  - Review the batch list and click **Unfollow All Selected** to dispatch them directly into the automated queue!

---

## ⌨️ Mechanical Keyboard Shortcuts

CleanSweep X is built for extreme efficiency. You can audit hundreds of accounts without touching the mouse:

| Shortcut | Action | Sound & Tactile FX |
| :--- | :--- | :--- |
| **`U`** or **`←`** | **Queue Unfollow** | 320Hz → 75Hz Mechanical Thud + Stamp |
| **`K`** or **`→`** | **Keep Account** | 420Hz → 860Hz Bubbly Pop + Stamp |
| **`↑`** / **`↓`** or **`W`** / **`S`** | **Navigate Accounts** | Micro-Click (1100Hz) |
| **`Space`** | **Toggle Selection** | Tactile Click |
| **`Ctrl + Z`** / **`⌘Z`** | **Undo Last Action** | Rewind Slide Tone |
| **`Ctrl + Enter`** | **Execute Queue** | 3D Push-Down |
| **`1` / `2` / `3` / `4`** | **Filter Tabs** | All / Non-Followers / Inactive / Verified |

---

## 🏗️ Architecture & How It Works

```
┌────────────────────────────────────────────────────────┐
│                   CleanSweep X Web App                 │
│              (React 19 + Vite @ localhost:5173)        │
└──────────────┬────────────────────────▲────────────────┘
               │                        │
       POST /queue_unfollow       Web Audio FX &
       GET  /queue_status        Confetti Milestones
               │                        │
┌──────────────▼────────────────────────┴────────────────┐
│               Local Express Queue Proxy                │
│             (Node.js --watch @ localhost:3001)         │
│  - Sanitizes tokens                                    │
│  - Persistent storage (unfollow_queue.json)            │
│  - Rate-limit cooldown state (HTTP 429 protection)     │
└──────────────▲────────────────────────▲────────────────┘
               │                        │
       GET /pending_unfollows     POST /unfollow_result
               │                        │
┌──────────────▼────────────────────────┴────────────────┐
│        CleanSweep X Extension (Manifest V3)            │
│  - Background Service Worker (background.js)           │
│  - Toolbar Action Click Listener (chrome.action)       │
│  - Auto-manages background x.com tab                   │
└──────────────────────────┬─────────────────────────────┘
                           │ First-party cookies & CSRF
┌──────────────────────────▼─────────────────────────────┐
│                 X.com API Endpoints                    │
│      - /i/api/1.1/friendships/destroy.json             │
│      - /i/api/graphql/.../UnfollowUser                 │
└────────────────────────────────────────────────────────┘
```

1. **Frontend (`src/`)**: High-performance React UI built with vanilla CSS design tokens inspired by Linear and Airbnb. Includes custom synthetic Web Audio oscillators (no audio file dependencies) and `canvas-confetti`.
2. **Proxy Server (`server.js`)**: Coordinates the queue state, caches expanded `t.co` URLs, and persists local state. Local state files (`imported_session.json` and `unfollow_queue.json`) are strictly git-ignored.
3. **Browser Extension (`extension/`)**: Uses Chrome Manifest V3 to connect the web app to your authenticated X session without storing your password.

---

## 🛡️ Privacy & Safety Guidelines

- **No Passwords Required**: CleanSweep X never asks for, receives, or stores your X password.
- **Safety Cadence**: The background worker unfollows with natural random delays (1.9s–2.6s) to stay within recommended human usage patterns.
- **Recommended Daily Limit**: We recommend unfollowing no more than **200–400 accounts per day** to stay well clear of automated flags.
- **Immediate Pause**: You can pause, resume, or clear the queue at any time from the top menu bar.

---

## 🛠️ Development & Testing

- **Run Linter**:
  ```bash
  npm run lint
  ```
- **Build Production Bundle**:
  ```bash
  npm run build
  ```
- **Preview Production Build**:
  ```bash
  npm run preview
  ```

---

## 📜 License

MIT License. Crafted for high-signal curation and a cleaner, faster feed.
