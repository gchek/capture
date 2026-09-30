"""
Entry point for PyInstaller  launched by Electron as a child process.
Pass `app` as an object (not a string) so PyInstaller traces the full
import chain and bundles api, capture, classifier, etc. automatically.
"""
import os
import sys
import threading
import time

if getattr(sys, 'frozen', False):
    bundle_dir = sys._MEIPASS
    if bundle_dir not in sys.path:
        sys.path.insert(0, bundle_dir)

# Direct import  PyInstaller follows this chain and includes all backend modules
from api.main import app  # noqa: E402
import uvicorn             # noqa: E402

def _exit_with_parent(pid: int) -> None:
    while True:
        time.sleep(2)
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            os._exit(0)
        except PermissionError:
            pass


if __name__ == '__main__':
    if os.environ.get('ORBIS_PARENT_PID'):
        threading.Thread(target=_exit_with_parent, args=(int(os.environ['ORBIS_PARENT_PID']),), daemon=True).start()
    # Electron bundles freeze the app; bind locally. Docker/dev default to all interfaces.
    default_bind = '127.0.0.1' if getattr(sys, 'frozen', False) else '0.0.0.0'
    uvicorn.run(
        app,
        host=os.environ.get('ORBIS_BIND', default_bind),
        port=int(os.environ.get('ORBIS_PORT', '8000')),
        log_level='warning',
    )
