"""Dependency-free integrity checks; run: python3 scripts/check_site.py."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import json,re,sys

root=Path(__file__).resolve().parent.parent
errors=[]
class Page(HTMLParser):
    def __init__(self,path):
        super().__init__();self.path=path;self.ids=set();self.local=[];self.canonical=0;self.csp=0
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if d.get('id'):
            if d['id'] in self.ids:errors.append(f'{self.path.name}: duplicate ID {d["id"]}')
            self.ids.add(d['id'])
        if tag=='link' and d.get('rel')=='canonical':self.canonical+=1
        if tag=='meta' and d.get('http-equiv','').lower()=='content-security-policy':self.csp+=1
        if tag=='script' and 'src' not in d and d.get('type')!='application/ld+json':errors.append(f'{self.path.name}: inline executable script')
        if any(k.startswith('on') for k in d):errors.append(f'{self.path.name}: inline event handler')
        if tag=='a' and d.get('target')=='_blank' and 'noopener' not in d.get('rel',''):errors.append(f'{self.path.name}: unsafe new-window link')
        if tag=='img' and 'alt' not in d:errors.append(f'{self.path.name}: image missing alt')
        for attr in ('src','href'):
            url=d.get(attr,'');u=urlsplit(url)
            if u.scheme=='javascript':errors.append(f'{self.path.name}: javascript URL')
            if not url or u.scheme or u.netloc:continue
            if self.path.name=='404.html' and u.path:target=root/unquote(u.path.lstrip('/'))
            else:target=(self.path.parent/unquote(u.path)) if u.path else self.path
            if u.path and not target.exists():errors.append(f'{self.path.relative_to(root)}: missing {url}')
            if not u.path and u.fragment:self.local.append(unquote(u.fragment))

pages=[p for p in root.rglob('*.html') if 'backend' not in p.parts and p.name not in ('header.html','footer.html')]
for p in pages:
    s=p.read_text();parsed=Page(p);parsed.feed(s)
    if '</html>' not in s.lower():errors.append(f'{p.name}: incomplete HTML')
    if parsed.csp!=1:errors.append(f'{p.name}: expected one CSP')
    if parsed.canonical!=1:errors.append(f'{p.name}: expected one canonical URL')
    for fragment in parsed.local:
        if fragment not in parsed.ids:errors.append(f'{p.name}: missing #{fragment}')
    for m in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',s,re.S):
        try:json.loads(m.group(1))
        except ValueError:errors.append(f'{p.name}: invalid JSON-LD')
for p in (root/'assets').rglob('*.css'):
    for url in re.findall(r'url\([\'"]?([^\)\'\"]+)',p.read_text()):
        if urlsplit(url).scheme:continue
        if not (p.parent/unquote(url)).exists():errors.append(f'{p.relative_to(root)}: missing CSS resource {url}')
if errors:
    print('\n'.join(errors));sys.exit(1)
print(f'PASS: {len(pages)} HTML pages; local links, assets, fonts, CSP, metadata and image labels.')
