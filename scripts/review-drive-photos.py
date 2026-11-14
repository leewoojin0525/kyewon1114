"""Build a source manifest, web copies and visual contact sheet. Never change originals."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageCms
import json, hashlib, io, sys, math

root = Path(__file__).resolve().parents[1] / 'assets/drive-projects' / sys.argv[1]
records = json.loads((root / 'source-files.json').read_text())
(root / 'web').mkdir(exist_ok=True)
sheet = Image.new('RGB', (1200, math.ceil(len(records) / 4) * 230), 'white')
draw = ImageDraw.Draw(sheet)
for number, record in enumerate(records):
    extension = '.png' if record.get('mime_type') == 'image/png' else '.jpg'
    source = root / 'originals' / (record['id'] + extension)
    with Image.open(source) as original:
        photo = ImageOps.exif_transpose(original)
        if photo.info.get('icc_profile'):
            try:
                photo = ImageCms.profileToProfile(photo, ImageCms.ImageCmsProfile(io.BytesIO(photo.info['icc_profile'])), ImageCms.createProfile('sRGB'), outputMode='RGB')
            except (ValueError, OSError):
                photo = photo.convert('RGB')
        else:
            photo = photo.convert('RGB')
        record.update(width=photo.width, height=photo.height, sha256=hashlib.sha256(source.read_bytes()).hexdigest())
        photo.thumbnail((1920, 1920))
        photo.save(root / 'web' / (record['id'] + '.webp'), quality=90)
        thumb = photo.copy()
        thumb.thumbnail((290, 200))
        x, y = (number % 4) * 300, (number // 4) * 230
        sheet.paste(thumb, (x + (300-thumb.width)//2, y))
        draw.text((x+5,y+204), f"{number+1:02d} | {record['width']} x {record['height']}", fill='black')
(root / 'source-files.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
sheet.save(root / 'contact-sheet.jpg',quality=92)
print(json.dumps({'project':sys.argv[1], 'photos':len(records)}))
