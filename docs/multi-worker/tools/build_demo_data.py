"""Build the self-authored demo exam package(s) in demo-data/. Never reads a PDF.

  py tools/build_demo_data.py --scripts   write demo-data/audio/scripts.json (SSML per listening group)
  powershell -File tools/tts_demo_audio.ps1   render scripts.json to WAV (Windows, voice Haruka)
  py tools/build_demo_data.py             build demo-data/<slug>/ and <slug>.zip from the WAVs

Content is written for testing the product end to end. It is not a real JLPT exam and the
blueprint is synthetic; owner data replaces it later through the same import flow.
"""
from pathlib import Path
import hashlib
import json
import math
import sys
import wave
import zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'demo-data'
AUDIO=OUT/'audio'

def t(value):return [{'t':'text','text':value}]
def u(value):return {'t':'underline','children':t(value)}
def ruby(text,rt):return {'t':'ruby','text':text,'rt':rt}
def para(*segments):return {'type':'paragraph','content':list(segments)}
def expl(*lines):return {'locale':'vi','blocks':[para(*t(line)) for line in lines]}

def q(id,number,skill,stem,options,answer,*why):
    return {'id':id,'number':str(number),'skill':skill,'stem':stem,
            'options':[{'label':str(i+1),'content':o if isinstance(o,list) else t(o)} for i,o in enumerate(options)],
            'correctOption':answer,'sourcePages':[],'explanation':expl(*why)}

def group(id,section,mondai,order,instructions,questions,passage=(),transcript=None):
    return {'id':id,'sectionCode':section,'mondaiType':mondai,'orderInSection':order,'instructions':t(instructions),
            'passage':list(passage),'mediaKeys':[],'sourcePages':[],'questions':questions,'transcript':transcript}

V,G,L='language_vocab','language_grammar_reading','listening'

# ---------------------------------------------------------------- N5 demo 1
N5_GROUPS=[
  group('g-kanji',V,'kanji_reading',1,'＿＿の ことばは ひらがなで どう かきますか。',[
    q('q-01',1,'kanji',[u('山'),{'t':'text','text':'に のぼります。'}],['やま','かわ','うみ','そら'],1,
      '山 đọc là やま (núi). かわ là sông, うみ là biển, そら là bầu trời.'),
    q('q-02',2,'kanji',[u('先週'),{'t':'text','text':' デパートへ 行きました。'}],['せんしゅ','せんしゅう','ぜんしゅう','さきしゅう'],2,
      '先週 đọc là せんしゅう (tuần trước). Chú ý trường âm しゅう, không phải しゅ.'),
    q('q-03',3,'kanji',[{'t':'text','text':'この りんごは '},u('安い'),{'t':'text','text':'です。'}],['たかい','あまい','やすい','ひくい'],3,
      '安い đọc là やすい (rẻ). たかい là đắt/cao, あまい là ngọt, ひくい là thấp.'),
    q('q-04',4,'kanji',[{'t':'text','text':'まいあさ '},u('七時'),{'t':'text','text':'に おきます。'}],['ななじ','ひちじ','しちとき','しちじ'],4,
      '七時 đọc là しちじ (7 giờ). Khi nói giờ, 7 đọc là しち, không đọc なな.'),
  ]),
  group('g-ortho',V,'orthography',2,'＿＿の ことばは どう かきますか。',[
    q('q-05',5,'vocabulary',[u('みみ'),{'t':'text','text':'が いたいです。'}],['目','耳','口','手'],2,
      'みみ là 耳 (tai). 目 là mắt (め), 口 là miệng (くち), 手 là tay (て).'),
    q('q-06',6,'vocabulary',[u('らいねん'),{'t':'text','text':' 日本へ 行きます。'}],['来月','来週','来年','今年'],3,
      'らいねん là 来年 (năm sau). 来月 = tháng sau, 来週 = tuần sau, 今年 = năm nay.'),
    q('q-07',7,'vocabulary',[{'t':'text','text':'わたしの へやは '},u('ひろい'),{'t':'text','text':'です。'}],['広い','古い','長い','高い'],1,
      'ひろい là 広い (rộng). 古い = cũ, 長い = dài, 高い = cao/đắt.'),
  ]),
  group('g-context',V,'contextual',3,'（　）に なにを いれますか。いちばん いい ものを えらんで ください。',[
    q('q-08',8,'vocabulary',t('さむいですから、まどを（　）ください。'),['あけて','しめて','つけて','けして'],2,
      'Vì lạnh nên "hãy đóng cửa sổ": まどを しめて ください. あける là mở, つける/けす dùng cho đèn, máy.'),
    q('q-09',9,'vocabulary',t('きのうは あたまが いたかったので、（　）を のみました。'),['くすり','ごはん','せっけん','しゃしん'],1,
      'Đau đầu nên uống thuốc: くすりを のむ. Tiếng Nhật dùng động từ のむ (uống) cho thuốc.'),
    q('q-10',10,'vocabulary',t('この ほんは（　）ですから、だれも よみません。'),['おもしろい','あたらしい','つまらない','やさしい'],3,
      'Không ai đọc vì sách "chán": つまらない. Ba lựa chọn còn lại là lý do để đọc sách.'),
  ]),
  group('g-paraphrase',V,'paraphrase',4,'＿＿の ぶんと だいたい おなじ いみの ぶんが あります。いちばん いい ものを えらんで ください。',[
    q('q-11',11,'vocabulary',[u('きょうは いそがしくないです。')],
      ['きょうは しごとが おおいです。','きょうは やすみでは ありません。','きょうは ひまです。','きょうは つかれました。'],3,
      'いそがしくない (không bận) gần nghĩa nhất với ひまです (rảnh).'),
    q('q-12',12,'vocabulary',[u('あには にほんごの せんせいです。')],
      ['あには にほんごを ならって います。','あには にほんごを おしえて います。','あには にほんごが わかりません。','あには にほんへ いきます。'],2,
      'Anh trai là giáo viên tiếng Nhật, tức là anh ấy dạy tiếng Nhật: おしえて います. ならう là học.'),
  ]),
  group('g-grammar',G,'grammar_form',1,'（　）に なにを いれますか。いちばん いい ものを えらんで ください。',[
    q('q-13',13,'grammar',t('わたしは まいばん 10時（　）ねます。'),['で','を','が','に'],4,
      'Thời điểm cụ thể dùng trợ từ に: 10時に ねます (ngủ lúc 10 giờ).'),
    q('q-14',14,'grammar',t('きのうは あめが（　）。'),['ふりました','ふります','ふって','ふる'],1,
      'Có きのう (hôm qua) nên động từ chia quá khứ: ふりました.'),
    q('q-15',15,'grammar',t('A「いっしょに ひるごはんを（　）か。」B「ええ、たべましょう。」'),['たべました','たべて','たべません','たべない'],3,
      '〜ませんか dùng để rủ rê: たべませんか (cùng ăn nhé?). B đồng ý bằng たべましょう.'),
    q('q-16',16,'grammar',t('この へやは しずか（　）きれいです。'),['くて','で','に','と'],2,
      'Nối hai tính từ: tính từ đuôi な dùng で (しずかで きれい). くて dùng cho tính từ đuôi い.'),
  ]),
  group('g-order',G,'sentence_composition',2,'★に 入る ものは どれですか。いちばん いい ものを えらんで ください。',[
    q('q-17',17,'grammar',[{'t':'text','text':'つくえの '},{'t':'blank'},{'t':'blank'},{'t':'star'},{'t':'blank'},{'t':'text','text':' あります。'}],
      ['ほん','うえ','が','に'],1,
      'Câu đúng: つくえの うえ に ほん が あります (Trên bàn có quyển sách). Ô ★ là ほん.'),
    q('q-18',18,'grammar',[{'t':'text','text':'きのう '},{'t':'blank'},{'t':'blank'},{'t':'star'},{'t':'blank'},{'t':'text','text':' かいました。'}],
      ['くつを','あかい','で','デパート'],2,
      'Câu đúng: きのう デパート で あかい くつを かいました (Hôm qua mua giày đỏ ở bách hóa). Ô ★ là あかい.'),
  ]),
  group('g-short',G,'comprehension_short',3,'つぎの ぶんしょうを よんで、しつもんに こたえて ください。',[
    q('q-19',19,'reading',t('先週の 土曜日、「わたし」は 何を しましたか。'),
      ['テニスを しました。','友だちの 家で えいがを 見ました。','ひとりで 家に いました。','雨の 中で さんぽしました。'],2,
      'Bài viết: thứ Bảy tuần trước trời mưa nên không chơi tennis, mà xem phim ở nhà bạn.'),
    q('q-20',20,'reading',t('「わたし」は 来週 何を したいですか。'),
      ['えいがを 見たいです。','テニスを したいです。','友だちの 家へ 行きたいです。','雨の 日に 出かけたいです。'],2,
      'Câu cuối "来週は 天気が いいと いいです" cho thấy người viết muốn trời đẹp để chơi tennis như mọi tuần.'),
  ], passage=[para({'t':'text','text':'わたしは '},ruby('毎週','まいしゅう'),{'t':'text','text':' '},ruby('土曜日','どようび'),
      {'t':'text','text':'に 友だちと テニスを します。でも、'},ruby('先週','せんしゅう'),{'t':'text','text':'の 土曜日は 雨でしたから、テニスを しませんでした。'},
      {'t':'br'},{'t':'text','text':'友だちの 家で いっしょに えいがを 見ました。とても おもしろかったです。'},
      {'t':'br'},ruby('来週','らいしゅう'),{'t':'text','text':'は '},ruby('天気','てんき'),{'t':'text','text':'が いいと いいです。'})]),
  group('g-info',G,'info_retrieval',4,'右の ページを 見て、しつもんに こたえて ください。',[
    q('q-21',21,'reading',t('としょかんが 休みなのは 何曜日ですか。'),['月曜日','火曜日','土曜日','日曜日'],1,
      'Bảng ghi 月曜日: やすみ, nên thư viện nghỉ thứ Hai.'),
    q('q-22',22,'reading',t('水曜日は 何時に しまりますか。'),['9:00','10:00','17:00','19:00'],4,
      'Thứ Tư thuộc 火〜金曜日, mở 9:00〜19:00, nên đóng cửa lúc 19:00.'),
  ], passage=[para(*t('さくら としょかん')),
      {'type':'table','rows':[[t('曜日'),t('時間')],[t('月曜日'),t('やすみ')],[t('火曜日〜金曜日'),t('9:00〜19:00')],[t('土曜日・日曜日'),t('10:00〜17:00')]]}]),
]

# Listening: segments are (speaker, text); N narrator, F woman, M man. Options are printed and,
# for quick_response, also read aloud as in the real format.
N5_LISTENING=[
  ('g-task1','task_based',1,'もんだい1では、はじめに しつもんを きいて ください。それから はなしを きいて、いちばん いい ものを えらんで ください。',
   [('N','1ばん。男の人と 女の人が 話しています。男の人は 何を 買いますか。'),
    ('F','すみません、パンと 牛乳を 買って きて ください。'),('M','パンと 牛乳ですね。たまごは？'),
    ('F','たまごは まだ ありますから、いりません。あ、りんごも 三つ おねがいします。'),('M','わかりました。'),
    ('N','男の人は 何を 買いますか。')],
   q('q-23',23,'listening',t('男の人は 何を 買いますか。'),['パンと 牛乳','パンと 牛乳と りんご','牛乳と たまご','パンと たまごと りんご'],2,
     'Người nữ nhờ mua bánh mì, sữa, và thêm 3 quả táo; trứng thì vẫn còn nên không cần.')),
  ('g-task2','task_based',2,'もんだい1では、はじめに しつもんを きいて ください。それから はなしを きいて、いちばん いい ものを えらんで ください。',
   [('N','2ばん。先生が 学生に 話しています。学生は あした 何時に 学校に 来ますか。'),
    ('M','あしたは 九時から テストが あります。テストの 前に きょうしつを じゅんびしますから、十五分 前に 来て ください。'),
    ('N','学生は あした 何時に 学校に 来ますか。')],
   q('q-24',24,'listening',t('学生は あした 何時に 学校に 来ますか。'),['8時','8時45分','9時','9時15分'],2,
     'Bài thi bắt đầu lúc 9 giờ, thầy dặn đến sớm 15 phút, tức 8 giờ 45.')),
  ('g-point1','point',3,'もんだい2では、はじめに しつもんを きいて ください。それから はなしを きいて、いちばん いい ものを えらんで ください。',
   [('N','1ばん。女の人と 男の人が 話しています。女の人は きのうの ごご どこへ 行きましたか。'),
    ('M','きのうは 何を しましたか。'),
    ('F','ごぜんは 家で そうじを しました。ごごは 友だちと こうえんへ 行く つもりでしたが、雨が ふりましたから、えいがかんへ 行きました。'),
    ('N','女の人は きのうの ごご どこへ 行きましたか。')],
   q('q-25',25,'listening',t('女の人は きのうの ごご どこへ 行きましたか。'),['家','こうえん','えいがかん','友だちの 家'],3,
     'Định đi công viên nhưng trời mưa nên chiều hôm qua người nữ đi rạp chiếu phim.')),
  ('g-point2','point',4,'もんだい2では、はじめに しつもんを きいて ください。それから はなしを きいて、いちばん いい ものを えらんで ください。',
   [('N','2ばん。男の人が 話しています。男の人の かぞくは 何人ですか。'),
    ('M','わたしの かぞくは 父と 母と 姉と わたしです。姉は きょねん けっこんして、いまは 東京に すんでいます。'),
    ('N','男の人の かぞくは 何人ですか。')],
   q('q-26',26,'listening',t('男の人の かぞくは 何人ですか。'),['3人','4人','5人','6人'],2,
     'Gia đình gồm bố, mẹ, chị gái và người nói: 4 người. Chị đã lấy chồng nhưng vẫn được kể trong gia đình.')),
  ('g-quick1','quick_response',5,'もんだい3では、ぶんを きいて、1から3の 中から、いちばん いい ものを えらんで ください。',
   [('N','1ばん。'),('F','すみません、いま 何時ですか。'),('N','1、はい、そうです。2、三時半です。3、三時間です。')],
   q('q-27',27,'listening',t('（ぶんを きいて こたえて ください）'),['はい、そうです。','三時半です。','三時間です。'],2,
     'Hỏi "bây giờ mấy giờ" thì trả lời giờ: 三時半です. 三時間 là khoảng thời gian 3 tiếng.')),
  ('g-quick2','quick_response',6,'もんだい3では、ぶんを きいて、1から3の 中から、いちばん いい ものを えらんで ください。',
   [('N','2ばん。'),('M','いただきます。'),('N','1、どうぞ、めしあがって ください。2、ごちそうさまでした。3、いってらっしゃい。')],
   q('q-28',28,'listening',t('（ぶんを きいて こたえて ください）'),['どうぞ、めしあがって ください。','ごちそうさまでした。','いってらっしゃい。'],1,
     'Khi khách nói いただきます trước bữa ăn, chủ nhà đáp どうぞ、めしあがって ください (xin mời dùng).')),
  ('g-quick3','quick_response',7,'もんだい3では、ぶんを きいて、1から3の 中から、いちばん いい ものを えらんで ください。',
   [('N','3ばん。'),('F','この かさ、だれのですか。'),('N','1、あそこです。2、あおいです。3、わたしのです。')],
   q('q-29',29,'listening',t('（ぶんを きいて こたえて ください）'),['あそこです。','あおいです。','わたしのです。'],3,
     'Hỏi "cái ô này của ai" thì trả lời chủ sở hữu: わたしのです (của tôi).')),
]

N5_BLUEPRINT={
  'id':'synthetic-n5-demo','level':'N5','version':1,'effectiveFrom':'2026-10','sourceRef':[],
  'note':'Blueprint synthetic chỉ dùng cho đề demo tự soạn; số câu, thời gian và thang điểm không phải của JLPT chính thức.',
  'sections':[
    {'code':V,'title':'言語知識（文字・語彙）','durationSec':600,'mondai':[
      {'type':'kanji_reading','skill':'kanji','questionCount':4},{'type':'orthography','skill':'vocabulary','questionCount':3},
      {'type':'contextual','skill':'vocabulary','questionCount':3},{'type':'paraphrase','skill':'vocabulary','questionCount':2}]},
    {'code':G,'title':'言語知識（文法）・読解','durationSec':900,'mondai':[
      {'type':'grammar_form','skill':'grammar','questionCount':4},{'type':'sentence_composition','skill':'grammar','questionCount':2},
      {'type':'comprehension_short','skill':'reading','questionCount':2},{'type':'info_retrieval','skill':'reading','questionCount':2}]},
    {'code':L,'title':'聴解','durationSec':None,'mondai':[
      {'type':'task_based','skill':'listening','questionCount':2},{'type':'point','skill':'listening','questionCount':2},
      {'type':'quick_response','skill':'listening','questionCount':3}]},
  ],
  'scoring':{'method':'linear_reference','rounding':'round','scoringSections':[
      {'code':'language','label':'言語知識（文字・語彙・文法）・読解','skills':['kanji','vocabulary','grammar','reading'],'maxScaled':120,'minPass':38},
      {'code':'listening','label':'聴解','skills':['listening'],'maxScaled':60,'minPass':19}],
    'totalMax':180,'totalPass':80},
}

def ssml(segments):
    voice={'N':'','F':'','M':'<prosody pitch="x-low" rate="-5%">'}
    parts=[]
    for who,text in segments:
        body=text.replace('&','&amp;').replace('<','&lt;')
        parts.append(f'{voice[who]}{body}{"</prosody>" if voice[who] else ""}<break time="900ms"/>')
    return ('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">'
            '<voice name="Microsoft Haruka Desktop">'+''.join(parts)+'</voice></speak>')

def wav_ms(data):
    import io
    with wave.open(io.BytesIO(data)) as w:return math.ceil(w.getnframes()*1000/w.getframerate())

def build_n5():
    groups=[dict(g) for g in N5_GROUPS]
    media=[];timeline=[];clock=0
    for gid,mondai,order,instructions,segments,question in N5_LISTENING:
        data=(AUDIO/f'{gid}.wav').read_bytes()
        h=hashlib.sha256(data).hexdigest();key=f'media/{h}.wav';ms=wav_ms(data)
        media.append(({'path':key,'sha256':h,'mimeType':'audio/wav','durationMs':ms,'width':None,'height':None},data))
        gap=6000 if mondai=='quick_response' else 10000
        timeline.append({'groupId':gid,'mediaKey':key,'startMs':clock,'endMs':clock+ms,'audioStartMs':0,'audioEndMs':ms,'gapAfterMs':gap})
        clock+=ms+gap
        g=group(gid,L,mondai,order,instructions,[question],transcript=[s for who,text in segments for s in (t(text)+[{'t':'br'}])][:-1])
        g['mediaKeys']=[key]
        groups.append(g)
    listen_sec=math.ceil(clock/1000)
    sections=[]
    for s in N5_BLUEPRINT['sections']:
        ids=[g['id'] for g in groups if g['sectionCode']==s['code']]
        sections.append({'code':s['code'],'title':s['title'],'durationSec':s['durationSec'] or listen_sec,'groupIds':ids,
                         'listeningTimeline':timeline if s['code']==L else []})
    total=sum(len(g['questions']) for g in groups)
    package={'formatVersion':2,'packageId':'6f1c2a10-5d3e-4b7a-9c21-0a0000000501','revision':1,
      'source':{'name':'Đề demo tự soạn để thử sản phẩm, không phải đề JLPT thật','level':'N5','year':None,'session':None,
                'provenance':'self_authored','licenseRef':'self-authored-demo','rightsStatus':'owner_confirmed'},
      'sourceFiles':[],
      'exam':{'title':'Đề demo N5 số 1 (tự soạn)','slug':'demo-n5-1','kind':'practice',
              'blueprintRef':{'id':N5_BLUEPRINT['id'],'version':N5_BLUEPRINT['version']},'totalQuestions':total,'sections':sections},
      'groups':groups,'media':[m for m,_ in media],'issues':[]}
    blueprint=json.loads(json.dumps(N5_BLUEPRINT))
    blueprint['sections'][2]['durationSec']=listen_sec
    return package,{m['path']:d for m,d in media},blueprint

def write_package(slug,package,media):
    # The ZIP is the package; the loose import.json is only for reading diffs (media lives in audio/).
    files={'import.json':(json.dumps(package,ensure_ascii=False,indent=2)+'\n').encode('utf-8'),**media}
    (OUT/f'{slug}.import.json').write_bytes(files['import.json'])
    with zipfile.ZipFile(OUT/f'{slug}.zip','w',zipfile.ZIP_DEFLATED) as bundle:
        for path,data in sorted(files.items()):
            info=zipfile.ZipInfo(path,date_time=(2026,10,15,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            bundle.writestr(info,data)

def main():
    if '--scripts' in sys.argv:
        AUDIO.mkdir(parents=True,exist_ok=True)
        items=[{'name':gid,'ssml':ssml(segments)} for gid,_,_,_,segments,_ in N5_LISTENING]
        (AUDIO/'scripts.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(f'Wrote {len(items)} SSML scripts to {AUDIO/"scripts.json"}')
        return
    package,media,blueprint=build_n5()
    write_package('demo-n5-1',package,media)
    bp=OUT/'blueprints';bp.mkdir(parents=True,exist_ok=True)
    (bp/f'{blueprint["id"]}-v{blueprint["version"]}.json').write_text(json.dumps(blueprint,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'demo-n5-1: {package["exam"]["totalQuestions"]} câu, nghe {package["exam"]["sections"][2]["durationSec"]}s, {len(media)} audio')

if __name__=='__main__':main()
