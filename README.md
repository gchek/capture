<div align="center">

<img src="docs/pcybox-orbis-white.svg" width="180" alt="PCYBOX Orbis logo"/>

# Capture

**A macOS port of PCYBOX Orbis — real-time network traffic visualizer.**

See every connection your Mac makes: who it talks to, where they are, and which app is responsible.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)-blue.svg)]()

<img src="docs/demo.gif" alt="Orbis demo" width="100%"/>

</div>

---

## Fork notice

This is a fork of **[PCYBOX Orbis](https://github.com/Mister-iks/pcybox-orbis)** by [Mister-iks](https://github.com/Mister-iks), a Windows-only tool. All credit for the original design, UI and capture engine goes to them. The original git history is preserved in this repository, and the project stays under the same **AGPL v3** license.

## What this fork changes

**macOS support**
- Runs on macOS with Scapy over BPF instead of Npcap.
- Packaged as a `.dmg` for Apple Silicon (`build-mac.sh`). Capture needs root, so the app asks for the Mac password on each launch, and the capture engine exits when the app quits. See [MAC-INSTALL.md](MAC-INSTALL.md).
- Works with a VPN: it captures on the tunnel interface (`utun*`) as well as Ethernet/Wi-Fi, and ignores the encrypted copy of the traffic to the VPN server, so you see real destinations and apps instead of one encrypted connection.
- Process attribution uses a socket table cached once per second, instead of scanning it for every packet, which cut CPU use from about 40% to 10–15% of a core in a quick test.
- The map falls back to your public IP's location when the browser can't provide one (Electron can't), instead of a hard-coded Paris.

**Detection and display**
- **Beacon detector** rewritten: it now looks for outbound bursts at near-constant intervals, instead of flagging any host that receives 30 packets per minute. Steady HTTPS streams no longer trigger it. Periodic keepalives (push notifications, chat apps) still can.
- **MAC vendor lookup** uses the full IEEE registry that ships with macOS, and recognizes randomized "private" Wi-Fi addresses.
- **Anycast hosts** (Cloudflare, Google Public DNS, Quad9, OpenDNS, Fastly) are drawn around "You" instead of at their registered location, which is meaningless for anycast (`1.1.1.1` is registered in Australia).
- **Privacy score** no longer counts ordinary servers as ad networks or trackers (Google, Google Cloud, WhatsApp), and counts recurring beacon and warning alerts once per host instead of once per alert. It measures which servers your apps contact, not whether you use a VPN.
- **Last-seen fade:** hosts with no traffic fade on the map after 1 minute and disappear after 5.

## Features (from upstream)

| Feature | Description |
|---|---|
| Force Graph | Live node graph — your machine at the center, every connection as a node |
| World Map | Geolocated IPs with animated arcs |
| 60-min Timeline | Sliding history stored locally in SQLite |
| Anomaly Detection | Flags suspicious ports, beaconing, volume spikes |
| Process Attribution | Which app generates which traffic |
| LAN Scanner | ARP discovery of devices on your network |
| Privacy Score | Score of your outgoing traffic exposure |
| Bandwidth Monitor | Live sparkline |

It only sees this Mac's own traffic, and never the contents of encrypted connections.

## Run from source (macOS)

Requires Python 3.10+ (3.14 works), Node.js 18+ and an administrator password.

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
(cd frontend && npm install)

./run-mac.sh     # starts the Vite dev server and the backend as root
```

Then open http://localhost:5173.

## Build the app

```bash
.venv/bin/pip install pyinstaller
./build-mac.sh   # frontend + PyInstaller backend + Electron app + ad-hoc signed DMG in dist/installer/
```

The app is ad-hoc signed, not notarized, so macOS blocks the first launch; [MAC-INSTALL.md](MAC-INSTALL.md) explains how to open it. Notarization needs a Developer ID certificate.

## Geolocation and privacy

Without a MaxMind `GeoLite2-City.mmdb` in `data/`, each remote IP is sent to [ip-api.com](https://ip-api.com) (plain HTTP, 45 lookups per minute) to find its location, and one extra lookup finds where "You" are. Put a GeoLite2 database in `data/` to keep lookups offline.

## Windows and Docker

The upstream Windows and Docker setup is still in the repository, but this fork hasn't tested it. See the [original project](https://github.com/Mister-iks/pcybox-orbis) for those.

## Stack

Python · FastAPI · WebSockets · SQLite · Scapy — React 18 · Vite · D3.js · TopoJSON — Electron 28 · PyInstaller.

## License

AGPL v3 — see [LICENSE](LICENSE). Any derivative work must also be open source under AGPL v3.
