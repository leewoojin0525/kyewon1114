import json, math, io, os
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

root=Path(__file__).resolve().parents[1]
scope = {'__file__': str(root/'scripts/create-photo-review.py')}
exec((root/'scripts/create-photo-review.py').read_text().split('cards = []')[0], scope)
plan = {'projects': [], 'photos': []}
for i,g in enumerate(scope['groups']):
 photos = g['photos']
 plan['projects'].append({'id':str(i),'title':g['title']})
 for n,x in enumerate(photos,1):
  plan['photos'].append({**x,'projectId':str(i),'order':x['order'],'placement':'cover' if x['reference']==g['heroReference'] else 'gallery'})
out=root/'output/pdf';out.mkdir(parents=True,exist_ok=True)
pdf=out/'WOVN-Website-Photo-Catalog-20261118.pdf'
pdfmetrics.registerFont(TTFont('Korean','/System/Library/Fonts/Supplemental/AppleGothic.ttf'))
pdfmetrics.registerFont(TTFont('Arial','/System/Library/Fonts/Supplemental/Arial.ttf'))
W,H=A4;c=canvas.Canvas(str(pdf),pagesize=A4)
c.setTitle('WOVN STUDIO - Website Photo Catalog - 2026-11-19')
c.setAuthor('WOVN STUDIO')
page=0
def text(x,y,s,size=9,font='Korean',color='#282828'):
 c.setFillColor(color);c.setFont(font,size);c.drawString(x,y,s)
def start(title,sub):
 global page
 page+=1
 text(34,H-40,'WOVN',20,'Arial')
 text(34,H-66,title,14,'Arial' if title.startswith('P') else 'Korean')
 text(34,H-85,sub,8,color='#777777')
 c.setStrokeColorRGB(.83,.83,.81);c.line(34,H-98,W-34,H-98)
 text(34,23,'2026.11.19  |  kyewon1114.vercel.app  |  PHOTO REFERENCE',7,'Arial', '#777777')
 text(W-52,23,str(page),8,'Arial')
start('홈페이지 사진 목록표',f'{len(plan["projects"])} projects / {len(plan["photos"])} images / WebP / 원본 비율 유지')
text(34,H-125,f'게시 {scope["active_count"]}장 / 삭제됨 {scope["deleted_count"]}장 · 고정 번호로 변경 요청',11)
text(34,H-145,'예: Samjeon-014를 대표사진으로 / Tied-008 삭제 / S-house-009를 두 번째로',9)
text(34,H-164,'작품명-번호는 고정 파일 번호입니다. 현재 순서와 대표사진 여부는 별도로 표시합니다.',8)
text(34,H-181,'삭제됨 사진도 검토용으로 보관합니다. 홈페이지에는 표시되지 않습니다.',8)
text(34,H-198,'저용량 사진도 포함합니다. 다음 페이지와 각 사진에 해상도 구분을 표시했습니다.',8)
text(34,H-220,'작품 번호',8);text(102,H-220,'프로젝트',8);text(W-87,H-220,'사진 수',8)
y=H-241
for i,p in enumerate(plan['projects'],1):
 count=sum(1 for x in plan['photos'] if x['projectId']==p['id'])
 text(34,y,f'P{i:02d}',8,'Arial');text(102,y,p['title'],8,'Arial');text(W-80,y,str(count),8,'Arial')
 y-=18
c.showPage()
start('프로젝트별 해상도 구분', '저용량 사진도 홈페이지와 목록에 포함했습니다.')
y=H-120
for g in scope['groups']:
 text(34,y,g['title'],8,'Arial')
 text(275,y,g['sourceStatus'],7,color='#7751a8' if '재확인' in g['sourceStatus'] else '#a95512' if '저용량' in g['sourceStatus'] else '#237248')
 y-=23
text(34,90,'저용량 표시는 보관 원본의 해상도 기준이며, 원본을 억지로 확대하지 않습니다.',8)
c.showPage()
for idx,p in enumerate(plan['projects'],1):
 photos=sorted([x for x in plan['photos'] if x['projectId']==p['id']],key=lambda x:(bool(x.get('deleted')),x['order']))
 for offset in range(0,len(photos),9):
  chunk=photos[offset:offset+9]
  start(f'P{idx:02d}  {p["title"]}',f'{len(photos)} photographs  |  {offset+1}-{offset+len(chunk)}  |  COVER = Current cover')
  cw=(W-68-24)/3;ch=211
  for n,x in enumerate(chunk):
   col=n%3;row=n//3;left=34+col*(cw+12);top=H-113-row*ch
   im=Image.open(x['output']).convert('RGB');im.thumbnail((450,420))
   iw,ih=im.size;scale=min(cw/iw,143/ih)
   imageBytes=io.BytesIO();im.save(imageBytes,format='JPEG',quality=75)
   c.drawImage(ImageReader(imageBytes),left+(cw-iw*scale)/2,top-143+(143-ih*scale)/2,width=iw*scale,height=ih*scale)
   text(left,top-159,x['reference'],10,'Arial')
   text(left,top-173,'삭제됨 · 홈페이지 미게시' if x.get('deleted') else f'Order {x["order"]:03d}'+('  COVER' if x['placement']=='cover' else ''),7.8,'Korean' if x.get('deleted') else 'Arial','#b13f2c' if x.get('deleted') else '#282828')
   text(left,top-186,f'{x["width"]} x {x["height"]}  /  {x["bytes"]/1000:.0f} KB',7,'Arial','#777777')
   text(left,top-198,x.get('sourceStatus',''),6.5,color='#a95512' if x.get('lowResolution') else '#7751a8' if '재확인' in x.get('sourceStatus','') else '#237248')
   c.setStrokeColorRGB(.82,.82,.82);c.line(left,top-204,left+cw,top-204)
  c.showPage()
c.save()
reader=PdfReader(str(pdf))
alltext='\n'.join(p.extract_text() for p in reader.pages)
assert len(reader.pages)==2+sum(math.ceil(sum(x['projectId']==p['id'] for x in plan['photos'])/9) for p in plan['projects'])
for x in plan['photos']:assert x['reference'] in alltext,x['reference']
print(json.dumps({'file':str(pdf),'pages':len(reader.pages),'photos':len(plan['photos']),'bytes':pdf.stat().st_size}))
