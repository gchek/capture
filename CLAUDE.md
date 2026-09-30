# CLAUDE.md

Fork of [Mister-iks/pcybox-orbis](https://github.com/Mister-iks/pcybox-orbis) (AGPL v3): a real-time network traffic visualizer, ported to macOS. Public repo: https://github.com/gchek/capture. Keep the license and upstream credit intact.

## Layout

- `backend/` — FastAPI + Scapy. `api/main.py` (REST + `/ws` websocket + state), `capture/sniffer.py`, `detection/anomaly.py`, `resolver/dns_geo.py`, `scanner/` (ARP + OUI), `storage/db.py` (SQLite).
- `frontend/` — React + D3 (`graph/ForceGraph.jsx`, `map/MapView.jsx`, `hooks/useWebSocket.js`, `App.jsx`). Vite proxies API calls to `:8000` in dev.
- `electron/` — desktop wrapper. On macOS it starts the backend as root through an `osascript` admin prompt.
- `run-mac.sh` (dev), `build-mac.sh` (app + DMG), `backend/backend-mac.spec` (PyInstaller).

## Commands

- Dev: `./run-mac.sh` → http://localhost:5173. It needs sudo (BPF capture and `psutil.net_connections` both need root on macOS).
- Build: `./build-mac.sh` → `dist/installer/*.dmg` (Apple Silicon only, ad-hoc signed, not notarized).
- Python 3.10+ is required (`X | None` syntax); the system Python 3.9 won't work. Use the `.venv`.

## Things that are easy to get wrong

- **The backend runs as root**, so you cannot stop it as a normal user. `run_backend.py` exits by itself when `ORBIS_PARENT_PID` dies. To restart in dev, Ctrl+C the `run-mac.sh` terminal.
- **Port 8000:** the dev backend (binds `0.0.0.0`) and the packaged one (binds `127.0.0.1`) can run side by side, and `127.0.0.1` wins. Check `netstat -anv -p tcp | grep 8000` before debugging "wrong data".
- **Silent capture failure:** without root, Scapy's `AsyncSniffer` fails inside its thread and the graph just stays empty.
- **Process attribution** uses a socket table cached for 1 second (`sniffer.py`). Connections shorter than that get no process name. Don't go back to scanning per packet — it costs ~40% CPU.
- **Beacon detection** flags near-constant-interval outbound bursts (see `BEACON_*` in `anomaly.py`). Periodic keepalives can still trigger it; use the process name to judge.
- **Anycast hosts** are detected by org name in `dns_geo.py` and drawn around "You" on the map, since their registered location is meaningless.
- **Hosts fade** after 60 s and disappear after 5 min without traffic (`FADE_AFTER_MS` / `HIDE_AFTER_MS` in `useWebSocket.js`). This affects only the drawn views. Sidebar stats still count everything since backend start.
- **Geolocation:** the map asks the browser first, then `/me` (public-IP lookup), then Paris. Electron has no browser geolocation, so `/me` matters for the packaged app. Without a `data/GeoLite2-City.mmdb`, every remote IP goes to ip-api.com over HTTP.
- **MAC vendors** come from macOS's own `oui.plist`, with a small built-in table as fallback elsewhere.
- **Windows/Docker** paths from upstream are untouched but untested here. `electron/package.json` keeps Windows-only resources under `win.extraResources`.
- `dist/`, `build/`, `node_modules/` and `.venv/` are ignored. Don't commit build output.
- BSD `sed` needs `sed -i ''` on macOS.
