"""Render the current publication catalog; historical photo sets are never merged in."""
import base64, html, io, json
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
plan = json.loads((root / '.data/current-photo-catalog.json').read_text())
groups = plan['groups']
excluded = set()
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
        cover = ' · 대표사진' if p['reference']==group['heroReference'] else ''
        cards.append(f'''<article data-project="{slug}" data-ref="{ref}" data-title="{title}" data-order="{p['order']}"><img loading="lazy" src="{src}" alt="{ref}"><div class="meta"><h2>{ref}</h2><p>{title}</p><p class="note">현재 순서 {p['order']:03d}{cover}</p><p class="note">{status}</p><p class="note">{p['width']} × {p['height']} · {p['bytes']/1000:.0f} KB</p><label>변경 순서 <input type="number" min="1" aria-label="{ref} 변경 순서"></label><label><input type="checkbox"> 삭제 요청</label><textarea rows="2" placeholder="대표사진 변경 등 메모" aria-label="{ref} 메모"></textarea></div></article>''')
exceptions = ''.join(f'<li>{html.escape(g["title"])} — {html.escape(g["sourceStatus"])}</li>' for g in groups if '유지' in g['sourceStatus'])
document = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>계원1114 · 현재 사진 목록표</title>
<style>*{box-sizing:border-box}body{margin:0;background:#faf9f6;color:#272727;font:14px -apple-system,BlinkMacSystemFont,sans-serif}header{padding:28px 4vw;background:white}h1{font-size:24px;font-weight:500}p,li{line-height:1.6}nav{position:sticky;top:0;z-index:2;background:#faf9f6f5;padding:14px 4vw;display:flex;gap:10px;flex-wrap:wrap}input,select,button,textarea{font:inherit;padding:9px;border:1px solid #ccc;border-radius:3px;background:white}button{cursor:pointer}#grid{padding:12px 4vw 50px;display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:20px}article{background:white;border:1px solid #ddd}article.hidden{display:none}article.deleted{outline:2px solid #b13f2c}article>img{width:100%;height:210px;object-fit:contain;background:#f1f0ed}.meta{padding:16px}h2{font-size:16px;font-weight:550;margin:0 0 8px}.meta p{margin:4px 0}.note{font-size:11px;color:#707070}label{display:inline-block;font-size:12px;margin:12px 5px 8px 0}input[type=number]{width:65px;padding:6px}textarea{width:100%;font-size:12px}#count{align-self:center;font-size:12px}a{color:inherit}</style>
<header><h1>계원1114 · 프로젝트별 사진 목록표</h1><p>SUMMARY · 2026.11.19 원본 재검증본</p><p>현재 홈페이지에 등록된 사진만으로 새로 작성했습니다. <b>작품명-번호</b>는 파일 식별번호이며, <b>현재 순서</b>는 홈페이지에 표시되는 순서입니다.<br>삭제·순서 변경을 표시한 뒤 ‘요청서 다운로드’를 눌러 보내주세요. 이 표시는 브라우저에만 저장되며 홈페이지에 자동 반영되지 않습니다.<br>이번 재등록을 기준으로 새 요청서를 시작합니다.</p><details><summary>기존 사진을 유지한 작품과 이유</summary><ul>EXCEPTIONS</ul></details><p><a href="https://kyewon1114.vercel.app/projects" target="_blank" rel="noreferrer">홈페이지 프로젝트 보기 ↗</a></p></header>
<nav><select id="project">OPTIONS</select><input id="search" type="search" placeholder="사진 번호 또는 작품 검색"><button id="download">요청서 다운로드</button><span id="count"></span></nav><main id="grid">CARDS</main>
<script>
const cards=[...document.querySelectorAll('article')],key='wovn-photo-review-rebuilt-20261119';let state={};try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))state=saved}catch{}
function snapshot(){const s={};for(const c of cards){const[o,d]=c.querySelectorAll('input'),n=c.querySelector('textarea');if(o.value||d.checked||n.value)s[c.dataset.ref]={order:o.value,delete:d.checked,note:n.value};c.classList.toggle('deleted',d.checked)}state=s;try{localStorage.setItem(key,JSON.stringify(s))}catch{}}
for(const c of cards){const v=state[c.dataset.ref];if(v){const[o,d]=c.querySelectorAll('input');o.value=v.order||'';d.checked=!!v.delete;c.querySelector('textarea').value=v.note||''}c.addEventListener('input',snapshot)}snapshot();
function filter(){const p=document.querySelector('#project').value,q=document.querySelector('#search').value.trim().toLowerCase();let n=0;for(const c of cards){const show=(!p||p===c.dataset.project)&&(!q||(c.dataset.ref+' '+c.dataset.title).toLowerCase().includes(q));c.classList.toggle('hidden',!show);if(show)n++}document.querySelector('#count').textContent=n+' / '+cards.length+'장'}document.querySelector('#project').addEventListener('change',filter);document.querySelector('#search').addEventListener('input',filter);filter();
document.querySelector('#download').addEventListener('click',()=>{snapshot();const lines=['WOVN · 계원1114 사진 변경 요청','사진 목록: 2026.11.19 원본 재검증본 / '+cards.length+'장',''];for(const c of cards){const s=state[c.dataset.ref];if(!s)continue;lines.push(c.dataset.title+' / '+c.dataset.ref+' (현재 순서 '+c.dataset.order+')');if(s.delete)lines.push('삭제 요청');if(s.order)lines.push('변경 순서: '+s.order);if(s.note)lines.push(s.note);lines.push('')}if(lines.length===3)lines.push('새 요청 표시가 없습니다.');const u=URL.createObjectURL(new Blob(['\\uFEFF'+lines.join('\\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='WOVN-사진변경요청.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
</script></html>'''
document=document.replace('SUMMARY',f'{len(groups)}개 작품 · {len(cards)}장').replace('EXCEPTIONS',exceptions).replace('OPTIONS',''.join(options)).replace('CARDS',''.join(cards))
output=root/'output/review/WOVN-Photo-Review-20261118.html';output.parent.mkdir(parents=True,exist_ok=True);output.write_text(document)
print(json.dumps({'file':str(output),'projects':len(groups),'photos':len(cards),'bytes':output.stat().st_size}))
