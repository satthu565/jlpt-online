"""Behavior and adversarial tests for the local prepared-package checker."""
from pathlib import Path
import copy
import json
import tempfile
import unittest
import zipfile
from validate_import import validate, ROOT

class ImportValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.dest=Path(self.temp.name)/'package'
        self.dest.mkdir()
        self.original=json.loads((ROOT/'examples/import-v2-ready/import.json').read_text(encoding='utf-8'))
        self.obj=copy.deepcopy(self.original)
        for p in (ROOT/'examples/import-v2-ready').rglob('*'):
            if p.is_file():
                target=self.dest/p.relative_to(ROOT/'examples/import-v2-ready')
                target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(p.read_bytes())

    def check(self,mode='ready'):
        (self.dest/'import.json').write_text(json.dumps(self.obj,ensure_ascii=False),encoding='utf-8')
        return validate(self.dest,mode)

    def test_ready_folder_and_zip(self):
        self.assertTrue(self.check()['valid'])
        result=validate(ROOT/'examples/import-v2-ready.zip')
        self.assertTrue(result['valid']);self.assertFalse(result['publicationApproved'])

    def test_draft_does_not_pass_ready(self):
        path=ROOT/'examples/import-v2-draft.zip'
        self.assertTrue(validate(path,'draft')['valid'])
        self.assertFalse(validate(path,'ready')['valid'])

    def test_unknown_answer_requires_blocking_issue_even_in_draft(self):
        self.obj['groups'][0]['questions'][0]['correctOption']=None
        self.assertFalse(self.check('draft')['valid'])

    def test_count_mismatch(self):
        self.obj['exam']['totalQuestions']+=1
        self.assertFalse(self.check()['valid'])

    def test_answer_outside_option_count(self):
        self.obj['groups'][2]['questions'][0]['correctOption']=4
        self.assertFalse(self.check()['valid'])

    def test_boolean_not_integer_answer(self):
        self.obj['groups'][0]['questions'][0]['correctOption']=True
        self.assertFalse(self.check()['valid'])

    def test_hash_corruption(self):
        file=self.dest/self.obj['media'][0]['path']
        file.write_bytes(file.read_bytes()+b'corrupt')
        self.assertFalse(self.check()['valid'])

    def test_missing_media(self):
        (self.dest/self.obj['media'][0]['path']).unlink()
        self.assertFalse(self.check()['valid'])

    def test_wrong_dimensions(self):
        self.obj['media'][0]['width']=100
        self.assertFalse(self.check()['valid'])

    def test_non_nfc(self):
        self.obj['exam']['title']='e\u0301'
        self.assertFalse(self.check()['valid'])

    def test_group_reference_missing(self):
        self.obj['exam']['sections'][0]['groupIds']=['unknown']
        self.assertFalse(self.check()['valid'])

    def test_group_referenced_twice(self):
        self.obj['exam']['sections'][1]['groupIds'].append('g-vocab')
        self.assertFalse(self.check()['valid'])

    def test_question_id_duplicate(self):
        self.obj['groups'][0]['questions'][1]['id']='q-1'
        self.assertFalse(self.check()['valid'])

    def test_timeline_outside_audio(self):
        self.obj['exam']['sections'][2]['listeningTimeline'][0]['audioEndMs']=3000
        self.assertFalse(self.check()['valid'])

    def test_wrong_option_order(self):
        self.obj['groups'][0]['questions'][0]['options'].reverse()
        self.assertFalse(self.check()['valid'])

    def test_unknown_property(self):
        self.obj['approved']=True
        self.assertFalse(self.check()['valid'])

    def test_unresolved_text_cannot_pass_ready(self):
        self.obj['groups'][0]['questions'][0]['stem']=[{'t':'text','text':'[KHONG_DOC_RO]'}]
        self.assertFalse(self.check()['valid'])
        self.obj['issues']=[{'id':'text-unknown','severity':'blocking','path':'/groups/0/questions/0/stem','reason':'Chưa rõ chữ từ nguồn','sourcePages':[]}]
        self.assertTrue(self.check('draft')['valid'])

    def test_source_ref_missing(self):
        self.obj['groups'][0]['sourcePages']=[{'sourceId':'not-provided','page':1}]
        self.assertFalse(self.check()['valid'])

    def test_star_layout(self):
        self.obj['groups'][1]['questions'][0]['stem']=[{'t':'star'}]
        self.assertFalse(self.check()['valid'])

    def test_unlisted_file(self):
        (self.dest/'answers.txt').write_text('private answers',encoding='utf-8')
        self.assertFalse(self.check()['valid'])

    def test_duplicate_json_key(self):
        (self.dest/'import.json').write_text('{"formatVersion":2,"formatVersion":1}',encoding='utf-8')
        self.assertFalse(validate(self.dest)['valid'])

    def test_zip_path_traversal(self):
        archive=Path(self.temp.name)/'bad.zip'
        with zipfile.ZipFile(archive,'w') as z:
            z.writestr('../escape.txt','no')
            z.writestr('import.json',json.dumps(self.obj))
        self.assertFalse(validate(archive)['valid'])

    def test_zip_case_collision(self):
        archive=Path(self.temp.name)/'bad-case.zip'
        with zipfile.ZipFile(archive,'w') as z:
            z.writestr('import.json',json.dumps(self.obj))
            z.writestr('IMPORT.JSON',json.dumps(self.obj))
        self.assertFalse(validate(archive)['valid'])

    def test_utterance_listening_group_accepted(self):
        group=next(g for g in self.obj['groups'] if g['sectionCode']=='listening')
        group['mondaiType']='utterance'
        self.assertTrue(self.check()['valid'])

    def test_unknown_mondai_type_rejected(self):
        self.obj['groups'][0]['mondaiType']='made_up_type'
        self.assertFalse(self.check()['valid'])

    def test_third_party_provenance_accepted_and_other_rejected(self):
        self.obj['source']['provenance']='third_party'
        self.assertTrue(self.check()['valid'])
        self.obj['source']['provenance']='other'
        self.assertFalse(self.check()['valid'])

if __name__=='__main__':unittest.main()
