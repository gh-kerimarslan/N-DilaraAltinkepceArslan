"""Set the trusted public Cloud Run status URL and the exact matching CSP origin."""
from pathlib import Path
from urllib.parse import urlsplit
from html import escape
import re,sys
root=Path(__file__).resolve().parent.parent
if len(sys.argv)!=2:
    raise SystemExit('Usage: python3 scripts/configure_alarm.py https://YOUR-SERVICE.run.app/v1/status')
url=sys.argv[1];p=urlsplit(url)
if p.scheme!='https' or not p.hostname or not p.hostname.endswith('.run.app') or p.username or p.password or p.port or p.query or p.fragment or p.path!='/v1/status':
    raise SystemExit('Expected the HTTPS /v1/status URL on your Google Cloud Run service, without credentials or a query.')
origin=f'https://{p.hostname}'
for file in (root/'alarm').glob('*.html'):
    s=file.read_text()
    s=re.sub(r'<meta name="alarm-endpoint" content="[^"]*">',f'<meta name="alarm-endpoint" content="{escape(url,quote=True)}">',s)
    s=re.sub(r"connect-src 'self'[^;]*;",f"connect-src 'self' {origin};",s)
    file.write_text(s)
print('Configured the exact public status endpoint and matching ALARM CSP origin.')
