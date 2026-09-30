# PCYBOX Orbis for Mac — install notes

Requires an Apple Silicon Mac (M1 or later) and an administrator account.

1. Open `PCYBOX Orbis-1.1.0-arm64.dmg` and drag **PCYBOX Orbis** into **Applications**.
2. The app isn't notarized by Apple, so the first launch is blocked. Either:
   - open it once, then go to **System Settings → Privacy & Security**, scroll down and click **Open Anyway**; or
   - run this once in Terminal, then open the app normally:
     ```
     xattr -dr com.apple.quarantine "/Applications/PCYBOX Orbis.app"
     ```
3. On every launch it asks for your Mac password. That is needed to read network traffic; the capture engine stops when you quit the app.

What it shows: which servers this Mac talks to, where they are, and which app is responsible. It only sees this Mac's own traffic, never the contents of encrypted connections.

Building it yourself: `./build-mac.sh` (output in `dist/installer/`).
