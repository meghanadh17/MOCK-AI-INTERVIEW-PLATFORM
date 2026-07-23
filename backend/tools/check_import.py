import subprocess, sys

p = subprocess.run([sys.executable, '-c', 'import app.main; print("ok")'], capture_output=True, text=True)
print('RC', p.returncode)
print('OUT', p.stdout)
print('ERR', p.stderr)
