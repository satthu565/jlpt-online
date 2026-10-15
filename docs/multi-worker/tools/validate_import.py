"""Validate prepared import v2 JSON and files. No network, PDF parsing, or model calls.

Only the JSON Schema keywords used by the bundled schema are evaluated here.
The production importer must also decode media, enforce license/blueprint and
permissions, scan uploads, and transact with the database.
"""
import argparse
import hashlib
import io
import json
import re
import struct
import sys
import unicodedata
import wave
import zipfile
from pathlib import Path, PurePosixPath

ROOT=Path(__file__).resolve().parents[1]
MAX_FILES=2000
MAX_FILE=120*1024*1024
MAX_TOTAL=500*1024*1024
MAX_JSON=10*1024*1024

class InvalidPackage(ValueError):
    pass

def unique_object(pairs):
    obj={}
    for key,value in pairs:
        if key in obj:
            raise InvalidPackage('JSON có khóa trùng: '+key)
        obj[key]=value
    return obj

def safe_name(name):
    raw=name.rstrip('/')
    if not raw or '\\' in raw or ':' in raw or '\x00' in raw or raw.startswith('/'):
        raise InvalidPackage('Đường dẫn không an toàn: '+name)
    if any(p in ('','.','..') for p in raw.split('/')):
        raise InvalidPackage('Đường dẫn không an toàn: '+name)
    return PurePosixPath(raw).as_posix()

def read_package(path):
    path=Path(path)
    files={}; seen=set(); total=0
    def add(name,data):
        nonlocal total
        name=safe_name(name)
        if name.casefold() in seen:
            raise InvalidPackage('Tên file trùng hoặc chỉ khác hoa thường: '+name)
        seen.add(name.casefold()); total+=len(data)
        if len(data)>MAX_FILE or total>MAX_TOTAL or len(files)>=MAX_FILES:
            raise InvalidPackage('Vượt giới hạn kích thước hoặc số file')
        files[name]=data
    if path.is_dir():
        base=path.resolve()
        for file in sorted(path.rglob('*')):
            if file.is_symlink() or not file.resolve().is_relative_to(base):
                raise InvalidPackage('Không nhận symlink hoặc đường dẫn ngoài gói')
            if file.is_file():
                if file.stat().st_size>MAX_FILE: raise InvalidPackage('File quá lớn: '+str(file))
                add(file.relative_to(path).as_posix(),file.read_bytes())
    elif path.is_file() and zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as z:
            infos=z.infolist()
            if len(infos)>MAX_FILES+100: raise InvalidPackage('Quá nhiều ZIP entries')
            expanded=0
            for info in infos:
                safe_name(info.filename)
                if (info.external_attr>>16)&0o170000==0o120000:
                    raise InvalidPackage('Không nhận symlink trong ZIP')
                if info.is_dir(): continue
                if info.flag_bits&1: raise InvalidPackage('Không nhận ZIP mã hóa')
                expanded+=info.file_size
                if info.file_size>MAX_FILE or expanded>MAX_TOTAL:
                    raise InvalidPackage('ZIP vượt giới hạn giải nén')
                if info.file_size/max(1,info.compress_size)>200:
                    raise InvalidPackage('Tỷ lệ nén vượt giới hạn: '+info.filename)
                add(info.filename,z.read(info))
    else:
        raise InvalidPackage('Đầu vào phải là thư mục gói hoặc ZIP có import.json ở gốc')
    if 'import.json' not in files: raise InvalidPackage('Thiếu import.json ở gốc gói')
    if len(files['import.json'])>MAX_JSON: raise InvalidPackage('import.json vượt 10MiB')
    try:
        obj=json.loads(files['import.json'].decode('utf-8-sig'),object_pairs_hook=unique_object)
    except (UnicodeError,json.JSONDecodeError,RecursionError) as e:
        raise InvalidPackage('JSON UTF-8 không hợp lệ: '+str(e)) from e
    return obj,files

def escape(text):
    return str(text).replace('~','~0').replace('/','~1')

def schema_errors(value,schema,root,path='',depth=0):
    if depth>64: return [path+': JSON quá sâu']
    if '$ref' in schema:
        ref=schema['$ref']
        if not ref.startswith('#/'):return [path+': chỉ nhận schema ref cục bộ']
        target=root
        for key in ref[2:].split('/'):target=target[key]
        return schema_errors(value,target,root,path,depth+1)
    if 'oneOf' in schema:
        attempts=[schema_errors(value,s,root,path,depth+1) for s in schema['oneOf']]
        if sum(not a for a in attempts)==1:return []
        best=min(attempts,key=len)
        return [path+': không khớp đúng một dạng dữ liệu; '+('; '.join(best[:2]) or 'nhiều dạng cùng khớp')]
    errors=[]
    kinds={'object':lambda x:isinstance(x,dict),'array':lambda x:isinstance(x,list),
           'string':lambda x:isinstance(x,str),'integer':lambda x:isinstance(x,int) and not isinstance(x,bool),
           'number':lambda x:isinstance(x,(int,float)) and not isinstance(x,bool),'null':lambda x:x is None,
           'boolean':lambda x:isinstance(x,bool)}
    types=schema.get('type')
    if types:
        types=types if isinstance(types,list) else [types]
        if not any(kinds[t](value) for t in types):return [path+': sai kiểu, cần '+str(types)]
    if 'const' in schema and value!=schema['const']:errors.append(path+': cần giá trị '+str(schema['const']))
    if 'enum' in schema and value not in schema['enum']:errors.append(path+': giá trị ngoài danh sách cho phép')
    if value is None:return errors
    if isinstance(value,dict):
        for name in schema.get('required',[]):
            if name not in value:errors.append(path+'/'+escape(name)+': thiếu trường bắt buộc')
        props=schema.get('properties',{})
        if schema.get('additionalProperties') is False:
            errors.extend(path+'/'+escape(k)+': trường không được phép' for k in value if k not in props)
        for name,item in value.items():
            if name in props:errors+=schema_errors(item,props[name],root,path+'/'+escape(name),depth+1)
    elif isinstance(value,list):
        if len(value)<schema.get('minItems',0):errors.append(path+': quá ít phần tử')
        if 'maxItems' in schema and len(value)>schema['maxItems']:errors.append(path+': quá nhiều phần tử')
        if schema.get('uniqueItems') and len({json.dumps(x,sort_keys=True,ensure_ascii=False) for x in value})!=len(value):errors.append(path+': phần tử bị trùng')
        if 'items' in schema:
            for i,item in enumerate(value):errors+=schema_errors(item,schema['items'],root,path+'/'+str(i),depth+1)
    elif isinstance(value,str):
        if len(value)<schema.get('minLength',0):errors.append(path+': chuỗi rỗng hoặc quá ngắn')
        if 'pattern' in schema and not re.search(schema['pattern'],value):errors.append(path+': không đúng định dạng')
    elif isinstance(value,(int,float)) and not isinstance(value,bool):
        if 'minimum' in schema and value<schema['minimum']:errors.append(path+': nhỏ hơn giá trị tối thiểu')
        if 'maximum' in schema and value>schema['maximum']:errors.append(path+': lớn hơn giá trị tối đa')
    return errors

def walk(value,path=''):
    yield path,value
    if isinstance(value,dict):
        for key,item in value.items():yield from walk(item,path+'/'+escape(key))
    elif isinstance(value,list):
        for i,item in enumerate(value):yield from walk(item,path+'/'+str(i))

def pointer(root,path):
    value=root
    for part in path.lstrip('/').split('/'):
        part=part.replace('~1','/').replace('~0','~')
        value=value[int(part)] if isinstance(value,list) else value[part]
    return value

def media_signature(data,mime):
    if mime=='image/png':return data.startswith(b'\x89PNG\r\n\x1a\n')
    if mime=='image/jpeg':return data.startswith(b'\xff\xd8\xff')
    if mime=='image/webp':return len(data)>12 and data[:4]==b'RIFF' and data[8:12]==b'WEBP'
    if mime=='image/avif':return len(data)>12 and data[4:8]==b'ftyp' and b'avif' in data[8:40]
    if mime=='audio/wav':return len(data)>12 and data[:4]==b'RIFF' and data[8:12]==b'WAVE'
    if mime=='audio/mp4':return len(data)>12 and data[4:8]==b'ftyp'
    if mime=='audio/mpeg':return data.startswith(b'ID3') or len(data)>2 and data[0]==255 and data[1]&224==224
    return False

def validate(path,mode='ready'):
    try:
        obj,files=read_package(path)
        schema=json.loads((ROOT/'schemas/import-v2.schema.json').read_text(encoding='utf-8'))
        errors=schema_errors(obj,schema,schema)
    except (InvalidPackage,OSError,ValueError,RecursionError,zipfile.BadZipFile) as e:
        return {'valid':False,'mode':mode,'errors':[str(e)],'warnings':[],'publicationApproved':False}
    warnings=['Chỉ kiểm tra cấu trúc và file; không xác minh nội dung PDF, đáp án, bản quyền hoặc blueprint chính thức.']
    if errors:return {'valid':False,'mode':mode,'errors':errors,'warnings':warnings,'publicationApproved':False}
    blocking=[i for i in obj['issues'] if i['severity']=='blocking']
    def err(path,msg):errors.append(path+': '+msg)
    def uncertain(path,msg):
        covered=any(path==i['path'] or path.startswith(i['path']+'/') for i in blocking)
        if mode=='ready' or not covered:err(path,msg+'; cần issue blocking và chế độ draft nếu chưa xác định')
    for issue in obj['issues']:
        try:pointer(obj,issue['path'])
        except (KeyError,ValueError,IndexError,TypeError):err('/issues','path không trỏ tới trường tồn tại: '+issue['path'])
    if mode=='ready' and blocking:err('/issues','còn vấn đề blocking, không đạt READY_FOR_REVIEW')
    for p,value in walk(obj):
        if isinstance(value,str) and not unicodedata.is_normalized('NFC',value):err(p,'chuỗi chưa chuẩn hóa Unicode NFC')
        if isinstance(value,str) and p.startswith('/groups/') and '[KHONG_DOC_RO]' in value:
            uncertain(p,'nội dung còn nhãn không đọc rõ')
        if isinstance(value,dict) and value.get('t') in ('underline','emphasis'):
            for child in value['children']:
                if child.get('t') in ('underline','emphasis'):err(p,'không lồng underline/emphasis thêm một cấp')
    sources={};media={};declared={'import.json'}
    for i,s in enumerate(obj['sourceFiles']):
        if s['id'] in sources:err('/sourceFiles/'+str(i),'source id trùng')
        sources[s['id']]=s
    for p,v in walk(obj):
        if isinstance(v,dict) and 'sourceId' in v and v['sourceId'] not in sources:
            err(p+'/sourceId','không có sourceFile tương ứng')
    mime_ext={'image/png':{'png'},'image/jpeg':{'jpg','jpeg'},'image/webp':{'webp'},'image/avif':{'avif'},'audio/wav':{'wav'},'audio/mpeg':{'mp3'},'audio/mp4':{'m4a'}}
    for name,records in [('sourceFiles',obj['sourceFiles']),('media',obj['media'])]:
        for i,m in enumerate(records):
            p='/'+name+'/'+str(i);key=m['path'];declared.add(key)
            if key not in files:err(p+'/path','thiếu file '+key);continue
            data=files[key]
            digest=hashlib.sha256(data).hexdigest()
            if digest!=m['sha256'] or Path(key).stem!=digest:err(p+'/sha256','hash hoặc tên file không đúng nội dung bytes')
            if name=='sourceFiles':
                if not data.startswith(b'%PDF-'):err(p,'attachment nguồn không có signature PDF')
                continue
            if key in media:err(p,'khai báo media trùng')
            media[key]=m
            if key.rsplit('.',1)[-1] not in mime_ext[m['mimeType']]:err(p,'MIME không khớp extension')
            if not media_signature(data,m['mimeType']):err(p,'signature file không khớp MIME')
            if m['mimeType'].startswith('audio/'):
                if m['durationMs'] is None or m['width'] is not None or m['height'] is not None:err(p,'audio cần durationMs, width/height=null')
                if m['mimeType']=='audio/wav':
                    try:
                        with wave.open(io.BytesIO(data),'rb') as audio:
                            actual=audio.getnframes()*1000/audio.getframerate()
                        if m['durationMs'] is not None and abs(actual-m['durationMs'])>1:err(p+'/durationMs','không khớp WAV thật')
                    except (wave.Error,EOFError):err(p,'WAV không hợp lệ')
            else:
                if m['durationMs'] is not None or m['width'] is None or m['height'] is None:err(p,'ảnh cần width/height, durationMs=null')
                if m['mimeType']=='image/png' and len(data)>=24:
                    actual=struct.unpack('>II',data[16:24])
                    if actual!=(m['width'],m['height']):err(p,'kích thước không khớp PNG thật')
    for extra in sorted(set(files)-declared):err('/files','file chưa khai báo: '+extra)
    groups={};question_ids=set();total=0
    for gi,g in enumerate(obj['groups']):
        gp='/groups/'+str(gi)
        if g['id'] in groups:err(gp+'/id','group id trùng')
        groups[g['id']]=g
        for key in g['mediaKeys']:
            if key not in media:err(gp+'/mediaKeys','media không tồn tại: '+key)
        for p,v in walk(g,gp):
            if isinstance(v,dict) and 'mediaKey' in v:
                key=v['mediaKey']
                if key not in media or key not in g['mediaKeys']:err(p+'/mediaKey','ảnh chưa khai báo trong media và mediaKeys của group')
                elif media[key]['mimeType'].startswith('image/') and ('width' in v and (v['width'],v['height'])!=(media[key]['width'],media[key]['height'])):err(p,'kích thước ảnh không khớp manifest')
            if isinstance(v,dict) and 'sourceId' in v and v['sourceId'] not in sources:err(p+'/sourceId','không có sourceFile tương ứng')
        for qi,q in enumerate(g['questions']):
            qp=gp+'/questions/'+str(qi);total+=1
            if q['id'] in question_ids:err(qp+'/id','question id trùng toàn gói')
            question_ids.add(q['id'])
            if [o['label'] for o in q['options']]!=[str(i) for i in range(1,len(q['options'])+1)]:err(qp+'/options','labels phải giữ thứ tự1..n')
            answer=q['correctOption']
            if answer is None:uncertain(qp+'/correctOption','chưa có đáp án')
            elif answer>len(q['options']):err(qp+'/correctOption','đáp án ngoài số lựa chọn')
            if g['mondaiType']=='sentence_composition':
                segments=[v for _,v in walk(q['stem']) if isinstance(v,dict)]
                if sum(v.get('t')=='star' for v in segments)!=1 or sum(v.get('t')=='blank' for v in segments)!=3:err(qp+'/stem','câu sắp xếp cần3blank và1star; không đổi thứ tự lựa chọn')
    if total!=obj['exam']['totalQuestions']:err('/exam/totalQuestions','không bằng tổng câu thực tế '+str(total))
    used=[];section_codes=[]
    for si,s in enumerate(obj['exam']['sections']):
        sp='/exam/sections/'+str(si);section_codes.append(s['code'])
        if s['durationSec'] is None:uncertain(sp+'/durationSec','chưa có thời lượng')
        ordered=[]
        for gid in s['groupIds']:
            used.append(gid)
            if gid not in groups:err(sp+'/groupIds','group không tồn tại: '+gid);continue
            g=groups[gid];ordered.append(g)
            if g['sectionCode']!=s['code']:err(sp+'/groupIds','sectionCode của group không khớp')
        if [g['orderInSection'] for g in ordered]!=list(range(1,len(ordered)+1)):err(sp+'/groupIds','groupIds phải khớp orderInSection liên tục từ1')
        if s['code']!='listening' and s['listeningTimeline']:err(sp+'/listeningTimeline','timeline chỉ dành cho phần listening')
        timeline_groups=set();previous=None
        for ti,t in enumerate(s['listeningTimeline']):
            tp=sp+'/listeningTimeline/'+str(ti);timeline_groups.add(t['groupId'])
            if t['groupId'] not in s['groupIds']:err(tp+'/groupId','group không thuộc phần nghe này')
            m=media.get(t['mediaKey'])
            if not m or not m['mimeType'].startswith('audio/'):err(tp+'/mediaKey','thiếu audio hợp lệ')
            elif m['durationMs'] is not None and t['audioEndMs']>m['durationMs']:err(tp+'/audioEndMs','vượt độ dài audio')
            if t['groupId'] in groups and t['mediaKey'] not in groups[t['groupId']]['mediaKeys']:err(tp+'/mediaKey','audio chưa được group khai báo')
            if t['endMs']<=t['startMs'] or t['audioEndMs']<=t['audioStartMs']:err(tp,'mốc kết thúc phải lớn hơn bắt đầu')
            if t['endMs']-t['startMs']!=t['audioEndMs']-t['audioStartMs']:err(tp,'thời gian phát trên timeline phải bằng đoạn file audio')
            if previous is not None and t['startMs']!=previous:err(tp+'/startMs','timeline không liên tục với endMs+gapAfterMs trước đó')
            previous=t['endMs']+t['gapAfterMs']
            if s['durationSec'] is not None and previous>s['durationSec']*1000:err(tp,'timeline vượt thời lượng phần thi')
        if s['code']=='listening' and timeline_groups!=set(s['groupIds']):uncertain(sp+'/listeningTimeline','mỗi nhóm nghe cần timeline/audio thật')
    if len(section_codes)!=len(set(section_codes)):err('/exam/sections','sectionCode trùng')
    if Counter_list(used)!=Counter_list(list(groups)):err('/exam/sections','mỗi group phải được tham chiếu đúng một lần, không bỏ sót')
    if obj['exam']['kind']=='original':
        expected=['language_reading','listening'] if obj['source']['level'] in ('N1','N2') else ['language_vocab','language_grammar_reading','listening']
        if section_codes!=expected:err('/exam/sections','sai thứ tự phần theo cấp độ; còn cần server đối chiếu blueprint chính thức')
        if obj['source']['year'] is None:uncertain('/source/year','đề gốc thiếu năm')
        if obj['source']['session'] is None:uncertain('/source/session','đề gốc thiếu kỳ thi')
    if obj['exam']['blueprintRef'] is None:uncertain('/exam/blueprintRef','chưa xác định blueprintRef được hệ thống cung cấp')
    if obj['source']['rightsStatus']=='unverified' or obj['source']['licenseRef'] is None:warnings.append('Quyền sử dụng chưa được xác minh; server phải chặn publish tới khi owner duyệt license.')
    warnings.append('Importer production phải decode media thật và xác minh blueprint/license; tiện ích local không phải công cụ chống malware hoặc chứng nhận publish.')
    return {'valid':not errors,'mode':mode,'readiness':'READY_FOR_REVIEW' if not errors and mode=='ready' else 'DRAFT_ONLY' if not errors else 'INVALID',
      'questionCount':total,'groupCount':len(groups),'blockingIssueCount':len(blocking),
      'errors':errors,'warnings':warnings,'publicationApproved':False}

def Counter_list(items):
    from collections import Counter
    return Counter(items)

def main():
    if hasattr(sys.stdout,'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package',help='Thư mục hoặc ZIP có import.json ở gốc')
    parser.add_argument('--mode',choices=['ready','draft'],default='ready')
    args=parser.parse_args()
    result=validate(args.package,args.mode)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0 if result['valid'] else 1

if __name__=='__main__':
    sys.exit(main())
