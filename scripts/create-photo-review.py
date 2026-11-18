import base64, html, io, json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
plan = json.loads((root / '.data/full-library-20261118/plan.json').read_text())
cards = []
options = ['<option value="">전체 작품</option>']
for project in plan['projects']:
    title = html.escape(project['title'])
    options.append(f'<option value="{project["slug"]}">{title} ({len(project["photos"])})</option>')
    for p in sorted((p for p in plan['photos'] if p['projectId'] == project['id']), key=lambda p:p['order']):
        im = Image.open(p['output']).convert('RGB'); im.thumbnail((400, 320))
        b = io.BytesIO(); im.save(b, 'JPEG', quality=70)
        src = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
        notes = ('대표사진 · ' if p['placement'] == 'cover' else '') + ('기존 등록 사진' if p.get('retainedExisting') else 'Drive 웹용 사진')
        if p.get('upgradedFrom'): notes += ' · 해상도 개선'
        if p['label'] in ['Marina', 'Elbon']: notes += ' · CG'
        ref = html.escape(p['reference'])
        cards.append(f'''<article data-project="{project['slug']}" data-ref="{ref}" data-title="{title}" data-original="{p['order']}">
<img loading="lazy" src="{src}" alt="{ref}"><div class="meta"><h2>{ref}</h2><p>{title}</p><p class="note">현재 {p['order']:03d} · {notes}</p><p class="note">{p['width']} × {p['height']} · {p['bytes']/1000:.0f} KB</p>
<label>변경 순서 <input type="number" min="1" max="999" aria-label="{ref} 변경 순서"></label>
<label><input type="checkbox"> 삭제 요청</label><textarea rows="2" placeholder="대표사진으로 변경 등 메모" aria-label="{ref} 메모"></textarea></div></article>''')
document = r'''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WOVN · 프로젝트 사진 목록표</title>
<style>*{box-sizing:border-box}body{margin:0;background:#faf9f6;color:#272727;font:14px -apple-system,BlinkMacSystemFont,sans-serif}header{padding:28px 4vw;background:#fff;border-bottom:1px solid #ddd}h1{font-size:24px;font-weight:500;margin:0 0 14px}p{line-height:1.6}nav{position:sticky;top:0;z-index:2;background:#faf9f6ee;padding:14px 4vw;display:flex;gap:10px;flex-wrap:wrap;backdrop-filter:blur(12px)}input,select,button,textarea{font:inherit;padding:9px;border:1px solid #ccc;border-radius:3px;background:#fff}button{cursor:pointer}#grid{padding:12px 4vw 50px;display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:20px}article{background:#fff;border:1px solid #e2e2df}article.hidden{display:none}article.deleted{border:2px solid #b13f2c}article>img{width:100%;height:210px;object-fit:contain;display:block;background:#f1f0ed}.meta{padding:16px}h2{font-size:16px;font-weight:550;margin:0 0 8px}.meta p{margin:4px 0}.note{font-size:11px;color:#707070}label{display:inline-block;font-size:12px;margin:12px 5px 8px 0}input[type=number]{width:65px;padding:6px}textarea{width:100%;font-size:12px}#count{align-self:center;font-size:12px}a{color:inherit}</style>
<header><h1>WOVN · 프로젝트 사진 목록표</h1><p>25개 작품 · 908장 · 2026.11.18<br>Drive 웹용 727장과 기존 등록 사진 181장입니다. 동일한 컷인지 불확실한 사진도 비교할 수 있도록 남겼습니다.</p><p>고정 사진 번호로 삭제·순서 변경을 요청하세요. 아래에 표시한 뒤 <b>요청서 다운로드</b>를 누르면 텍스트 파일로 저장됩니다.<br>이 표시는 현재 브라우저에만 저장되며, 홈페이지에는 자동 반영되지 않습니다.</p><a href="https://kyewon1114.vercel.app/projects" target="_blank" rel="noreferrer">계원1114 프로젝트 보기 ↗</a></header>
<nav><select id="project">OPTIONS</select><input id="search" type="search" placeholder="사진 번호 또는 작품 검색"><button id="download">요청서 다운로드</button><span id="count"></span></nav><main id="grid">CARDS</main>
<script>
const cards=[...document.querySelectorAll('article')], key='wovn-photo-review-20261118';let state={};try{state=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
function snapshot(){const s={};for(const c of cards){const [order,del]=c.querySelectorAll('input'),note=c.querySelector('textarea');if(order.value||del.checked||note.value)s[c.dataset.ref]={order:order.value,delete:del.checked,note:note.value};c.classList.toggle('deleted',del.checked)}state=s;try{localStorage.setItem(key,JSON.stringify(s))}catch{}}
for(const c of cards){const v=state[c.dataset.ref];if(v){const [o,d]=c.querySelectorAll('input');o.value=v.order||'';d.checked=!!v.delete;c.querySelector('textarea').value=v.note||''}c.addEventListener('input',snapshot)}snapshot();
function filter(){const p=document.querySelector('#project').value,q=document.querySelector('#search').value.trim().toLowerCase();let n=0;for(const c of cards){const show=(!p||p===c.dataset.project)&&(!q||(c.dataset.ref+' '+c.dataset.title).toLowerCase().includes(q));c.classList.toggle('hidden',!show);if(show)n++}document.querySelector('#count').textContent=n+' / 908장'}document.querySelector('#project').addEventListener('change',filter);document.querySelector('#search').addEventListener('input',filter);filter();
document.querySelector('#download').addEventListener('click',()=>{snapshot();const lines=['WOVN · 계원1114 사진 변경 요청','기준 목록: 2026.11.18 / 908장',''];for(const c of cards){const s=state[c.dataset.ref];if(!s)continue;lines.push(c.dataset.title+' / '+c.dataset.ref+' (현재 '+c.dataset.original+')');if(s.delete)lines.push('삭제 요청');if(s.order)lines.push('변경 순서: '+s.order);if(s.note)lines.push(s.note);lines.push('')}if(lines.length===3)lines.push('아직 요청 표시가 없습니다.');const u=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='WOVN-사진변경요청.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
</script></html>'''
document = document.replace('OPTIONS', ''.join(options)).replace('CARDS', ''.join(cards))
output = root / 'output/review/WOVN-Photo-Review-20261118.html'; output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(document)
assert len(cards) == 908
print(json.dumps({'file':str(output),'photos':len(cards),'bytes':output.stat().st_size}))
