"""Compile shared layout fragments; no browser fetch or build framework required."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
for p in root.glob('*.html'):
    if p.name in ('header.html','footer.html'):continue
    s=p.read_text()
    for part in ('header','footer'):
        content=(root/(part+'.html')).read_text()
        s=re.sub(f'<!-- SITE-{part.upper()} -->.*?<!-- /SITE-{part.upper()} -->',lambda m:f'<!-- SITE-{part.upper()} -->'+content+f'<!-- /SITE-{part.upper()} -->',s,flags=re.S)
    p.write_text(s)
print('Shared layout compiled into the existing pages.')
