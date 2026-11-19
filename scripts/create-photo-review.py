import base64, html, io, json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from PIL import Image

root = Path(__file__).resolve().parents[1]
plan = json.loads((root / '.data/full-library-20261118/plan.json').read_text())
state_file = root / '.data/photo-review-publication-state.json'
publication = json.loads(state_file.read_text()) if state_file.exists() else {}
overrides = publication.get('projectOverrides', {})
splits = publication.get('splits', [])
excluded = set(publication.get('excludedReferences', []))
references = {p['reference'] for p in plan['photos']}
assert excluded <= references, 'Excluded photo reference does not exist in the original catalog'
assert len(references) == len(plan['photos']), 'Duplicate fixed photo references'
source_slugs = {p['slug'] for p in plan['projects']}
assert set(overrides) <= source_slugs
assert all(s['fromSlug'] in source_slugs for s in splits)
groups = []
for project in plan['projects']:
    photos = sorted((p for p in plan['photos'] if p['projectId'] == project['id']), key=lambda p:p['order'])
    project_splits = [s for s in splits if s['fromSlug'] == project['slug']]
    labels = [s['label'] for s in project_splits]
    assert len(labels) == len(set(labels)), 'A photo group cannot be split twice'
    override = overrides.get(project['slug'], {})
    groups.append({
        'slug': project['slug'], 'title': override.get('title', project['title']),
        'photos': [p for p in photos if p['label'] not in labels],
        'heroReference': override.get('heroReference') or next((p['reference'] for p in photos if p['placement'] == 'cover'), None),
    })
    for split in project_splits:
        selected = [p for p in photos if p['label'] == split['label']]
        included = [p for p in selected if p['reference'] not in excluded]
        assert included, 'Split project has no included photographs'
        groups.append({'slug': split['slug'], 'title': split['title'], 'photos': selected,
                       'heroReference': split.get('heroReference', included[0]['reference'])})
assert len({g['slug'] for g in groups}) == len(groups), 'Duplicate review project slug'
assert {p['reference'] for g in groups for p in g['photos']} == references
assert sum(len(g['photos']) for g in groups) == len(plan['photos'])

cards = []
options = ['<option value="">전체 작품</option>']
for group in groups:
    title = html.escape(group['title'])
    slug = html.escape(group['slug'], quote=True)
    excluded_count = sum(p['reference'] in excluded for p in group['photos'])
    count_text = f'{len(group["photos"])}장' + (f' · 제외 {excluded_count}장' if excluded_count else '')
    options.append(f'<option value="{slug}">{title} ({count_text})</option>')
    for p in group['photos']:
        im = Image.open(p['output']).convert('RGB'); im.thumbnail((400, 320))
        b = io.BytesIO(); im.save(b, 'JPEG', quality=70)
        src = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
        is_excluded = p['reference'] in excluded
        notes = ('대표사진 · ' if p['reference'] == group['heroReference'] and not is_excluded else '') + ('기존 등록 사진' if p.get('retainedExisting') else 'Drive 웹용 사진')
        if p.get('upgradedFrom'): notes += ' · 해상도 개선'
        if p['label'] in ['Marina', 'Elbon']: notes += ' · CG'
        ref = html.escape(p['reference'])
        disabled = ' disabled' if is_excluded else ''
        badge = '<p class="excluded-label">홈페이지에서 제외됨</p>' if is_excluded else ''
        cards.append(f'''<article class="{'excluded' if is_excluded else ''}" data-project="{slug}" data-ref="{ref}" data-title="{title}" data-original="{p['order']}" data-excluded="{'true' if is_excluded else 'false'}">
<img loading="lazy" src="{src}" alt="{ref}"><div class="meta"><h2>{ref}</h2><p>{title}</p>{badge}<p class="note">기준 순서 {p['order']:03d} · {notes}</p><p class="note">{p['width']} × {p['height']} · {p['bytes']/1000:.0f} KB</p>
<label>변경 순서 <input type="number" min="1" max="999" aria-label="{ref} 변경 순서"{disabled}></label>
<label><input type="checkbox"{disabled}> 삭제 요청</label><textarea rows="2" placeholder="대표사진으로 변경 등 메모" aria-label="{ref} 메모"{disabled}></textarea></div></article>''')

total = len(plan['photos'])
active = total - len(excluded)
updated_note = ''
if publication.get('updatedAt'):
    updated = datetime.fromisoformat(publication['updatedAt'].replace('Z', '+00:00')).astimezone(ZoneInfo('Asia/Seoul')).strftime('%Y.%m.%d')
    updated_note = f' · 공개 반영 {updated}'
summary = f'{len(groups)}개 작품 · 기준 사진 {total}장 · 홈페이지 사진 {active}장'
if excluded: summary += f' · 제외 {len(excluded)}장'
summary += f'<br>기준 목록 2026.11.18{updated_note}'
exclusion_note = ('<br>이미 제외된 사진도 번호 확인을 위해 남겼습니다. 해당 사진의 추가 요청은 잠겨 있으며, 기존에 적은 메모는 보존됩니다.' if excluded else '')
document = r'''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WOVN · 프로젝트 사진 목록표</title>
<style>*{box-sizing:border-box}body{margin:0;background:#faf9f6;color:#272727;font:14px -apple-system,BlinkMacSystemFont,sans-serif}header{padding:28px 4vw;background:#fff;border-bottom:1px solid #ddd}h1{font-size:24px;font-weight:500;margin:0 0 14px}p{line-height:1.6}nav{position:sticky;top:0;z-index:2;background:#faf9f6ee;padding:14px 4vw;display:flex;gap:10px;flex-wrap:wrap;backdrop-filter:blur(12px)}input,select,button,textarea{font:inherit;padding:9px;border:1px solid #ccc;border-radius:3px;background:#fff}button{cursor:pointer}#grid{padding:12px 4vw 50px;display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:20px}article{background:#fff;border:1px solid #e2e2df}article.hidden{display:none}article.deleted{border:2px solid #b13f2c}article.excluded{border:1px dashed #b6aaa0;background:#f7f4ef}.excluded-label{display:inline-block;padding:4px 7px;background:#e9e1d7;color:#654c39;font-size:12px;font-weight:600}article>img{width:100%;height:210px;object-fit:contain;display:block;background:#f1f0ed}.meta{padding:16px}h2{font-size:16px;font-weight:550;margin:0 0 8px}.meta p{margin:4px 0}.note{font-size:11px;color:#707070}label{display:inline-block;font-size:12px;margin:12px 5px 8px 0}input[type=number]{width:65px;padding:6px}textarea{width:100%;font-size:12px}input:disabled,textarea:disabled{color:#777;background:#eeebe7}#count{align-self:center;font-size:12px}a{color:inherit}</style>
<header><h1>WOVN · 프로젝트 사진 목록표</h1><p>SUMMARY<br>Drive 웹용 727장과 기존 등록 사진 181장의 기준 목록입니다. 동일한 컷인지 불확실한 사진도 비교할 수 있도록 남겼습니다.</p><p><b>사진의 고정 번호는 바뀌지 않습니다.</b> ‘기준 순서’는 원래 목록에서의 위치이며, 프로젝트 분리·사진 제외 후 홈페이지의 현재 순서와는 다를 수 있습니다.<br>고정 사진 번호로 삭제·순서 변경을 요청하세요. 아래에 표시한 뒤 <b>요청서 다운로드</b>를 누르면 텍스트 파일로 저장됩니다.<br>이 표시는 현재 브라우저에만 저장되며, 홈페이지에는 자동 반영되지 않습니다.EXCLUSION_NOTE</p><a href="https://kyewon1114.vercel.app/projects" target="_blank" rel="noreferrer">계원1114 프로젝트 보기 ↗</a></header>
<nav><select id="project">OPTIONS</select><input id="search" type="search" placeholder="사진 번호 또는 작품 검색"><button id="download">요청서 다운로드</button><span id="count"></span></nav><main id="grid">CARDS</main>
<script>
const cards=[...document.querySelectorAll('article')], key='wovn-photo-review-20261118';let state={};try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))state=saved}catch{}
function snapshot(){const s={...state};for(const c of cards){const [order,del]=c.querySelectorAll('input'),note=c.querySelector('textarea');if(c.dataset.excluded==='true'){c.classList.remove('deleted');continue}if(order.value||del.checked||note.value)s[c.dataset.ref]={order:order.value,delete:del.checked,note:note.value};else delete s[c.dataset.ref];c.classList.toggle('deleted',del.checked)}state=s;try{localStorage.setItem(key,JSON.stringify(s))}catch{}}
for(const c of cards){const v=state[c.dataset.ref];if(v){const [o,d]=c.querySelectorAll('input');o.value=v.order||'';d.checked=!!v.delete;c.querySelector('textarea').value=v.note||''}c.addEventListener('input',snapshot)}snapshot();
function filter(){const p=document.querySelector('#project').value,q=document.querySelector('#search').value.trim().toLowerCase();let n=0;for(const c of cards){const show=(!p||p===c.dataset.project)&&(!q||(c.dataset.ref+' '+c.dataset.title).toLowerCase().includes(q));c.classList.toggle('hidden',!show);if(show)n++}document.querySelector('#count').textContent=n+' / '+cards.length+'장'}document.querySelector('#project').addEventListener('change',filter);document.querySelector('#search').addEventListener('input',filter);filter();
document.querySelector('#download').addEventListener('click',()=>{snapshot();const lines=['WOVN · 계원1114 사진 변경 요청','기준 목록: 2026.11.18 / '+cards.length+'장 (기준 순서는 원래 목록의 위치)',''];for(const c of cards){const s=state[c.dataset.ref];if(!s||c.dataset.excluded==='true')continue;lines.push(c.dataset.title+' / '+c.dataset.ref+' (기준 순서 '+c.dataset.original+')');if(s.delete)lines.push('삭제 요청');if(s.order)lines.push('변경 순서: '+s.order);if(s.note)lines.push(s.note);lines.push('')}if(lines.length===3)lines.push('새 요청 표시가 없습니다. 이미 홈페이지에서 제외된 사진은 추가 요청서에 포함하지 않습니다.');const u=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='WOVN-사진변경요청.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
</script></html>'''
document = document.replace('SUMMARY', summary).replace('EXCLUSION_NOTE', exclusion_note).replace('OPTIONS', ''.join(options)).replace('CARDS', ''.join(cards))
output = root / 'output/review/WOVN-Photo-Review-20261118.html'; output.parent.mkdir(parents=True,exist_ok=True)
assert len(cards) == total
output.write_text(document)
print(json.dumps({'file':str(output),'projects':len(groups),'photos':len(cards),'included':active,'excluded':len(excluded),'bytes':output.stat().st_size}))
