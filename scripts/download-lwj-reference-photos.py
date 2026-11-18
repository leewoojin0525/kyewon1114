import json,urllib.request,concurrent.futures,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'assets/reference-lwj'
rows=json.loads((root/'materials-audit-20261118.json').read_text())
dest=root/'work-images';dest.mkdir(exist_ok=True)
jobs=[]
for p in rows:
 if p['kind']=='work':
  for i,image in enumerate(p['images'],1):
   jobs.append(dict(projectId=p['id'],title=p['title'],number=i,url=image['url'],path=str(dest/f'{p["id"]}-{i:03}.image')))
def download(j):
 target=Path(j['path'])
 if target.exists() and target.stat().st_size:return j
 if not j['url'].startswith('http://www.lwj.co.kr/m/data/file/page2/'):raise ValueError('Unexpected image host/path')
 for attempt in range(3):
  try:
   data=urllib.request.urlopen(j['url'],timeout=30).read()
   if not data:raise ValueError('Empty image')
   target.write_bytes(data);return j
  except Exception:
   if attempt==2:raise
   time.sleep(1)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as e: result=list(e.map(download,jobs))
(root/'work-image-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(dict(images=len(result),bytes=sum(Path(x['path']).stat().st_size for x in result))))
