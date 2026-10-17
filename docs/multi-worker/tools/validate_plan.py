"""Static planning QA. Does not execute, implement, or approve product features."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return json.loads((ROOT/name).read_text(encoding='utf-8'))

def main():
    errors=[]
    warnings=[]
    def require(ok,message):
        if not ok: errors.append(message)

    catalog=read('tasks.json')
    feature_doc=read('features.json')
    tasks=catalog['tasks']; features=feature_doc['features']
    config=read('config/workers.example.json')
    ext=read('external-prerequisites.json')['items']
    source=(ROOT/'nguon/DANH_MUC_TINH_NANG_GOC.md').read_text(encoding='utf-8')
    src=re.findall(r'^\| ([A-Z]+-\d+) \| (.*?) \| (P[012]) \|$',source,re.M)
    src_map={code:(title,priority) for code,title,priority in src}
    require(len(src)==len(src_map)==375,'Source feature count/uniqueness mismatch')
    fmap={f['id']:f for f in features}; tmap={t['id']:t for t in tasks}
    require(len(fmap)==len(features)==375,'Catalog features count/uniqueness mismatch')
    require(len(tmap)==len(tasks),'Duplicate task IDs')
    require(set(fmap)==set(src_map),'Feature source/catalog sets differ')
    require(catalog['scope']=='ALL_V1_V4' and catalog['targetDays']==7,'Wrong scope or target')
    external_ids={f'PDF-{n:02}' for n in range(6,17)}|{'PDF-18'}
    require(catalog.get('inputMode')=='PREPARED_IMPORT_V2_NO_OCR','Wrong prepared-data input mode')
    require(catalog.get('applicationFeatureCount')==363 and catalog.get('externalPreparationCount')==12,'Incorrect revised scope counts')
    require('ocr-provider' not in json.dumps(catalog) and 'apps/ocr-worker' not in json.dumps(catalog) and '/internal/ocr-jobs' not in json.dumps(catalog),'Removed PDF pipeline still scheduled')
    workers={w['id']:w for w in config['workers']}
    require(set(workers)==set(catalog['workerIds'])=={f'W{i}' for i in range(1,7)},'Not exactly six workers')
    for key in ['linuxUser','repo','home','database','storageRoot','bullmqPrefix']:
        require(len({w[key] for w in workers.values()})==6,f'Duplicate worker isolation key {key}')
    ports=[port for w in workers.values() for port in w['ports'].values()]
    require(len(ports)==len(set(ports)),'Port collisions')
    require(config['limits']['activeWork']==6,'Worker concurrency differs from requested six')
    ext_ids={e['id'] for e in ext}
    primary=Counter()
    for t in tasks:
        require(t['owner'] in workers,f"Unknown worker in {t['id']}")
        require(1<=t['day']<=8 and t['estimatedWorkerHours']>0,f"Invalid time in {t['id']}")
        require(t['notBeforeHour']==(t['day']-1)*24 and t['targetByHour']==t['day']*24,f"Day/hour mismatch {t['id']}")
        require(bool(t['scope'] and t['outputs'] and t['checks'] and t['acceptance']),f"Missing task detail {t['id']}")
        require(t['status']=='TODO' and t['evidence']==[],f"Unverified completion in baseline {t['id']}")
        for d in t['dependencies']:
            require(d in tmap and d!=t['id'],f"Invalid dependency {t['id']}->{d}")
        for e in t['startPrerequisites']+t['acceptancePrerequisites']:
            require(e in ext_ids,f"Unknown external prerequisite {e}")
        for r in t['exclusiveResources']:
            require(r in catalog['locks'],f"Unknown lock {r} in {t['id']}")
        roots=workers[t['owner']]['allowedRoots']+t['temporaryGrants']
        for out in t['outputs']:
            require(any(out==r or out.startswith(r) for r in roots),f"Output outside owner roots {t['id']}: {out}")
        for code in t['featureIds']:
            require(code in fmap,f"Unknown feature {code}")
            primary[code]+=1
    require(set(primary)==set(fmap) and all(n==1 for n in primary.values()),'Missing or duplicate primary feature assignment')
    for code,f in fmap.items():
        require((f['title'],f['priority'])==src_map.get(code),f"Source title/priority changed {code}")
        tid=f['taskId']
        require(tid in tmap,f"Unknown task {tid} for {code}")
        if tid in tmap:
            require(code in tmap[tid]['featureIds'] and f['owner']==tmap[tid]['owner'] and f['targetDay']==tmap[tid]['day'],f"Feature/task mismatch {code}")
        external=code in external_ids
        require(f.get('executionMode')==('EXTERNAL_PREPARATION' if external else 'APPLICATION'),f'Incorrect scope mode {code}')
        require(f['testIds']==([] if external else [f'feature/{code}']) and not f['evidence'] and f['status']==('EXTERNAL_INPUT_REQUIRED' if external else 'TODO'),f"Incorrect planned test/evidence {code}")
        require(f.get('deliveryOwner')==('PROJECT_OWNER' if external else f['owner']),f'Incorrect delivery ownership {code}')
    matrix=(ROOT/'MA_TRAN_TINH_NANG.md').read_text(encoding='utf-8')
    matrix_ids=re.findall(r'^\| ([A-Z]+-\d+) \|',matrix,re.M)
    require(len(matrix_ids)==375 and set(matrix_ids)==set(fmap),'Markdown matrix differs from JSON')
    cards=(ROOT/'KE_HOACH_TRIEN_KHAI.md').read_text(encoding='utf-8')
    anchors=set(re.findall(r'<a id="([^"]+)"',cards))
    require(anchors=={t.lower() for t in tmap},'Task cards missing/duplicate')
    old=(ROOT/'nguon/KE_HOACH_TRIEN_KHAI.md').read_text(encoding='utf-8-sig')
    original_ids=set(re.findall(r'^#### (T1\.\d+\.\d+) —',old,re.M))
    trace=(ROOT/'TRUY_VET_TASK_V1.md').read_text(encoding='utf-8')
    trace_ids=set(re.findall(r'^## (T1\.\d+\.\d+) ',trace,re.M))
    require(original_ids==trace_ids,'Original V1 task trace incomplete')
    require(set(ref for t in tasks for ref in t['originalTaskRefs'])==original_ids,'V1 execution references incomplete')

    # Greedy list schedule respects dependencies, one writing task per worker,
    # notBefore, and explicitly named exclusive locks. It excludes reviews and
    # unknown provider/CI/model delays and therefore cannot establish feasibility.
    remaining={t['id']:t for t in tasks}; finish={}; starts={}
    worker_free={w:0 for w in workers}; resource_free={}; ordered=[]
    while remaining:
        ready=[t for t in remaining.values() if all(d in finish for d in t['dependencies'])]
        if not ready:
            errors.append('Dependency cycle or invalid dependency in '+','.join(remaining));break
        def earliest(t):
            return max([t['notBeforeHour'],worker_free[t['owner']]]+
                       [finish[d] for d in t['dependencies']]+
                       [resource_free.get(r,0) for r in t['exclusiveResources']])
        t=min(ready,key=lambda t:(earliest(t),t['targetByHour'],tasks.index(t)))
        start=earliest(t); end=start+t['estimatedWorkerHours']; tid=t['id']
        starts[tid]=start;finish[tid]=end;worker_free[t['owner']]=end
        for resource in t['exclusiveResources']:resource_free[resource]=end
        ordered.append({'taskId':tid,'worker':t['owner'],'plannedDay':t['day'],
                        'startHour':start,'finishHour':end,'targetByHour':t['targetByHour'],
                        'lateToDailyTargetHours':max(0,end-t['targetByHour'])})
        del remaining[tid]
    total=max(finish.values(),default=0)
    late=[x for x in ordered if x['lateToDailyTargetHours']]
    if total>168:warnings.append(f'Optimistic schedule exceeds 168h: {total}h')
    if late:warnings.append('Daily target overruns: '+', '.join(f"{x['taskId']} +{x['lateToDailyTargetHours']}h" for x in late))
    warnings += ['Work duration estimates are speculative and exclude independent review, repair loops, provider waits and complete build contention.',
                 'Application requirements remain TODO; twelve source requirements are manual preparation outside the product, not implemented features.',
                 'Coding accounts quota/usage permission and external service readiness are not verified.',
                 '14/30-day observed acceptance cannot be proven by a 7-day implementation schedule.']

    # Resolve local Markdown links, including task anchors; skip archival docs
    # whose original paths are retained deliberately for provenance.
    link_count=0
    for p in ROOT.rglob('*.md'):
        if 'nguon' in p.relative_to(ROOT).parts: continue
        content=p.read_text(encoding='utf-8')
        for target in re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)',content):
            target=target.strip('<>')
            if re.match(r'^(?:https?://|mailto:)',target):continue
            path_part,_,anchor=target.partition('#')
            dest=(p.parent/path_part).resolve() if path_part else p
            require(dest.exists(),f'Broken local link {p.relative_to(ROOT)} -> {target}')
            if anchor and dest.exists() and dest.name=='KE_HOACH_TRIEN_KHAI.md':
                require(anchor in anchors,f'Broken task anchor {target}')
            link_count+=1
    # Cross-document consistency that counts alone cannot catch.
    require(set(config['locks'])==set(catalog['locks']),'Lock catalogue differs between tasks.json and workers config')
    for e in ext:
        start=[t['id'] for t in tasks if e['id'] in t['startPrerequisites']]
        accept=[t['id'] for t in tasks if e['id'] in t['acceptancePrerequisites']]
        require(e['blocksStart']==start and e['blocksAcceptance']==accept,f"external-prerequisites.json stale for {e['id']}")
    decisions=(ROOT/'QUYET_DINH_VA_DICH_VU.md').read_text(encoding='utf-8')
    table={}
    for row in re.findall(r'^\|([a-z][a-z0-9\-]*)\|[^|]*\|[^|]*\|([^|]*)\|([^|]*)\|[^|]*\|$',decisions,re.M):
        table[row[0]]=(set(re.findall(r'\b[A-Z]\d\d\b',row[1])),set(re.findall(r'\b[A-Z]\d\d\b',row[2])))
    require(set(table)==ext_ids,'QUYET_DINH external table IDs differ from external-prerequisites.json')
    for e in ext:
        if e['id'] in table:
            require(table[e['id']]==(set(e['blocksStart']),set(e['blocksAcceptance'])),f"QUYET_DINH start/acceptance columns differ from tasks.json for {e['id']}")
    contract=(ROOT/'HOP_DONG_KY_THUAT.md').read_text(encoding='utf-8')
    a1=contract.split('### A1.',1)[1].split('### A2.',1)[0]
    a2=contract.split('### A2.',1)[1].split('### A3.',1)[0]
    mondai_doc=set(re.findall(r'`([a-z_]+)` \| [^|`]*[぀-ヿ一-鿿]',a2))
    schema=read('schemas/import-v2.schema.json')
    mondai_schema=set(schema['$defs']['group']['properties']['mondaiType']['enum'])
    require(mondai_doc==mondai_schema,f"mondaiType differs between HOP_DONG A2 and import schema: {sorted(mondai_doc^mondai_schema)}")
    provenance=set(schema['$defs']['source']['properties']['provenance']['enum'])
    origin_row=re.search(r'^\| `Question\.origin` \|(.*)$',a2,re.M)
    require(bool(origin_row) and all(f'`{v}`' in origin_row.group(1) for v in provenance),'Import provenance values missing from Question.origin')
    for w in workers.values():
        for r in w['allowedRoots']:
            leaf=r.rstrip('/').split('/')[-1]
            require(leaf in a1,f"Worker root {r} missing from HOP_DONG A1 repo tree")
    timeline_fields=['groupId','mediaKey','startMs','endMs','audioStartMs','audioEndMs','gapAfterMs']
    require(set(schema['$defs']['timeline']['required'])==set(timeline_fields),'Import timeline fields changed')
    api=(ROOT/'API_V1_V4.md').read_text(encoding='utf-8')
    api_timeline=next((l for l in api.splitlines() if 'listening-timeline' in l),'')
    a5=contract.split('### A5.',1)[1].split('### A6.',1)[0]
    for name,text in [('API listening-timeline',api_timeline),('HOP_DONG A5 snapshot',a5)]:
        require(all(f in text for f in timeline_fields),f"{name} does not use the import v2 timeline shape")
    # What a missing start prerequisite would block, directly or through dependencies.
    start_impact={}
    for e in ext:
        blocked=set(e['blocksStart']);changed=True
        while changed:
            changed=False
            for t in tasks:
                if t['id'] not in blocked and blocked & set(t['dependencies']):
                    blocked.add(t['id']);changed=True
        if blocked:start_impact[e['id']]=sorted(blocked)
    manifest=read('nguon/MANIFEST.json')
    for item in manifest['files']:
        path=ROOT/item['path']
        require(path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256'],f"Source changed {item['path']}")
    result={'checkType':'static-planning-validation','scope':'ALL_V1_V4','passed':not errors,
       'sourceFeatureCount':len(features),'applicationFeatureCount':363,'externalPreparationCount':12,'inputMode':'PREPARED_IMPORT_V2_NO_OCR','sourceSubsystemCount':22,'featurePrefixCount':len({c.split('-')[0] for c in fmap}),
       'startPrerequisiteImpact':start_impact,
       'workPackageCount':len(tasks),'originalV1TaskCount':len(original_ids),'workerCount':len(workers),
       'localLinksChecked':link_count,'errors':errors,'warnings':warnings,
       'estimateOnly':{'hoursWithoutReviewRepairProviderDelay':total,'targetHours':168,
        'dailyTargetOverruns':late,'schedule':ordered},
       'productImplementationVerified':False,'runtimeImplementedInThisPackage':False}
    (ROOT/'KIEM_TRA_TAI_LIEU.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines=['# Kết quả kiểm tra bộ kế hoạch','',
        'Đây là kiểm tra tĩnh tài liệu và catalog, không chạy ứng dụng, model, provider hay runner mới.','',
        f"Kết quả: {'PASS' if not errors else 'FAIL'}. {len(features)} mã nguồn:363yêu cầu ứng dụng và12yêu cầu chuẩn bị thủ công bên ngoài;{len(tasks)} gói việc,{len(original_ids)} task V1 giữ truy vết,{len(workers)} worker;kiểm tra {link_count} liên kết nội bộ.",'',
        '## Kiểm tra','',
        '- Giữ375mã/nội dung/ưu tiên gốc;363yêu cầu có test ứng dụng,12yêu cầu trích xuất chỉ có đầu vào thủ công;matrix JSON/Markdown khớp.',
        '- Phụ thuộc tồn tại, không self-loop/cycle, ngày1–7,owner/ports/paths riêng và external IDs hợp lệ.',
        '- Khóa tài nguyên thuộc danh sách locks; outputs của task nằm trong thư mục của owner hoặc temporaryGrants.',
        '- Cột chặn bắt đầu/chặn nghiệm thu trong QUYET_DINH khớp tasks.json và external-prerequisites.json.',
        '- mondaiType và provenance của schema import khớp HOP_DONG A2; listening timeline cùng một dạng ở schema, A5 và API; thư mục worker có trong cây A1.',
        '- Task cards có acceptance/checks/artifacts,trace task V1 đầy đủ,source snapshot hashes khớp.',
        '- Yêu cầu ứng dụngTODO,phần chuẩn bị thủ côngEXTERNAL_INPUT_REQUIRED;bằng chứng rỗng,không ghi đạt giả.','',
        '## Điều kiện chặn bắt đầu','',
        'Nếu thiếu một điều kiện chặn bắt đầu, các task sau không giao được (trực tiếp hoặc qua dependency). Điều kiện chặn nghiệm thu không chặn giao việc nên không có trong bảng.','',
        '| Điều kiện | Số task bị chặn | Task |','|---|---|---|']
    lines += [f"| {k} | {len(v)} | {', '.join(v)} |" for k,v in start_impact.items()]
    lines += ['',
        '## Mô phỏng theo giả định','',
        f'Lịch greedy dependencies/worker/exclusive locks kết thúc ở giờ {total}/{168}. Đây là ước lượng lạc quan, không chứng minh đủ thời gian khi thêm review, sửa lỗi, quota, provider hoặc chờ CI.','',
        '| Task | Worker | Bắt đầu giờ | Kết thúc giờ | Mốc ngày | Trễ mốc ngày |',
        '|---|---|---|---|---|---|']
    lines += [f"| {x['taskId']} | {x['worker']} | {x['startHour']} | {x['finishHour']} | {x['plannedDay']} | {x['lateToDailyTargetHours']}h |" for x in ordered]
    lines += ['','## Điều kiện và cảnh báo','']+['- '+w for w in warnings]
    if errors:lines+=['','## Lỗi','']+['- '+e for e in errors]
    (ROOT/'KIEM_TRA_TAI_LIEU.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='estimateOnly'},ensure_ascii=False))
    print(json.dumps({'optimisticFinishHour':total,'dailyOverruns':late},ensure_ascii=False))
    return 0 if not errors else 1

if __name__=='__main__':
    sys.exit(main())
