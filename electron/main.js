const _electron        = require('electron')
const { app, BrowserWindow, dialog } = _electron.default || _electron
const { spawn, execSync }            = require('child_process')
const path = require('path')
const http = require('http')
const fs   = require('fs')

// ── Paths ──────────────────────────────────────────────────────────────────────
const isDev        = !app.isPackaged
const isMac        = process.platform === 'darwin'
const resourcesDir = isDev
  ? path.join(__dirname, '..')          // trafic_graph/
  : process.resourcesPath

const backendExe = isMac
  ? (isDev
      ? path.join(resourcesDir, 'dist', 'backend-mac', 'pcybox-orbis-backend', 'pcybox-orbis-backend')
      : path.join(resourcesDir, 'backend', 'pcybox-orbis-backend'))
  : isDev
    ? path.join(resourcesDir, 'dist', 'backend', 'pcybox-orbis-backend.exe')
    : path.join(resourcesDir, 'pcybox-orbis-backend.exe')

const npcapInstaller = isDev
  ? path.join(resourcesDir, 'resources', 'npcap-installer.exe')
  : path.join(resourcesDir, 'npcap-installer.exe')

const frontendDist = isDev
  ? path.join(resourcesDir, 'frontend', 'dist')
  : path.join(resourcesDir, 'frontend_dist')

const BACKEND_URL = 'http://127.0.0.1:8000'
const BACKEND_PORT = 8000

const iconPath = isDev
  ? path.join(__dirname, 'icon.png')
  : path.join(resourcesDir, 'icon.png')

let mainWindow   = null
let splashWindow = null
let backendProc  = null
let isQuitting   = false

// ── Port management ────────────────────────────────────────────────────────────
function killPort(port) {
  try {
    const out = execSync(`netstat -ano`, { encoding: 'utf8', stdio: 'pipe' })
    const pids = new Set()
    for (const line of out.split('\n')) {
      // Match lines with :PORT in local address column
      if (!line.includes(`:${port} `) && !line.includes(`:${port}\t`)) continue
      const m = line.trim().match(/(\d+)\s*$/)
      if (m && m[1] !== '0') pids.add(m[1])
    }
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' }) } catch {}
    }
    if (pids.size > 0) {
      // Brief wait for OS to release the port (synchronous ping ≈ 1s)
      try { execSync('ping -n 2 127.0.0.1', { stdio: 'pipe' }) } catch {}
    }
  } catch {}
}

// ── Npcap ──────────────────────────────────────────────────────────────────────
function isNpcapInstalled() {
  const keys = [
    'HKLM\\SOFTWARE\\Npcap',
    'HKLM\\SOFTWARE\\WOW6432Node\\Npcap',
  ]
  for (const key of keys) {
    try {
      const out = execSync(`reg query "${key}"`, { stdio: 'pipe', encoding: 'utf8' })
      if (out.includes('Npcap') || out.includes(key)) return true
    } catch {}
  }
  return false
}

function installNpcap() {
  if (!fs.existsSync(npcapInstaller)) return false
  try {
    // Silent mode (/S) requires Npcap OEM (paid). Run the standard GUI installer.
    execSync(`"${npcapInstaller}"`, { stdio: 'inherit' })
    return true
  } catch { return false }
}

// ── Windows ────────────────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 380, height: 310, frame: false,
    resizable: false, alwaysOnTop: true, center: true,
    transparent: true, icon: iconPath,
    webPreferences: { nodeIntegration: false },
  })
  splashWindow.loadFile(path.join(__dirname, 'splash.html'))
}

function createMain() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 600,
    show: false, title: 'PCYBOX Orbis', backgroundColor: '#000000',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  })

  if (isDev && process.env.VITE_DEV === '1') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(frontendDist, 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) { splashWindow.destroy(); splashWindow = null }
    mainWindow.show()
    mainWindow.focus()
  })
  mainWindow.on('closed', () => { mainWindow = null })
}

// ── Backend ────────────────────────────────────────────────────────────────────
function waitForBackend(maxAttempts = 40) {
  return new Promise((resolve, reject) => {
    let n = 0
    function poll() {
      http.get(BACKEND_URL + '/graph', res => {
        if (res.statusCode === 200) resolve()
        else retry()
      }).on('error', retry)
    }
    function retry() {
      if (++n >= maxAttempts) reject(new Error('Backend timeout'))
      else setTimeout(poll, 1000)
    }
    poll()
  })
}

function killBackend() {
  // macOS: the backend runs as root, so we can't kill it; it exits by itself when this process dies.
  if (isMac) return
  if (backendProc) {
    try {
      // taskkill /F is more reliable than .kill() on Windows
      execSync(`taskkill /PID ${backendProc.pid} /T /F`, { stdio: 'pipe' })
    } catch {}
    backendProc = null
  }
  // Also free the port in case of zombie
  killPort(BACKEND_PORT)
}

// Packet capture needs root on macOS (BPF), so ask for the admin password once per launch.
function launchBackendMac() {
  const dataDir = path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  const sh = v => `'${v.replace(/'/g, "'\\''")}'`
  const asString = v => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const cmd = `ORBIS_PARENT_PID=${process.pid} ORBIS_DATA_DIR=${sh(dataDir)} ${sh(backendExe)} >/dev/null 2>&1 &`
  const script = `do shell script "${asString(cmd)}" with administrator privileges with prompt "PCYBOX Orbis needs administrator access to capture network traffic."`
  const proc = spawn('osascript', ['-e', script], { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''
  proc.stderr.on('data', d => { err += d })
  proc.on('exit', code => {
    if (code === 0 || isQuitting) return
    dialog.showErrorBox('PCYBOX Orbis', err.includes('-128')
      ? 'Administrator access is required to capture network traffic.'
      : `Could not start the capture engine:\n${err}`)
    app.quit()
  })
}

function launchBackend() {
  if (!fs.existsSync(backendExe)) {
    dialog.showErrorBox('PCYBOX Orbis', `Backend introuvable :\n${backendExe}`)
    app.quit(); return
  }
  if (isMac) return launchBackendMac()

  // Free port before launching  handles zombies from crashed sessions
  killPort(BACKEND_PORT)

  const env = Object.assign({}, process.env)
  delete env.ELECTRON_RUN_AS_NODE

  backendProc = spawn(backendExe, [], { detached: false, stdio: 'ignore', env })
  backendProc.on('error', err => {
    if (isQuitting) return
    dialog.showErrorBox('PCYBOX Orbis', `Impossible de démarrer le backend :\n${err.message}`)
    app.quit()
  })
  backendProc.on('exit', (code) => {
    if (isQuitting) return      // normal shutdown  don't alert
    if (mainWindow) {
      dialog.showErrorBox('PCYBOX Orbis', `Backend arrêté (code ${code}).`)
      app.quit()
    }
  })
}

// ── App lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  if (!isMac && !isNpcapInstalled()) {
    if (fs.existsSync(npcapInstaller)) {
      const choice = dialog.showMessageBoxSync({
        type: 'question', title: 'PCYBOX Orbis - Npcap requis',
        message: 'PCYBOX Orbis nécessite Npcap pour capturer le trafic réseau.\nInstaller maintenant ?',
        buttons: ['Installer', 'Quitter'], defaultId: 0,
      })
      if (choice === 1) { app.quit(); return }
      if (!installNpcap()) {
        dialog.showErrorBox('PCYBOX Orbis', 'Installation Npcap échouée. Installe-le manuellement depuis https://npcap.com')
        app.quit(); return
      }
    }
  }

  createSplash()
  launchBackend()

  try {
    await waitForBackend()
  } catch (e) {
    dialog.showErrorBox('PCYBOX Orbis', `Backend non disponible :\n${e.message}`)
    app.quit(); return
  }

  createMain()
})

app.on('window-all-closed', () => {
  // Single-window monitor: quit everywhere so the root backend never lingers.
  isQuitting = true  // block spurious exit-event dialogs before before-quit fires
  app.quit()
})

app.on('before-quit', () => {
  isQuitting = true
  killBackend()
})
