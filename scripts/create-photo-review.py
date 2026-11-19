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
cards = []
options = ['<option value="">전체 작품</option>']
for group in groups:
    title, slug, status = (html.escape(group[k], quote=True) for k in ['title', 'slug', 'sourceStatus'])
    options.append(f'<option value="{slug}">{title} ({len(group["photos"])}장)</option>')
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
<header><h1>계원1114 · 프로젝트별 사진 목록표</h1><p>SUMMARY · 2026.11.19 저용량 복원본</p><p>홈페이지 게시 사진과 삭제된 사진을 함께 보관하는 검토 목록입니다. <b style="color:#b13f2c">삭제됨</b> 사진은 홈페이지에 표시되지 않으며, 복원 요청을 선택해 다시 검토할 수 있습니다. 파일번호는 변경하지 않습니다. <b>작품명-번호</b>는 파일 식별번호이며, <b>현재 순서</b>는 홈페이지에 표시되는 순서입니다.<br>삭제·순서 변경을 표시한 뒤 ‘요청서 다운로드’를 눌러 보내주세요. 이 표시는 브라우저에만 저장되며 홈페이지에 자동 반영되지 않습니다.<br>저용량 사진도 함께 등록했습니다. 각 사진의 해상도 구분을 참고해 주세요.</p><p class="note"><span class="high-status">● 고용량 원본·웹용 변환</span> / <span class="low-status">● 저용량 자료·복원/유지</span> / <span class="unknown-status">● 원본 재확인</span></p><details><summary>저용량 사진 포함 작품과 원본 확인 상태</summary><ul>EXCEPTIONS</ul></details><p><a href="https://kyewon1114.vercel.app/projects" target="_blank" rel="noreferrer">홈페이지 프로젝트 보기 ↗</a></p></header>
<nav><select id="project">OPTIONS</select><select id="resolution"><option value="">모든 해상도</option><option value="low">저용량 사진만</option></select><input id="search" type="search" placeholder="사진 번호 또는 작품 검색"><button id="download">요청서 다운로드</button><span id="count"></span></nav><p id="order-message" role="status" aria-live="polite">사진의 ‘앞으로 / 뒤로 / 맨 앞으로’ 버튼으로 순서를 바꾸세요. 컴퓨터에서는 사진을 끌어 이동할 수도 있습니다.</p><main id="grid">CARDS</main>
<script>
const cards=[...document.querySelectorAll('article')],key='wovn-photo-review-rebuilt-20261119';let state={};try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))state=saved}catch{}
const appliedReview=APPLIED_REVIEW;
if(appliedReview){try{if(localStorage.getItem(key+'-applied')!==appliedReview.id){
for(const c of cards)if(appliedReview.projects.includes(c.dataset.project))delete state[c.dataset.ref];
const previousOrder=JSON.parse(localStorage.getItem(key+'-visual-order')||'{}');
for(const slug of appliedReview.projects)delete previousOrder[slug];
localStorage.setItem(key+'-visual-order',JSON.stringify(previousOrder));
localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(key+'-applied',appliedReview.id);
}}catch{}}
function snapshot(){const s={};for(const c of cards){const[o,d]=c.querySelectorAll('input'),n=c.querySelector('textarea');if(o.value||d.checked||n.value)s[c.dataset.ref]={order:o.value,delete:c.dataset.deleted!=='true'&&d.checked,restore:c.dataset.deleted==='true'&&d.checked,note:n.value};c.classList.toggle('deleted',d.checked)}state=s;try{localStorage.setItem(key,JSON.stringify(s))}catch{}}
for(const c of cards){const v=state[c.dataset.ref];if(v){const[o,d]=c.querySelectorAll('input');o.value=v.order||'';d.checked=c.dataset.deleted==='true'?!!v.restore:!!v.delete;c.querySelector('textarea').value=v.note||''}c.addEventListener('input',snapshot)}snapshot();
function filter(){const p=document.querySelector('#project').value,q=document.querySelector('#search').value.trim().toLowerCase(),r=document.querySelector('#resolution').value;let n=0;for(const c of cards){const show=(!r||r===c.dataset.resolution)&&(!p||p===c.dataset.project)&&(!q||(c.dataset.ref+' '+c.dataset.title).toLowerCase().includes(q));c.classList.toggle('hidden',!show);if(show)n++}document.querySelector('#count').textContent=n+' / '+cards.length+'장'}document.querySelector('#project').addEventListener('change',filter);document.querySelector('#search').addEventListener('input',filter);document.querySelector('#resolution').addEventListener('change',filter);filter();
document.querySelector('#download').addEventListener('click',()=>{snapshot();const lines=['WOVN · 계원1114 사진 변경 요청','사진 목록: 2026.11.19 저용량 복원본 / '+cards.length+'장',''];for(const c of document.querySelectorAll('#grid article')){const s=state[c.dataset.ref];if(!s)continue;lines.push(c.dataset.title+' / '+c.dataset.ref+' ('+(c.dataset.deleted==='true'?'삭제됨 · 삭제 전 순서 ':'현재 순서 ')+c.dataset.order+')');if(s.delete||s.restore)lines.push(c.dataset.deleted==='true'?'복원 요청':'삭제 요청');if(s.order)lines.push('변경 순서: '+s.order);if(s.note)lines.push(s.note);lines.push('')}if(lines.length===3)lines.push('새 요청 표시가 없습니다.');const u=URL.createObjectURL(new Blob(['\\uFEFF'+lines.join('\\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='WOVN-사진변경요청.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
</script></html>'''
document=document.replace('APPLIED_REVIEW', json.dumps(plan.get('appliedReview'), ensure_ascii=False))
document=document.replace('</script>', (root/'scripts/photo-review-order.js').read_text() + '\n</script>')
document=document.replace('SUMMARY',f'{len(groups)}개 작품 · 게시 {active_count}장 / 삭제됨 {deleted_count}장 · 검토 총 {len(cards)}장').replace('EXCEPTIONS',exceptions).replace('OPTIONS',''.join(options)).replace('CARDS',''.join(cards))
output=root/'output/review/WOVN-Photo-Review-20261118.html';output.parent.mkdir(parents=True,exist_ok=True);output.write_text(document)
print(json.dumps({'file':str(output),'projects':len(groups),'photos':len(cards),'bytes':output.stat().st_size}))
