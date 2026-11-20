"""Render active photos and retained review history; never republish deleted photos."""
import base64, html, io, json
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
plan = json.loads((root / '.data/current-photo-catalog.json').read_text())
groups = plan['groups']
active_count = sum(len(g['photos']) for g in groups)
history_path = root / '.data/photo-review-history.json'
history = json.loads(history_path.read_text()) if history_path.exists() else {}
active_refs = {p['reference'] for g in groups for p in g['photos']}
for group in groups:
    group['heroReference'] = group['photos'][0]['reference'] if group['photos'] else ''
    for p in group['photos']:
        history[p['reference']] = dict(p, slug=group['slug'], title=group['title'])
history_path.write_text(json.dumps(history, ensure_ascii=False, indent=2))
for group in groups:
    group['photos'] = group['photos'] + [dict(p, deleted=True) for ref, p in history.items() if ref not in active_refs and p['slug'] == group['slug']]
deleted_count = sum(bool(p.get('deleted')) for g in groups for p in g['photos'])
assert len({p['reference'] for g in groups for p in g['photos']}) == sum(len(g['photos']) for g in groups)
home_path = root / '.data/current-home-selection.json'
home_selection = json.loads(home_path.read_text()) if home_path.exists() else {'slides': []}
home_refs = [slide['reference'] for slide in home_selection['slides']]
assert len(home_refs) <= 8 and len(set(home_refs)) == len(home_refs)
assert all(ref in active_refs for ref in home_refs), 'Refresh the published homepage selection before building the review list'
cards = []
options = ['<option value="">전체 작품</option>']
for group in groups:
    title, slug, status = (html.escape(group[k], quote=True) for k in ['title', 'slug', 'sourceStatus'])
    published = sum(not p.get('deleted') for p in group['photos'])
    removed = len(group['photos']) - published
    options.append(f'<option value="{slug}">{title} (게시 {published}장 · 삭제 {removed}장)</option>')
    for p in group['photos']:
        im = Image.open(p['output']).convert('RGB'); im.thumbnail((400,320))
        b = io.BytesIO(); im.save(b,'JPEG',quality=70)
        src = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
        ref = html.escape(p['reference'])
        photo_status = html.escape(p.get('sourceStatus', group['sourceStatus']))
        resolution = 'low' if p.get('lowResolution') else 'other'
        status_class = 'low-status' if p.get('lowResolution') else 'unknown-status' if '재확인' in p.get('sourceStatus','') else 'high-status'
        cover = ' · 대표사진' if p['reference']==group['heroReference'] else ''
        deleted = p.get('deleted', False)
        order_label = f"삭제 전 순서 {p['order']:03d}" if deleted else f"현재 순서 {p['order']:03d}{cover}"
        badge = '<p class="removed-status">삭제됨 · 홈페이지 미게시</p>' if deleted else ''
        action = '복원 요청' if deleted else '삭제 요청'
        cards.append(f'''<article data-deleted="{str(deleted).lower()}" data-project="{slug}" data-ref="{ref}" data-title="{title}" data-order="{p['order']}" data-resolution="{resolution}"><img loading="lazy" src="{src}" alt="{ref}"><div class="meta"><h2>{ref}</h2><p>{title}</p><p class="note">{order_label}</p>{badge}<p class="note status {status_class}">{photo_status}</p><p class="note">{p['width']} × {p['height']} · {p['bytes']/1000:.0f} KB</p><label>변경 순서 <input type="number" min="1" aria-label="{ref} 변경 순서"></label><label><input type="checkbox"> {action}</label><textarea rows="2" placeholder="대표사진 변경 등 메모" aria-label="{ref} 메모"></textarea></div></article>''')
exceptions = ''.join(f'<li>{html.escape(g["title"])} — {html.escape(g["sourceStatus"])}</li>' for g in groups if g.get('lowCount') or '유지' in g['sourceStatus'])
document = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>계원1114 · 현재 사진 목록표</title>
<style>*{box-sizing:border-box}body{margin:0;background:#faf9f6;color:#272727;font:14px -apple-system,BlinkMacSystemFont,sans-serif}header{padding:28px 4vw;background:white}h1{font-size:24px;font-weight:500}p,li{line-height:1.6}nav{position:sticky;top:0;z-index:2;background:#faf9f6f5;padding:14px 4vw;display:flex;gap:10px;flex-wrap:wrap}input,select,button,textarea{font:inherit;padding:9px;border:1px solid #ccc;border-radius:3px;background:white}button{cursor:pointer}#grid{padding:12px 4vw 50px;display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:20px}article{background:white;border:1px solid #ddd}article.hidden{display:none}article[data-deleted="true"]{border:2px solid #b13f2c}.removed-status{color:#b13f2c;font-weight:700}article.deleted{outline:2px solid #b13f2c}article>img{width:100%;height:210px;object-fit:contain;background:#f1f0ed}.meta{padding:16px}h2{font-size:16px;font-weight:550;margin:0 0 8px}.meta p{margin:4px 0}.note{font-size:11px;color:#707070}.status{font-weight:600}.high-status{color:#237248!important}.low-status{color:#a95512!important}.unknown-status{color:#7751a8!important}label{display:inline-block;font-size:12px;margin:12px 5px 8px 0}input[type=number]{width:65px;padding:6px}textarea{width:100%;font-size:12px}#count{align-self:center;font-size:12px}a{color:inherit}.order-controls{margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #ddd}.edit-position{display:block;color:#237248;margin-bottom:8px}.order-controls button{padding:10px 7px;margin:2px;font-size:12px;min-height:44px}.order-controls small{display:block;color:#777;margin-top:8px}button:disabled{opacity:.35;cursor:default}article.dragging{opacity:.4}article.drop-target{outline:3px solid #237248}#order-message{margin:10px 4vw;color:#237248}article img[draggable=true]{cursor:grab}</style>
<header><h1>계원1114 · 프로젝트별 사진 목록표</h1><p>SUMMARY</p><p>홈페이지 게시 사진과 삭제된 사진을 함께 보관하는 검토 목록입니다. <b style="color:#b13f2c">삭제됨</b> 사진은 홈페이지에 표시되지 않으며, 복원 요청을 선택해 다시 검토할 수 있습니다. 삭제 사진은 ‘복원 요청’을 직접 체크해야 순서를 입력하고 복원을 요청할 수 있습니다. 파일번호는 변경하지 않습니다. <b>작품명-번호</b>는 파일 식별번호이며, <b>현재 순서</b>는 홈페이지에 표시되는 순서입니다.<br>메인 사진 선택·삭제·순서 변경을 표시한 뒤 ‘요청서 다운로드’를 눌러 보내주세요. 이 표시는 현재 브라우저에만 저장되며 홈페이지에 자동 반영되지 않습니다.<br>저용량 사진도 함께 등록했습니다. 각 사진의 해상도 구분을 참고해 주세요.</p><p class="note"><span class="high-status">● 고용량 원본·웹용 변환</span> / <span class="low-status">● 저용량 자료·복원/유지</span> / <span class="unknown-status">● 원본 재확인</span></p><details><summary>저용량 사진 포함 작품과 원본 확인 상태</summary><ul>EXCEPTIONS</ul></details><p><a href="https://kyewon1114.vercel.app/projects" target="_blank" rel="noreferrer">홈페이지 프로젝트 보기 ↗</a></p></header>
<section id="home-selection" aria-labelledby="home-heading"><div class="home-heading-row"><h2 id="home-heading">메인페이지 사진 고르기</h2><strong id="home-count"></strong></div><p>아래 사진 카드의 <b>메인 선택</b>을 눌러 최대 8장을 고르세요. 여기서 정한 순서대로 메인페이지 사진이 전환됩니다. 프로젝트 안의 사진 순서는 바뀌지 않습니다.</p><ol id="home-list" aria-label="메인페이지 사진 선택 순서"></ol><p id="home-empty" hidden>아직 선택한 사진이 없습니다. 아래 프로젝트 사진에서 ‘메인 선택’을 눌러주세요.</p><div class="home-actions"><button type="button" id="show-home-only">선택한 사진만 보기</button><button type="button" id="home-reset">현재 메인으로 되돌리기</button><button type="button" id="home-clear">선택 비우기</button><button type="button" id="home-download">요청서 다운로드</button></div><p id="home-message" role="status" aria-live="polite"></p></section>
<nav aria-label="사진 목록 검색"><select id="project" aria-label="프로젝트">OPTIONS</select><select id="resolution" aria-label="해상도"><option value="">모든 해상도</option><option value="low">저용량 사진만</option></select><select id="usage" aria-label="사진 표시"><option value="">모든 사진</option><option value="home">메인 선택 사진만</option></select><input id="search" type="search" aria-label="사진 번호 또는 작품 검색" placeholder="사진 번호 또는 작품 검색"><button id="download">요청서 다운로드</button><a class="home-jump" href="#home-selection">메인 선택 보기 ↑</a><span id="count"></span></nav><p id="order-message" role="status" aria-live="polite">사진의 ‘앞으로 / 뒤로 / 맨 앞으로’ 버튼으로 프로젝트 안의 순서를 바꾸세요. 컴퓨터에서는 사진을 끌어 이동할 수도 있습니다.</p><main id="grid">CARDS</main>
<script>
PHOTO_REVIEW_REQUEST_HELPERS
const homeReviewBaseline=HOME_REVIEW_BASELINE;
const cards=[...document.querySelectorAll('article')],key='wovn-photo-review-rebuilt-20261119';let state={};try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))state=saved}catch{}
try{if(!localStorage.getItem(key+'-before-explicit-restoration-fix'))localStorage.setItem(key+'-before-explicit-restoration-fix',JSON.stringify(state))}catch{}
const appliedReview=APPLIED_REVIEW;
if(appliedReview){try{if(localStorage.getItem(key+'-applied')!==appliedReview.id){
for(const c of cards)if(appliedReview.projects.includes(c.dataset.project))delete state[c.dataset.ref];
const previousOrder=JSON.parse(localStorage.getItem(key+'-visual-order')||'{}');
for(const slug of appliedReview.projects)delete previousOrder[slug];
localStorage.setItem(key+'-visual-order',JSON.stringify(previousOrder));
localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(key+'-applied',appliedReview.id);
}}catch{}}
function snapshot(){const s={};for(const c of cards){const[o,d]=c.querySelectorAll('input'),n=c.querySelector('textarea'),deleted=c.dataset.deleted==='true';o.disabled=deleted&&!d.checked;if(o.disabled)o.value='';const v=photoReviewRequestTools.normalize(deleted,{order:o.value,delete:!deleted&&d.checked,restore:deleted&&d.checked,note:n.value});if(v.order||v.delete||v.restore||v.note)s[c.dataset.ref]=v;c.classList.toggle('deleted',d.checked)}state=s;try{localStorage.setItem(key,JSON.stringify(s))}catch{}}
for(const c of cards){const v=state[c.dataset.ref];if(v){const[o,d]=c.querySelectorAll('input');o.value=v.order||'';d.checked=c.dataset.deleted==='true'?v.restore===true:v.delete===true;c.querySelector('textarea').value=v.note||''}c.addEventListener('input',snapshot)}snapshot();
function filter(){const p=document.querySelector('#project').value,q=document.querySelector('#search').value.trim().toLowerCase(),r=document.querySelector('#resolution').value,u=document.querySelector('#usage').value;let n=0;for(const c of cards){const show=(!u||c.dataset.homeSelected==='true')&&(!r||r===c.dataset.resolution)&&(!p||p===c.dataset.project)&&(!q||(c.dataset.ref+' '+c.dataset.title).toLowerCase().includes(q));c.classList.toggle('hidden',!show);if(show)n++}document.querySelector('#count').textContent=n+' / '+cards.length+'장'}document.querySelector('#project').addEventListener('change',filter);document.querySelector('#search').addEventListener('input',filter);document.querySelector('#resolution').addEventListener('change',filter);document.querySelector('#usage').addEventListener('change',filter);filter();
document.querySelector('#download').addEventListener('click',()=>{snapshot();const lines=['WOVN · 계원1114 사진 변경 요청','사진 목록: '+cards.length+'장',''];if(!homeReview.appendRequest(lines))return;for(const c of document.querySelectorAll('#grid article')){const s=state[c.dataset.ref];if(!s)continue;lines.push(...photoReviewRequestTools.entry(c.dataset,s))}const u=URL.createObjectURL(new Blob(['\\uFEFF'+lines.join('\\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='WOVN-사진변경요청.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
</script></html>'''
document=document.replace('PHOTO_REVIEW_REQUEST_HELPERS', (root/'scripts/photo-review-request.js').read_text())
document=document.replace('HOME_REVIEW_BASELINE', json.dumps({'references': home_refs, 'settingsVersion': home_selection.get('settingsVersion'), 'capturedAt': home_selection.get('capturedAt')}, ensure_ascii=False).replace('</', '<\\/'))
document=document.replace('APPLIED_REVIEW', json.dumps(plan.get('appliedReview'), ensure_ascii=False))
document=document.replace('</style>', (root/'scripts/photo-review-home.css').read_text() + '\n</style>', 1)
document=document.replace('</script>', (root/'scripts/photo-review-order.js').read_text() + '\n' + (root/'scripts/photo-review-home.js').read_text() + '\n</script>')
document=document.replace('SUMMARY',f'{len(groups)}개 작품 · 게시 {active_count}장 / 삭제됨 {deleted_count}장 · 검토 총 {len(cards)}장').replace('EXCEPTIONS',exceptions).replace('OPTIONS',''.join(options)).replace('CARDS',''.join(cards))
output=root/'output/review/WOVN-Photo-Review-20261118.html';output.parent.mkdir(parents=True,exist_ok=True);output.write_text(document)
print(json.dumps({'file':str(output),'projects':len(groups),'photos':len(cards),'bytes':output.stat().st_size}))
