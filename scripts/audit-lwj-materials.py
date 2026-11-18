import json,re,html,urllib.request,concurrent.futures
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'assets/reference-lwj'
tasks=[]
for kind,table,file in [('work','page2','work-list-live-20261118.html'),('story','page5','story-list-live-20261118.html')]:
 for id,title in re.findall(r'data-wr_id="(\d+)">(.*?)</a>',(root/file).read_text()):
  tasks.append((kind,table,id,html.unescape(title)))
def fetch(t):
 kind,table,id,title=t;url=f'http://www.lwj.co.kr/m/cms/board.php?bo_table={table}&wr_id={id}&ajax=true'
 raw=urllib.request.urlopen(url,timeout=30).read()
 (root/f'{kind}-{id}-live-20261118.json').write_bytes(raw)
 data=json.loads(raw)
 return dict(kind=kind,id=id,title=title,url=url,content=data.get('content',''),video=data.get('video',''),images=data.get('img',[]))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex: rows=list(ex.map(fetch,tasks))
(root/'materials-audit-20261118.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
for r in rows: print(json.dumps({'kind':r['kind'],'id':r['id'],'title':r['title'],'images':len(r['images']),'maxLongEdge':max((max(int(x.get('width',0)),int(x.get('height',0))) for x in r['images']),default=0)},ensure_ascii=False))
