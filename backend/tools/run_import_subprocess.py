import subprocess, sys, os
backend_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(backend_dir)  # go up from tools/ to backend/
cmd = [sys.executable, '-c', 'import app.main; print("IMPORTED_OK")']
print('Running:', cmd, 'cwd=', backend_dir)
try:
	p = subprocess.run(cmd, capture_output=True, text=True, cwd=backend_dir, timeout=20)
	print('RC', p.returncode)
	print('OUT:\n', p.stdout)
	print('ERR:\n', p.stderr)
except Exception as exc:
	print('SUBPROCESS_EXCEPTION:', repr(exc))
