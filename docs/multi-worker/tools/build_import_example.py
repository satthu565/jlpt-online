"""Create synthetic import-v2 fixtures. Never reads or extracts a PDF."""
from pathlib import Path
import copy
import hashlib
import io
import json
import math
import struct
import wave
import zipfile
import zlib

ROOT=Path(__file__).resolve().parents[1]

def text(value):return [{'t':'text','text':value}]
def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
def png_fixture():
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',2,2,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\0\xff\xff\xff\0\0\0\0\0\0\0\xff\xff\xff'))+chunk(b'IEND',b'')
def wav_fixture():
    out=io.BytesIO()
    with wave.open(out,'wb') as audio:
        audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(16000)
        audio.writeframes(b''.join(struct.pack('<h',int(2500*math.sin(2*math.pi*440*n/16000))) for n in range(32000)))
    return out.getvalue()

def question(id,number,skill,stem,options,answer):
    return {'id':id,'number':str(number),'skill':skill,'stem':stem,
      'options':[{'label':str(i+1),'content':text(v)} for i,v in enumerate(options)],
      'correctOption':answer,'sourcePages':[],'explanation':None}

def main():
    image=png_fixture();audio=wav_fixture()
    ih=hashlib.sha256(image).hexdigest();ah=hashlib.sha256(audio).hexdigest()
    ik=f'media/{ih}.png';ak=f'media/{ah}.wav'
    groups=[
      {'id':'g-vocab','sectionCode':'language_vocab','mondaiType':'kanji_reading','orderInSection':1,
       'instructions':text('下線のことばの読み方を選んでください。'),'passage':[],'mediaKeys':[], 'sourcePages':[],
       'questions':[question('q-1',1,'kanji',[{'t':'underline','children':text('学校')}],['がっこう','がこう','がっこ','がくこう'],1),
                    question('q-2',2,'vocabulary',[{'t':'ruby','text':'水','rt':'みず'},{'t':'text','text':'を飲みます。'}],['nước','lửa','đất','gió'],1)],'transcript':None},
      {'id':'g-order','sectionCode':'language_grammar_reading','mondaiType':'sentence_composition','orderInSection':1,
       'instructions':text('★に入るものを選んでください。'),'passage':[],'mediaKeys':[],'sourcePages':[],
       'questions':[question('q-3',3,'grammar',[{'t':'text','text':'わたしは '},{'t':'blank'},{'t':'blank'},{'t':'star'},{'t':'blank'},{'t':'text','text':'。'}],['毎日','日本語を','勉強','します'],3)],'transcript':None},
      {'id':'g-reading','sectionCode':'language_grammar_reading','mondaiType':'info_retrieval','orderInSection':2,
       'instructions':text('表を見て答えてください。'),
       'passage':[{'type':'table','rows':[[text('曜日'),text('開店')],[text('月曜日'),text('9:00')]]},
                  {'type':'image','mediaKey':ik,'alt':'Ảnh fixture 2×2 chỉ để kiểm tra đường dẫn','width':2,'height':2}],
       'mediaKeys':[ik],'sourcePages':[],
       'questions':[question('q-4',4,'reading',text('月曜日は何時に開きますか。'),['8:00','9:00','10:00'],2)],'transcript':None},
      {'id':'g-listening','sectionCode':'listening','mondaiType':'quick_response','orderInSection':1,
       'instructions':text('Đây chỉ là fixture âm báo, không phải bài nghe JLPT.'),'passage':[],'mediaKeys':[ak],'sourcePages':[],
       'questions':[question('q-5',5,'listening',text('Trong fixture này bạn nghe thấy âm nào?'),['Âm báo','Lời nói','Không có âm'],1)],'transcript':None}
    ]
    obj={'formatVersion':2,'packageId':'00000000-0000-4000-8000-000000000002','revision':1,
      'source':{'name':'Fixture tự soạn kiểm tra định dạng, không phải đề JLPT thật','level':'N5','year':None,'session':None,
                'provenance':'self_authored','licenseRef':'self-authored-example','rightsStatus':'owner_confirmed'},
      'sourceFiles':[],
      'exam':{'title':'Gói mẫu 5 câu để kiểm tra import v2','slug':'import-v2-demo','kind':'practice',
              'blueprintRef':{'id':'synthetic-n5-v1','version':1},'totalQuestions':5,
              'sections':[
                {'code':'language_vocab','title':'Từ vựng mẫu','durationSec':30,'groupIds':['g-vocab'],'listeningTimeline':[]},
                {'code':'language_grammar_reading','title':'Ngữ pháp đọc mẫu','durationSec':30,'groupIds':['g-order','g-reading'],'listeningTimeline':[]},
                {'code':'listening','title':'Nghe fixture','durationSec':30,'groupIds':['g-listening'],
                 'listeningTimeline':[{'groupId':'g-listening','mediaKey':ak,'startMs':0,'endMs':2000,'audioStartMs':0,'audioEndMs':2000,'gapAfterMs':28000}]}
              ]},
      'groups':groups,'media':[
          {'path':ik,'sha256':ih,'mimeType':'image/png','durationMs':None,'width':2,'height':2},
          {'path':ak,'sha256':ah,'mimeType':'audio/wav','durationMs':2000,'width':None,'height':None}], 'issues':[]}
    draft=copy.deepcopy(obj)
    draft['packageId']='00000000-0000-4000-8000-000000000003'
    draft['groups'][0]['questions'][0]['correctOption']=None
    draft['issues']=[{'id':'answer-unknown','severity':'blocking','path':'/groups/0/questions/0/correctOption',
                     'reason':'Ví dụ thiếu đáp án từ nguồn; cần chủ dự án xác minh, không tự đoán.','sourcePages':[]}]
    for name,package in [('import-v2-ready',obj),('import-v2-draft',draft)]:
        dest=ROOT/'examples'/name;dest.mkdir(parents=True,exist_ok=True)
        files={'import.json':(json.dumps(package,ensure_ascii=False,indent=2)+'\n').encode('utf-8'),ik:image,ak:audio}
        for path,data in files.items():
            target=dest/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
        with zipfile.ZipFile(ROOT/'examples'/f'{name}.zip','w',zipfile.ZIP_DEFLATED) as bundle:
            for path,data in sorted(files.items()):
                info=zipfile.ZipInfo(path,date_time=(2026,10,15,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
                bundle.writestr(info,data)
    print('Created synthetic ready/draft folders and ZIPs; no real PDF or copyrighted exam data.')

if __name__=='__main__':main()
