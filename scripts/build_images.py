"""Reproduce the optimized web images from the original repository photographs.

Runs only during site publication, not during hourly signal checks. The source
archive stays unchanged in Git; the Pages artifact contains optimized copies.
"""
from pathlib import Path
from PIL import Image,ImageOps
import argparse,json
parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parent.parent);args=parser.parse_args()
root=args.root.resolve();images=root/'images';previews=images/'previews';previews.mkdir(parents=True,exist_ok=True)
manifest={};before=after=0;count=0
for p in sorted(images.iterdir()):
    if p.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'):continue
    before+=p.stat().st_size
    with Image.open(p) as original:
        image=ImageOps.exif_transpose(original);image.load();w,h=image.size
        if p.suffix.lower() in ('.jpg','.jpeg'):
            image=image.convert('RGB');image.thumbnail((2000,2000));image.save(p,quality=85,optimize=True,progressive=True)
        if max(w,h)>700 and 'Logo' not in p.name:
            variants={}
            for target in (480,960):
                thumbnail=image.copy();thumbnail.thumbnail((target,target));destination=previews/f'{p.stem}-{target}.webp';thumbnail.save(destination,'WEBP',quality=83,method=5);variants[str(target)]=destination.relative_to(root).as_posix()
            manifest['images/'+p.name]={'width':image.width,'height':image.height,'variants':variants}
    count+=1;after+=p.stat().st_size
(root/'assets').mkdir(exist_ok=True)
(root/'assets/image-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'photographs':count,'input_MB':round(before/1e6,1),'optimized_originals_MB':round(after/1e6,1),'preview_variants':len(manifest)*2}))
