"""Root npm scripts always use the isolated backend virtual environment."""
import os
from pathlib import Path
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
python=root/'backend/.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
commands={
    'dev':['-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8000'],
    'index':['-m','backend.app.knowledge.store'], # Refreshes the current default-branch snapshot only; no Git history.
    'test':['-m','pytest','backend/tests','-q','-o','cache_dir=artifacts/pytest-cache'],
    'smoke':['-m','backend.smoke'],
}
if len(sys.argv)!=2 or sys.argv[1] not in commands: raise SystemExit('Usage: python backend/run.py dev|index|test|smoke')
if not python.exists(): raise SystemExit('Create backend/.venv and install backend/requirements.txt first. See backend/README.md.')
try: raise SystemExit(subprocess.call([str(python),*commands[sys.argv[1]]],cwd=root))
except KeyboardInterrupt: pass
