"""Build a private, offline bilingual text review; never publish from the file."""
import base64
import hashlib
import io
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'output/editorial-20261120'
projects = json.loads((source / 'WOVN-Project-Copy-KO-EN.json').read_text())
studio = json.loads((source / 'WOVN-Studio-Copy-KO-EN.json').read_text())
baseline = json.loads((root / '.data/current-copy-review-baseline.json').read_text())
catalog = json.loads((root / '.data/current-photo-catalog.json').read_text())
project_by_slug = {p['slug']: p for p in projects['projects']}
versions = {p['id']: p['version'] for p in baseline['projects']}
records = []

def field(key, label, language, multiline=True):
    return dict(key=key, label=label, language=language, multiline=multiline)

body_fields = [field('ko', '한글 원고', 'ko'), field('en', '영문 원고', 'en')]
heading_fields = [field('headingKo', '한글 소제목', 'ko', False), field('headingEn', '영문 소제목', 'en', False)]

def add_record(record):
    record['sourceHash'] = hashlib.sha256(json.dumps(record['original'], ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    records.append(record)

for number, group in enumerate(catalog['groups'], 1):
    p = project_by_slug[group['slug']]
    cover = group['photos'][0]
    image = Image.open(cover['output']).convert('RGB')
    image.thumbnail((320, 200))
    buffer = io.BytesIO()
    image.save(buffer, 'JPEG', quality=74)
    add_record(dict(
        id='project:' + p['id'], code=f'P{number:02d}', kind='project', title=p['title'].upper(),
        contentId=p['id'], expectedVersion=versions[p['id']], sourcePath='project.description',
        url='https://kyewon1114.vercel.app/projects/' + p['slug'],
        cover='data:image/jpeg;base64,' + base64.b64encode(buffer.getvalue()).decode(), coverReference=cover['reference'],
        basis=p['basis'], fields=[field('titleEn', '프로젝트 이름 (영문)', 'en', False)] + body_fields,
        original=dict(titleEn=p['title'], ko=p['ko'], en=p['en']),
        sources=[dict(label=' '.join(str(s.get(k) or '') for k in ['publication', 'date', 'issue']).strip(), url=s['url']) for s in p['sources']],
    ))

studio_sources = [dict(label=s['label'], url=s.get('url', '')) for s in studio['sources']]

def add_studio(key, title, original, fields=None, source_path=None):
    n = sum(r['kind'] == 'studio' for r in records) + 1
    add_record(dict(
        id='studio:' + key, code=f'S{n:02d}', kind='studio', title=title,
        contentId=baseline['studio']['id'], expectedVersion=baseline['studio']['version'], sourcePath=source_path or key,
        url='https://kyewon1114.vercel.app/studio', basis='인터뷰·작업 기록을 바탕으로 정리한 원고',
        fields=fields or body_fields, original=original, sources=studio_sources,
    ))

add_studio('motto', '모토', studio['motto'], source_path='studioMotto')
add_studio('intro', '회사 소개', studio['intro'], source_path='studioIntro')
for i, s in enumerate(studio['statements']):
    add_studio(f'philosophy-{i+1}', s['headingKo'],
               {k:s[k] for k in ['headingKo','headingEn','ko','en']}, heading_fields + body_fields, f'studioStatements.{i}')
add_studio('services-intro', 'WHAT WE DO — 소개', studio['servicesIntro'], source_path='studioServicesIntro')
for i, s in enumerate(studio['services']):
    add_studio(f'service-{i+1}', 'WHAT WE DO — ' + s['ko'],
               dict(headingKo=s['ko'],headingEn=s['en'],ko=s['descriptionKo'],en=s['descriptionEn']),
               heading_fields + body_fields, f'studioServices.{i}')
add_studio('process-intro', 'HOW WE WORK — 소개', studio['processIntro'], source_path='studioProcessIntro')
for i, s in enumerate(studio['process']):
    add_studio(f'process-{i+1}', f'HOW WE WORK — {i+1}단계', s, source_path=f'studioProcess.{i}')
add_studio('biography', '대표 이력·학력·수상·전시', studio['biography'], source_path='biography')

project_count = len(projects['projects'])
studio_count = 5 + len(studio['statements']) + len(studio['services']) + len(studio['process'])
assert len(records) == project_count + studio_count
assert len({r['id'] for r in records}) == len(records)
assert all(set(r['original']) == {f['key'] for f in r['fields']} for r in records)
data = dict(schemaVersion=1, edition='2026-11-20', verifiedAt=baseline['checkedAt'], records=records)
serialized = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
document = (root/'scripts/copy-review-template.html').read_text()
document = document.replace('/* REVIEW_CSS */', (root/'scripts/copy-review.css').read_text())
document = document.replace('REVIEW_DATA', serialized)
document = document.replace('/* REVIEW_JS */', (root/'scripts/copy-review.js').read_text())
output = root/'output/review/WOVN-Copy-Review.html'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(document)
print(json.dumps(dict(file=str(output), projects=project_count, studio=studio_count, total=len(records), bytes=output.stat().st_size)))
