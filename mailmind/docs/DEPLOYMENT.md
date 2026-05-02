# MailMind Deployment Guide

## Build Requirements

- **Node.js**: >= 18.x
- **Rust**: >= 1.75 (via rustup)
- **System deps**: See Tauri v2 prerequisites per platform

### Platform Prerequisites

**macOS:**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

**Windows:**
- Microsoft Visual Studio C++ Build Tools
- WebView2 (comes with Windows 11, install manually on Windows 10)

## Development

```bash
cd mailmind
npm install
npm run dev        # Vite dev server
cargo tauri dev    # Full Tauri development
```

## Production Build

```bash
cargo tauri build
```

Outputs per platform:
- **macOS**: `.dmg` + `.app` in `src-tauri/target/release/bundle/`
- **Windows**: `.exe` + `.msi` in `src-tauri/target/release/bundle/`
- **Linux**: `.deb` + `.rpm` in `src-tauri/target/release/bundle/`

## CI/CD (GitHub Actions)

Configured in `.github/workflows/build.yml`:
1. Run tests (`npm test`)
2. Type check (`npx tsc --noEmit`)
3. Build per platform
4. Create GitHub Release with artifacts

## Model Distribution

- **0.5B model** (~350MB): Bundled in app
- **7B model** (~4.5GB): Downloaded on first use via ModelDownloadProgress component
- **Embedding model** (~95MB): Downloaded on first use
- All models verified via SHA-256 checksum

## Auto-Update

Tauri Updater configured for automatic update checks. Sign update artifacts with your private key.

## Data Storage

- **Database**: PGLite stored in app data directory
- **Sync state**: localStorage (browser) + PGLite
- **Audit log**: localStorage with hash chain integrity
- **Model files**: App data directory, `.gitignore`d
