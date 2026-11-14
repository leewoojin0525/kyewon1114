"""Download connector-returned file references. Signed URLs stay in stdin only."""
import json, os, sys, termios, pathlib, urllib.request, hashlib, ssl

root = pathlib.Path(__file__).resolve().parents[1] / 'assets' / 'drive-projects'
tls = ssl.create_default_context(cafile='/etc/ssl/cert.pem')
original = termios.tcgetattr(sys.stdin)
hidden = termios.tcgetattr(sys.stdin)
hidden[3] &= ~(termios.ECHO | termios.ICANON)
hidden[6][termios.VMIN] = 1
hidden[6][termios.VTIME] = 0
termios.tcsetattr(sys.stdin, termios.TCSADRAIN, hidden)
print('Ready for authenticated file references on stdin (hidden).', flush=True)
try:
    items = json.loads(sys.stdin.readline())
finally:
    termios.tcsetattr(sys.stdin, termios.TCSADRAIN, original)
for item in items:
    target = (root / item['path']).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError('Destination outside project asset directory')
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size == item.get('bytes'):
        print(json.dumps({'path': item['path'], 'status': 'already saved'}), flush=True)
        continue
    temporary = target.with_suffix(target.suffix + '.download')
    size = 0
    digest = hashlib.sha256()
    try:
        with urllib.request.urlopen(item['url'], timeout=90, context=tls) as response, temporary.open('wb') as output:
            while chunk := response.read(1024 * 1024):
                size += len(chunk)
                if size > 1024 * 1024 * 1024:
                    raise ValueError('File exceeds one GB download budget')
                digest.update(chunk)
                output.write(chunk)
        if item.get('bytes') and size != int(item['bytes']):
            raise ValueError('Downloaded byte count differs from metadata')
        temporary.replace(target)
        print(json.dumps({'path': item['path'], 'bytes': size, 'sha256': digest.hexdigest()}), flush=True)
    except Exception as error:
        temporary.unlink(missing_ok=True)
        print(json.dumps({'path': item['path'], 'error': type(error).__name__}), flush=True)
        raise SystemExit(1)
