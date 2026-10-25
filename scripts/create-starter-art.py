"""Create original starter pixel art and a native, editable RGBA Aseprite document.
Not a runtime dependency. Requires Pillow only when regenerating this starter art.
For artist edits, use Aseprite and npm run assets:export instead.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import struct, zlib, json

ROOT = Path(__file__).resolve().parents[1]
frames, tags = [], []
S = 24

def add(name, images):
    start = len(frames)
    frames.extend((f'{name}-{i}', im) for i, im in enumerate(images))
    tags.append({'name': name, 'from': start, 'to': len(frames)-1, 'direction': 'forward', 'repeat': 0})

def canvas(): return Image.new('RGBA', (S, S))
def rect(d, xy, color): d.rectangle(xy, fill=color)

# Four hand-pixelled walking poses per direction; no vector/canvas art at runtime.
for kind in ('dog', 'cat'):
    for direction in ('down', 'up', 'left', 'right'):
        poses=[]
        for step in range(4):
            im=canvas(); d=ImageDraw.Draw(im)
            outline='#38233b'; coat='#de963e' if kind=='dog' else '#8a83ba'
            light='#ffce78' if kind=='dog' else '#c2b9e8'
            dark='#95522f' if kind=='dog' else '#5d547f'
            white='#fff0c7'; foot=step%2
            # shadow and moving paws
            rect(d,(5,19,18,20),'#253c3c')
            for x,dy in ((6,foot),(14,1-foot)):
                rect(d,(x,16+dy,x+3,19+dy),outline)
                rect(d,(x+1,16+dy,x+2,18+dy),light)
            rect(d,(6,9,17,17),outline); rect(d,(7,10,16,16),coat)
            rect(d,(7,11,9,15),light)
            if direction in ('down','up'):
                rect(d,(5,5,18,12),outline); rect(d,(6,6,17,11),coat)
                if kind=='cat':
                    d.polygon([(5,7),(5,2),(10,6)],fill=outline); d.polygon([(14,6),(18,2),(18,8)],fill=outline)
                    rect(d,(6,4,7,6),'#f99da1'); rect(d,(16,4,17,6),'#f99da1')
                else:
                    rect(d,(3,5,6,12),outline); rect(d,(4,6,5,11),dark)
                    rect(d,(17,5,20,12),outline); rect(d,(18,6,19,11),dark)
                if direction=='down':
                    rect(d,(8,8,9,9),outline); rect(d,(14,8,15,9),outline)
                    rect(d,(8,7,8,7),white); rect(d,(14,7,14,7),white)
                    rect(d,(9,10,14,12),white); rect(d,(11,10,12,11),outline)
                    rect(d,(11,12,12,13),'#f78494')
                else:
                    rect(d,(8,6,15,7),light)
                    rect(d,(11+foot,15,13+foot,18),dark)
                rect(d,(7,13,16,14),'#dd505d'); rect(d,(11,14,12,15),'#ffe99b')
            else:
                # Side silhouette faces right; mirror for left.
                rect(d,(12,4,19,12),outline); rect(d,(13,5,18,11),coat)
                rect(d,(12,5,14,11),dark)
                if kind=='cat': d.polygon([(12,6),(13,1),(17,5)], fill=outline)
                rect(d,(18,8,21,11),white); rect(d,(20,8,22,9),outline)
                rect(d,(17,6,18,7),outline); rect(d,(17,6,17,6),white)
                rect(d,(15,12,18,13),'#dd505d')
                rect(d,(3,10-foot,6,12-foot),outline); rect(d,(3,9-foot,4,11-foot),light)
                if direction=='left': im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            poses.append(im)
        add(f'{kind}-{direction}',poses)

im=canvas(); d=ImageDraw.Draw(im); rect(d,(0,0,23,23),'#386449')
for x,y in [(2,3),(11,1),(19,6),(7,13),(20,18),(3,21),(15,20),(12,9)]:
    rect(d,(x,y,x+1,y+1),'#508451'); rect(d,(x+1,y-1,x+1,y),'#77a65f')
add('grass',[im])
im=canvas(); d=ImageDraw.Draw(im); rect(d,(0,0,23,23),'#243547'); rect(d,(1,1,22,21),'#5a6c7e')
for y in (2,9,16):
    rect(d,(2,y,21,y),'#9cb2bc'); rect(d,(1,y+6,22,y+7),'#354855')
    x=8 if y==9 else 15; rect(d,(x,y+1,x+1,y+5),'#354855')
rect(d,(1,22,22,23),'#1d2b39'); add('wall',[im])
im=canvas(); d=ImageDraw.Draw(im); rect(d,(1,1,22,23),'#472f30'); rect(d,(2,1,21,21),'#bc7c3b')
for x in (3,9,15):
    rect(d,(x,2,x+4,20),'#e2ab58'); rect(d,(x+1,3,x+1,19),'#f7d789')
rect(d,(2,2,21,3),'#f3c777'); rect(d,(2,18,21,20),'#995536')
d.line((4,18,19,5),fill='#472f30',width=4); d.line((4,17,19,4),fill='#e2ab58',width=2)
for x,y in ((3,3),(20,3),(3,19),(20,19)): d.point((x,y),fill='#472f30')
add('crate',[im])
im=canvas(); d=ImageDraw.Draw(im); rect(d,(3,11,20,23),'#3b2938'); rect(d,(4,10,19,21),'#f5d596')
for y in (13,17,21): rect(d,(4,y,19,y),'#ce9c62')
d.polygon([(0,11),(11,1),(12,1),(23,11)],fill='#412c41'); d.polygon([(2,10),(11,3),(12,3),(21,10)],fill='#dc6471')
for y in (7,10): rect(d,(6 if y==7 else 3,y,17 if y==7 else 20,y),'#993c59')
rect(d,(9,14,15,23),'#4b3445'); rect(d,(10,14,14,15),'#4b3445')
rect(d,(11,8,13,10),'#fff3ae'); add('house',[im])
for name,color in [('bone','#fff0bd'),('range','#ffdb6b'),('bomb','#89dc9b')]:
    im=canvas(); d=ImageDraw.Draw(im)
    if name!='bone':
        rect(d,(3,3,20,20),'#384354'); rect(d,(4,4,19,19),color); rect(d,(5,5,18,6),'#fff4c9')
    for x,y in ((6,8),(6,12),(16,8),(16,12)):
        rect(d,(x-1,y-1,x+2,y+2),'#694e46'); rect(d,(x,y,x+1,y+1),'#fff3cf')
    rect(d,(7,9,16,12),'#fff3cf'); rect(d,(8,12,15,13),'#d8bb8b')
    add(name,[im])
im=canvas(); d=ImageDraw.Draw(im); rect(d,(3,3,20,20),'#384354'); rect(d,(4,4,19,19),'#74d2df')
d.polygon([(7,7),(12,7),(13,12),(17,13),(17,16),(6,16)],fill='#fcf2d6'); rect(d,(6,16,17,17),'#536b9d'); add('speed',[im])
for name in ('spark','dust','note','shadow'):
    im=canvas(); d=ImageDraw.Draw(im)
    if name=='spark':
        rect(d,(11,6,12,17),'#ffffff'); rect(d,(6,11,17,12),'#ffffff'); rect(d,(9,9,14,14),'#ffffff')
    elif name=='dust':
        rect(d,(7,9,16,15),'#ffffff'); rect(d,(9,7,14,17),'#ffffff')
    elif name=='note':
        rect(d,(13,5,14,14),'#ffffff'); rect(d,(14,5,17,7),'#ffffff'); rect(d,(9,13,13,16),'#ffffff')
    else:
        rect(d,(5,18,18,20),'#20352e'); rect(d,(7,17,16,21),'#20352e')
    add(name,[im])
poses=[]
for k in range(4):
    im=canvas(); d=ImageDraw.Draw(im); size=4+k*2
    d.rectangle((12-size,12-size,11+size,11+size),outline='#60d5f5',width=2)
    rect(d,(10,3,13,20),'#8ee8ef'); rect(d,(3,10,20,13),'#8ee8ef')
    rect(d,(10,10,13,13),'#fff3b4'); poses.append(im)
add('blast',poses)

# Aseprite binary format (32-bit RGBA, compressed cels, frame tags).
u16=lambda n: struct.pack('<H',n)
u32=lambda n: struct.pack('<I',n)
def string(s):
    b=s.encode(); return u16(len(b))+b
def chunk(kind,data): return u32(len(data)+6)+u16(kind)+data
layer=chunk(0x2004, struct.pack('<6HB3s',1,0,0,0,0,0,255,b'\0'*3)+string('Pixel art'))
tagdata=u16(len(tags))+b'\0'*8
for tag in tags:
    tagdata+=struct.pack('<HHBH',tag['from'],tag['to'],0,0)+b'\0'*6+bytes([225,155,88,0])+string(tag['name'])
tagchunk=chunk(0x2018,tagdata)
body=b''
for i,(name,im) in enumerate(frames):
    celdata=struct.pack('<HhhBHh5sHH',0,0,0,255,2,0,b'\0'*5,S,S)+zlib.compress(im.tobytes())
    chunks=([layer,tagchunk] if i==0 else [])+[chunk(0x2005,celdata)]
    payload=b''.join(chunks)
    body+=struct.pack('<IHHH2sI',16+len(payload),0xF1FA,len(chunks),120,b'\0'*2,len(chunks))+payload
header=bytearray(128)
struct.pack_into('<IHHHHHI',header,0,128+len(body),0xA5E0,len(frames),S,S,32,1)
struct.pack_into('<H',header,18,120)
header[32]=0
struct.pack_into('<HBBhhHH',header,32,0,1,1,0,0,S,S)
(ROOT/'art/world.aseprite').write_bytes(bytes(header)+body)
# Checked-in exports allow playing without owning/installing Aseprite.
sheet=Image.new('RGBA',(len(frames)*S,S)); metadata=[]
for i,(name,im) in enumerate(frames):
    sheet.paste(im,(i*S,0)); metadata.append({'filename':str(i),'frame':{'x':i*S,'y':0,'w':S,'h':S},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':S,'h':S},'sourceSize':{'w':S,'h':S},'duration':120})
sheet.save(ROOT/'public/assets/world.png')
(ROOT/'public/assets/world.json').write_text(json.dumps({'frames':metadata,'meta':{'app':'Lost Dog starter art generator; editable in Aseprite','version':'1','image':'world.png','format':'RGBA8888','size':{'w':sheet.width,'h':sheet.height},'scale':'1','frameTags':tags,'layers':[{'name':'Pixel art','opacity':255,'blendMode':'normal'}]}},indent=2)+'\n')
print(f'Created {len(frames)} original 24×24 frames and {len(tags)} named tags.')
