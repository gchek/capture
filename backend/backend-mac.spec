# backend-mac.spec — macOS build (onedir). Run from backend/:
#   ../.venv/bin/pyinstaller backend-mac.spec --distpath ../dist/backend-mac --workpath ../build/backend-mac -y
from PyInstaller.utils.hooks import collect_all, collect_submodules

scapy_datas, scapy_binaries, scapy_hiddenimports = collect_all('scapy')

a = Analysis(
    ['run_backend.py'],
    pathex=['.'],
    binaries=scapy_binaries,
    datas=scapy_datas,
    hiddenimports=(
        scapy_hiddenimports
        + collect_submodules('uvicorn')
        + collect_submodules('starlette')
        + collect_submodules('fastapi')
        + collect_submodules('pydantic')
        + collect_submodules('pydantic_core')
        + collect_submodules('anyio')
        + collect_submodules('websockets')
        + collect_submodules('dns')
        + ['h11', 'httptools', 'wsproto', 'aiofiles', 'psutil', 'sqlite3']
    ),
    excludes=['tkinter', 'matplotlib', 'numpy', 'PIL', 'PyQt5', 'wx'],
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='pcybox-orbis-backend',
    console=True,
    upx=False,
)

coll = COLLECT(exe, a.binaries, a.datas, name='pcybox-orbis-backend', upx=False)
