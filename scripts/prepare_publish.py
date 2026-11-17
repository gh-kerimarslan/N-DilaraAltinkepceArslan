"""Stage only public website assets for GitHub Pages; optional raw snapshot URL."""
from pathlib import Path
from html import escape
import argparse,os,re,shutil
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True,type=Path);args=parser.parse_args()
out=args.output.resolve()
if out==root or root.is_relative_to(out):raise SystemExit('Choose a separate staging directory')
if out.exists():raise SystemExit('Staging directory must be new')
out.mkdir(parents=True)
for p in root.glob('*.html'):shutil.copy2(p,out/p.name)
for name in ['assets','images','alarm']:shutil.copytree(root/name,out/name)
for name in ['CNAME','robots.txt','sitemap.xml','.nojekyll','lightbox.js']:
    p=root/name
    if p.exists():shutil.copy2(p,out/name)
repo=os.environ.get('GITHUB_REPOSITORY','')
enabled=os.environ.get('ALARM_HOURLY_ENABLED')=='true'
public=os.environ.get('REPOSITORY_PRIVATE')=='false'
if enabled and public:
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repo):raise SystemExit('Invalid repository')
    endpoint='https://raw.githubusercontent.com/'+repo+'/alarm-data/alarm/data/status.json'
    for p in (out/'alarm').glob('*.html'):
        s=p.read_text();s=re.sub(r'<meta name="alarm-endpoint" content="[^"]*">',f'<meta name="alarm-endpoint" content="{escape(endpoint,quote=True)}">',s)
        s=re.sub(r"connect-src 'self'[^;]*;","connect-src 'self' https://raw.githubusercontent.com;",s)
        p.write_text(s)
print('Prepared website assets. Backend code, private configuration and tests are excluded.')
