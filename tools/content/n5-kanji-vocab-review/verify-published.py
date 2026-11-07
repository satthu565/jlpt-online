"""Read-only before/after proof for published snapshots, keys and immutable rows."""
import hashlib,json,os,pathlib,subprocess,sys
mode=sys.argv[1];assert mode in ('baseline','verify')
op=pathlib.Path(os.environ['N5_REPAIR_DIR']);root=pathlib.Path('/var/lib/docker/volumes/jlpt-demo_staging-storage-data/_data')
manifest=json.loads((pathlib.Path(__file__).parent/'manifest.json').read_text())
def query(sql):
 value=subprocess.check_output(['docker','exec','jlpt-staging-postgres','psql','-U','jlpt','-d','jlpt_staging','-Atq','-c','BEGIN READ ONLY; '+sql+'; COMMIT;'],text=True)
 return json.loads(value)
def save(name,value):
 file=op/name;file.write_text(json.dumps(value,ensure_ascii=False));file.chmod(0o600)
def hashfile(f):return hashlib.sha256(f.read_bytes()).hexdigest()
def rows():
 return query("""SELECT json_object_agg(k,h) FROM (
 SELECT 'qv:'||v.question_id||':'||v.version k,md5(row_to_json(v)::text) h FROM question_versions v JOIN questions q ON q.id=v.question_id WHERE q.level='N5'
 UNION ALL SELECT 'opt:'||v.question_id||':'||v.question_version||':'||v.order_index,md5(row_to_json(v)::text) FROM answer_options v JOIN questions q ON q.id=v.question_id WHERE q.level='N5'
 UNION ALL SELECT 'ans:'||v.question_id||':'||v.question_version,md5(row_to_json(v)::text) FROM correct_answers v JOIN questions q ON q.id=v.question_id WHERE q.level='N5'
 UNION ALL SELECT 'key:'||v.exam_id||':'||v.version,md5(row_to_json(v)::text) FROM exam_answer_keys v JOIN exams e ON e.id=v.exam_id WHERE e.level='N5'
 UNION ALL SELECT 'examv:'||v.exam_id||':'||v.version,md5(row_to_json(v)::text) FROM exam_versions v JOIN exams e ON e.id=v.exam_id WHERE e.level='N5'
 UNION ALL SELECT 'groupv:'||v.group_id||':'||v.version,md5(row_to_json(v)::text) FROM question_group_versions v JOIN question_groups g ON g.id=v.group_id WHERE g.level='N5'
 UNION ALL SELECT 'explanation:'||v.id,md5(row_to_json(v)::text) FROM explanation_versions v JOIN questions q ON q.id=v.question_id WHERE q.level='N5'
 ) t""")
exams=query("""SELECT json_agg(json_build_object('id',e.id,'slug',e.slug,'version',e.published_version,'key',k.keys) ORDER BY e.slug) FROM exams e JOIN exam_answer_keys k ON k.exam_id=e.id AND k.version=e.published_version WHERE e.level='N5' AND e.deleted_at IS NULL""")
if mode=='baseline':
 assert not (op/'immutable-baseline.json').exists()
 snapshots={};manifests={};files={}
 assert len(exams)==manifest['scope']['exams']
 for e in exams:
  directory=root/'exams'/e['id'];snapshots[e['slug']]=json.loads((directory/f"v{e['version']}"/'snapshot.json').read_text())
  manifests[e['slug']]=json.loads((directory/f"v{e['version']}"/'manifest.json').read_text())
  for f in directory.rglob('*.json'):files[str(f)]=hashfile(f)
 save('immutable-baseline.json',{'exams':exams,'snapshots':snapshots,'manifests':manifests,'files':files,'rows':rows()})
 print(json.dumps({'baseline':True,'exams':len(exams),'files':len(files)}))
else:
 baseline=json.loads((op/'immutable-baseline.json').read_text());changed={f['slug'] for f in manifest['fixes']};before={e['slug']:e for e in baseline['exams']};patches={f['questionId']:f for f in manifest['fixes']};checked=0;keychanges=[]
 for e in exams:
  old=before[e['slug']];expected=old['version']+(1 if e['slug'] in changed else 0);assert e['version']==expected,(e['slug'],'unexpected version')
  snap=json.loads((root/'exams'/e['id']/f"v{e['version']}"/'snapshot.json').read_text());orig=baseline['snapshots'][e['slug']]
  expected_snap=json.loads(json.dumps(orig));expected_snap['version']=expected
  for sec in expected_snap['sections']:
   for group in sec['groups']:
    for q in group['questions']:
     fix=patches.get(q['questionId'])
     if fix:
      assert q['stem']==fix['before']['stem'];assert [o['content'] for o in q['options']]==[o['content'] for o in fix['before']['options']]
      q['stem']=fix['after']['stem']
      for o,new in zip(q['options'],fix['after']['options']):
       o['content']=new['content']
       for node in new['content']:
        if node.get('t')=='image' and node['mediaKey'] not in group['media']:
         group['media'].append(node['mediaKey'])
      checked+=1
  assert snap==expected_snap,(e['slug'],'unexpected public snapshot change')
  new_manifest=json.loads((root/'exams'/e['id']/f"v{e['version']}"/'manifest.json').read_text())
  expected_manifest=json.loads(json.dumps(baseline['manifests'][e['slug']]))
  expected_manifest['version']=expected
  expected_media=set(expected_manifest['media'])|{a['mediaKey'] for a in manifest['media'] if a['slug']==e['slug']}
  assert set(new_manifest['media'])==expected_media and len(new_manifest['media'])==len(expected_media)
  expected_manifest['media']=new_manifest['media']
  assert new_manifest==expected_manifest,(e['slug'],'unexpected exam manifest change')
  assert len(e['key'])==len(old['key'])
  for index,(x,y) in enumerate(zip(old['key'],e['key'])):
   if x!=y:keychanges.append((e['slug'],index+1,x,y))
 assert keychanges==[],keychanges
 for file,digest in baseline['files'].items():assert hashfile(pathlib.Path(file))==digest,('old file changed',file)
 current=rows()
 for key,digest in baseline['rows'].items():assert current.get(key)==digest,('old database row changed',key)
 assert checked==len(patches)
 result={'verified':True,'exams':len(exams),'correctedQuestions':checked,'newExamVersions':len(changed),'answerChanges':keychanges,'oldFilesPreserved':len(baseline['files']),'oldRowsPreserved':len(baseline['rows'])}
 save('published-verification.json',result);print(json.dumps(result))
