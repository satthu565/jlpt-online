import {
  PublicExamSnapshotSchema,
  ExamSummarySchema,
  type PublicExamSnapshot,
  type ExamSummary,
} from '@jlpt/schema';

export const SAMPLE_N1_EXAM_SNAPSHOT: PublicExamSnapshot = PublicExamSnapshotSchema.parse({
  schemaVersion: 1,
  examId: '0192f000-0000-7000-8000-000000000001',
  version: 1,
  level: 'N1',
  title: 'Đề thi chính thức JLPT N1 - Kỳ thi 12/2023',
  kind: 'original',
  totalQuestions: 6,
  sections: [
    {
      index: 0,
      code: 'language_reading',
      title: 'Kiến thức ngôn ngữ & Đọc hiểu (言語知識・読解)',
      durationSec: 6600, // 110 minutes
      questionRange: [0, 3],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000001',
          mondaiType: 'kanji_reading',
          instructions: [{ t: 'text', text: '____の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 0,
              questionId: '0192f000-2000-7000-8000-000000000001',
              number: '1',
              stem: [
                { t: 'text', text: '新政策の実施に伴い、様々な問題が' },
                { t: 'underline', children: [{ t: 'ruby', text: '惹起', rt: 'じゃっき' }] },
                { t: 'text', text: 'された。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'じゃっき' }] },
                { label: '2', content: [{ t: 'text', text: 'じゃくき' }] },
                { label: '3', content: [{ t: 'text', text: 'しょうき' }] },
                { label: '4', content: [{ t: 'text', text: 'ちゅうき' }] },
              ],
            },
            {
              index: 1,
              questionId: '0192f000-2000-7000-8000-000000000002',
              number: '2',
              stem: [
                { t: 'text', text: 'この法律の改正には' },
                { t: 'underline', children: [{ t: 'ruby', text: '慎重', rt: 'しんちょう' }] },
                { t: 'text', text: 'な審議が求められる。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'しんちょう' }] },
                { label: '2', content: [{ t: 'text', text: 'じんちょう' }] },
                { label: '3', content: [{ t: 'text', text: 'しんじゅう' }] },
                { label: '4', content: [{ t: 'text', text: 'じんじゅう' }] },
              ],
            },
          ],
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000002',
          mondaiType: 'sentence_composition',
          instructions: [{ t: 'text', text: '★に入る最もよいものを、1・2・3・4から一つ選びなさい。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 2,
              questionId: '0192f000-2000-7000-8000-000000000003',
              number: '3',
              stem: [
                { t: 'text', text: 'いくら能力が優秀であろうと、' },
                { t: 'blank' },
                { t: 'blank' },
                { t: 'star' },
                { t: 'blank' },
                { t: 'text', text: ' 信用されない。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: '誠実さに' }] },
                { label: '2', content: [{ t: 'text', text: '欠けるようでは' }] },
                { label: '3', content: [{ t: 'text', text: '社会人として' }] },
                { label: '4', content: [{ t: 'text', text: '到底' }] },
              ],
            },
          ],
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000003',
          mondaiType: 'comprehension_short',
          instructions: [{ t: 'text', text: '次の文章を読んで、後の問いに対する答えとして最もよいものを一つ選びなさい。' }],
          passage: [
            {
              type: 'paragraph',
              content: [
                {
                  t: 'text',
                  text: '現代社会において批判的思考（クリティカルシンキング）の重要性が叫ばれている。それは単に他者の主張の欠点を探すことではなく、自分自身の偏見や前提をも客観的に見つめ直し、合理的な結論を導く姿勢である。',
                },
              ],
            },
          ],
          media: [],
          questions: [
            {
              index: 3,
              questionId: '0192f000-2000-7000-8000-000000000004',
              number: '4',
              stem: [{ t: 'text', text: '筆者が考える批判的思考とはどのようなものか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: '他者の主張の誤りを鋭く指摘する技術' }] },
                { label: '2', content: [{ t: 'text', text: '自らの前提も含めて客観的に再検討する姿勢' }] },
                { label: '3', content: [{ t: 'text', text: 'どんな意見に対しても疑いを持つこと' }] },
                { label: '4', content: [{ t: 'text', text: '合理性よりも個人の直感を重んじる考え方' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: null,
    },
    {
      index: 1,
      code: 'listening',
      title: 'Nghe hiểu (聴解)',
      durationSec: 3600, // 60 minutes
      questionRange: [4, 5],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000004',
          mondaiType: 'task_based',
          instructions: [{ t: 'text', text: '問題を聞いて、これから何をしなければならないか選びなさい。' }],
          passage: null,
          media: ['media/n1_listening_task.mp3', 'media/n1_diagram.webp'],
          questions: [
            {
              index: 4,
              questionId: '0192f000-2000-7000-8000-000000000005',
              number: '5',
              stem: [{ t: 'text', text: '男の人はこの後、まず何をしますか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: '企画書の修正を行う' }] },
                { label: '2', content: [{ t: 'text', text: '取引先へ連絡する' }] },
                { label: '3', content: [{ t: 'text', text: '会議室の予約を取る' }] },
                { label: '4', content: [{ t: 'text', text: '予算の見積もりを計算する' }] },
              ],
            },
          ],
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000005',
          mondaiType: 'quick_response',
          instructions: [{ t: 'text', text: '短い発話を聞いて、最も適切な返答を一つ選びなさい。' }],
          passage: null,
          media: ['media/n1_listening_quick.mp3'],
          questions: [
            {
              index: 5,
              questionId: '0192f000-2000-7000-8000-000000000006',
              number: '6',
              stem: [{ t: 'text', text: '発話に対する適切な応答を選びなさい。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'お引き受けいただき恐縮です。' }] },
                { label: '2', content: [{ t: 'text', text: 'ご配慮ありがとうございます。' }] },
                { label: '3', content: [{ t: 'text', text: 'こちらこそお世話になっております。' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: [
        {
          groupId: '0192f000-1000-7000-8000-000000000004',
          mediaKey: 'media/n1_listening_task.mp3',
          startMs: 0,
          endMs: 30000,
          audioStartMs: 0,
          audioEndMs: 30000,
          gapAfterMs: 5000,
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000005',
          mediaKey: 'media/n1_listening_quick.mp3',
          startMs: 35000,
          endMs: 50000,
          audioStartMs: 0,
          audioEndMs: 15000,
          gapAfterMs: 5000,
        },
      ],
    },
  ],
});

export const SAMPLE_N2_EXAM_SNAPSHOT: PublicExamSnapshot = PublicExamSnapshotSchema.parse({
  schemaVersion: 1,
  examId: '0192f000-0000-7000-8000-000000000002',
  version: 1,
  level: 'N2',
  title: 'Đề thi chính thức JLPT N2 - Kỳ thi 07/2023',
  kind: 'original',
  totalQuestions: 5,
  sections: [
    {
      index: 0,
      code: 'language_reading',
      title: 'Kiến thức ngôn ngữ & Đọc hiểu (言語知識・読解)',
      durationSec: 6300, // 105 minutes
      questionRange: [0, 2],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000011',
          mondaiType: 'kanji_reading',
          instructions: [{ t: 'text', text: '____の言葉の読み方として最もよいものを一つ選びなさい。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 0,
              questionId: '0192f000-2000-7000-8000-000000000011',
              number: '1',
              stem: [
                { t: 'text', text: 'この地域の気候は農業に' },
                { t: 'underline', children: [{ t: 'ruby', text: '適して', rt: 'てきして' }] },
                { t: 'text', text: 'いる。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'てきして' }] },
                { label: '2', content: [{ t: 'text', text: 'おうじて' }] },
                { label: '3', content: [{ t: 'text', text: 'そくして' }] },
                { label: '4', content: [{ t: 'text', text: 'たいして' }] },
              ],
            },
            {
              index: 1,
              questionId: '0192f000-2000-7000-8000-000000000012',
              number: '2',
              stem: [
                { t: 'text', text: '古い習慣を' },
                { t: 'underline', children: [{ t: 'ruby', text: '打破', rt: 'だは' }] },
                { t: 'text', text: 'する新しい試みだ。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'だは' }] },
                { label: '2', content: [{ t: 'text', text: 'だかい' }] },
                { label: '3', content: [{ t: 'text', text: 'とは' }] },
                { label: '4', content: [{ t: 'text', text: 'とかい' }] },
              ],
            },
          ],
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000012',
          mondaiType: 'comprehension_short',
          instructions: [{ t: 'text', text: '次の文章を読んで、後の問いに対する答えとして最もよいものを一つ選びなさい。' }],
          passage: [
            {
              type: 'paragraph',
              content: [
                {
                  t: 'text',
                  text: '効率性ばかりを追求する職場では、一見無駄に見える雑談の価値が見落とされがちだ。しかし雑談こそがチームの心理的安全性を生み出し、予期せぬアイデアの源泉となる。',
                },
              ],
            },
          ],
          media: [],
          questions: [
            {
              index: 2,
              questionId: '0192f000-2000-7000-8000-000000000013',
              number: '3',
              stem: [{ t: 'text', text: '筆者が言いたいこととして最も適切なものはどれか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: '業務効率化のために雑談は一切禁止すべきだ' }] },
                { label: '2', content: [{ t: 'text', text: '雑談にはチームの連携や発想を促す重要な役割がある' }] },
                { label: '3', content: [{ t: 'text', text: '心理的安全性がなくても仕事の成果は変わらない' }] },
                { label: '4', content: [{ t: 'text', text: 'アイデアを出すためには会議を長時間行うべきだ' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: null,
    },
    {
      index: 1,
      code: 'listening',
      title: 'Nghe hiểu (聴解)',
      durationSec: 3000, // 50 minutes
      questionRange: [3, 4],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000013',
          mondaiType: 'point',
          instructions: [{ t: 'text', text: 'まず質問を聞いてください。その後選択肢を読んで、最もよいものを一つ選びなさい。' }],
          passage: null,
          media: ['media/n2_listening_point.mp3'],
          questions: [
            {
              index: 3,
              questionId: '0192f000-2000-7000-8000-000000000014',
              number: '4',
              stem: [{ t: 'text', text: '女の人が新商品の開発で最も重視している点は何ですか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'デザインの美しさ' }] },
                { label: '2', content: [{ t: 'text', text: '環境への配慮' }] },
                { label: '3', content: [{ t: 'text', text: '価格の手頃さ' }] },
                { label: '4', content: [{ t: 'text', text: '耐久性と安全性' }] },
              ],
            },
          ],
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000014',
          mondaiType: 'quick_response',
          instructions: [{ t: 'text', text: '短い発話を聞いて、最も適切な返答を一つ選びなさい。' }],
          passage: null,
          media: ['media/n2_listening_quick.mp3'],
          questions: [
            {
              index: 4,
              questionId: '0192f000-2000-7000-8000-000000000015',
              number: '5',
              stem: [{ t: 'text', text: '発話に対する適切な応答を選びなさい。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'ええ、喜んで伺います。' }] },
                { label: '2', content: [{ t: 'text', text: 'とんでもございません。' }] },
                { label: '3', content: [{ t: 'text', text: 'どうぞお構いなく。' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: [
        {
          groupId: '0192f000-1000-7000-8000-000000000013',
          mediaKey: 'media/n2_listening_point.mp3',
          startMs: 0,
          endMs: 25000,
          audioStartMs: 0,
          audioEndMs: 25000,
          gapAfterMs: 5000,
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000014',
          mediaKey: 'media/n2_listening_quick.mp3',
          startMs: 30000,
          endMs: 45000,
          audioStartMs: 0,
          audioEndMs: 15000,
          gapAfterMs: 5000,
        },
      ],
    },
  ],
});

export const SAMPLE_N3_EXAM_SNAPSHOT: PublicExamSnapshot = PublicExamSnapshotSchema.parse({
  schemaVersion: 1,
  examId: '0192f000-0000-7000-8000-000000000003',
  version: 1,
  level: 'N3',
  title: 'Đề thi thử chuẩn cấu trúc JLPT N3 - Số 1',
  kind: 'practice',
  totalQuestions: 5,
  sections: [
    {
      index: 0,
      code: 'language_vocab',
      title: 'Kiến thức ngôn ngữ (Từ vựng)',
      durationSec: 1800, // 30 minutes
      questionRange: [0, 1],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000021',
          mondaiType: 'kanji_reading',
          instructions: [{ t: 'text', text: '____の言葉の読み方として最もよいものを一つ選びなさい。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 0,
              questionId: '0192f000-2000-7000-8000-000000000021',
              number: '1',
              stem: [
                { t: 'text', text: '川の' },
                { t: 'underline', children: [{ t: 'ruby', text: '深さ', rt: 'ふかさ' }] },
                { t: 'text', text: 'を測る。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'ふかさ' }] },
                { label: '2', content: [{ t: 'text', text: 'あささ' }] },
                { label: '3', content: [{ t: 'text', text: 'ひろさ' }] },
                { label: '4', content: [{ t: 'text', text: 'ながさ' }] },
              ],
            },
            {
              index: 1,
              questionId: '0192f000-2000-7000-8000-000000000022',
              number: '2',
              stem: [
                { t: 'text', text: '明日の天気を' },
                { t: 'underline', children: [{ t: 'ruby', text: '予測', rt: 'よそく' }] },
                { t: 'text', text: 'する。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'よそく' }] },
                { label: '2', content: [{ t: 'text', text: 'よぼう' }] },
                { label: '3', content: [{ t: 'text', text: 'よてい' }] },
                { label: '4', content: [{ t: 'text', text: 'よそう' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: null,
    },
    {
      index: 1,
      code: 'language_grammar_reading',
      title: 'Ngữ pháp & Đọc hiểu',
      durationSec: 4200, // 70 minutes
      questionRange: [2, 3],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000022',
          mondaiType: 'grammar_form',
          instructions: [{ t: 'text', text: '次の文の（　）に入れるのに最もよいものを一つ選びなさい。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 2,
              questionId: '0192f000-2000-7000-8000-000000000023',
              number: '3',
              stem: [{ t: 'text', text: '健康の（　）、毎日野菜を多く食べるようにしています。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'ために' }] },
                { label: '2', content: [{ t: 'text', text: 'ように' }] },
                { label: '3', content: [{ t: 'text', text: 'とおりに' }] },
                { label: '4', content: [{ t: 'text', text: 'わりに' }] },
              ],
            },
          ],
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000023',
          mondaiType: 'info_retrieval',
          instructions: [{ t: 'text', text: '右の案内を見て、質問に答えてください。' }],
          passage: [
            {
              type: 'paragraph',
              content: [{ t: 'text', text: 'ボランティア日本語教室 参加案内' }],
            },
            {
              type: 'table',
              rows: [
                [
                  [{ t: 'text', text: 'コース' }],
                  [{ t: 'text', text: '初級・中級' }],
                ],
                [
                  [{ t: 'text', text: '開催日時' }],
                  [{ t: 'text', text: '毎週土曜日 14:00〜16:00' }],
                ],
                [
                  [{ t: 'text', text: '費用' }],
                  [{ t: 'text', text: '無料（教材費実費 500円）' }],
                ],
              ],
            },
          ],
          media: [],
          questions: [
            {
              index: 3,
              questionId: '0192f000-2000-7000-8000-000000000024',
              number: '4',
              stem: [{ t: 'text', text: 'この日本語教室について正しいものはどれですか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: '毎週日曜日に開かれている' }] },
                { label: '2', content: [{ t: 'text', text: '教材費として500円が必要である' }] },
                { label: '3', content: [{ t: 'text', text: '上級者向けのコースがある' }] },
                { label: '4', content: [{ t: 'text', text: '参加費が毎月3000円かかる' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: null,
    },
    {
      index: 2,
      code: 'listening',
      title: 'Nghe hiểu',
      durationSec: 2400, // 40 minutes
      questionRange: [4, 4],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000024',
          mondaiType: 'task_based',
          instructions: [{ t: 'text', text: '質問を聞いて、正しい番号を選びなさい。' }],
          passage: null,
          media: ['media/n3_audio_task.mp3'],
          questions: [
            {
              index: 4,
              questionId: '0192f000-2000-7000-8000-000000000025',
              number: '5',
              stem: [{ t: 'text', text: '留学生はこれから何を準備しますか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'パスポートのコピー' }] },
                { label: '2', content: [{ t: 'text', text: '学生証の写真' }] },
                { label: '3', content: [{ t: 'text', text: '申込用紙' }] },
                { label: '4', content: [{ t: 'text', text: '銀行の口座番号' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: [
        {
          groupId: '0192f000-1000-7000-8000-000000000024',
          mediaKey: 'media/n3_audio_task.mp3',
          startMs: 0,
          endMs: 20000,
          audioStartMs: 0,
          audioEndMs: 20000,
          gapAfterMs: 5000,
        },
      ],
    },
  ],
});

export const SAMPLE_N4_EXAM_SNAPSHOT: PublicExamSnapshot = PublicExamSnapshotSchema.parse({
  schemaVersion: 1,
  examId: '0192f000-0000-7000-8000-000000000004',
  version: 1,
  level: 'N4',
  title: 'Đề luyện tổng hợp JLPT N4 - Đề Trộn (Mixed)',
  kind: 'mixed',
  totalQuestions: 5,
  sections: [
    {
      index: 0,
      code: 'language_vocab',
      title: 'Kiến thức ngôn ngữ (Từ vựng)',
      durationSec: 1500, // 25 minutes
      questionRange: [0, 1],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000031',
          mondaiType: 'kanji_reading',
          instructions: [{ t: 'text', text: '____の ことばは どう よみますか。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 0,
              questionId: '0192f000-2000-7000-8000-000000000031',
              number: '1',
              stem: [
                { t: 'text', text: 'この' },
                { t: 'underline', children: [{ t: 'ruby', text: '部屋', rt: 'へや' }] },
                { t: 'text', text: 'は 明るいです。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'へや' }] },
                { label: '2', content: [{ t: 'text', text: 'いえ' }] },
                { label: '3', content: [{ t: 'text', text: 'にわ' }] },
                { label: '4', content: [{ t: 'text', text: 'みせ' }] },
              ],
            },
            {
              index: 1,
              questionId: '0192f000-2000-7000-8000-000000000032',
              number: '2',
              stem: [
                { t: 'text', text: '友達に' },
                { t: 'underline', children: [{ t: 'ruby', text: '手紙', rt: 'てがみ' }] },
                { t: 'text', text: 'を 書きました。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'てがみ' }] },
                { label: '2', content: [{ t: 'text', text: 'きっぷ' }] },
                { label: '3', content: [{ t: 'text', text: 'はがき' }] },
                { label: '4', content: [{ t: 'text', text: 'しんぶん' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: null,
    },
    {
      index: 1,
      code: 'language_grammar_reading',
      title: 'Ngữ pháp & Đọc hiểu',
      durationSec: 3300, // 55 minutes
      questionRange: [2, 3],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000032',
          mondaiType: 'grammar_form',
          instructions: [{ t: 'text', text: '（　）に 何を 入れますか。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 2,
              questionId: '0192f000-2000-7000-8000-000000000033',
              number: '3',
              stem: [{ t: 'text', text: '雨が（　）そうだから、傘を持って行きましょう。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'ふり' }] },
                { label: '2', content: [{ t: 'text', text: 'ふる' }] },
                { label: '3', content: [{ t: 'text', text: 'ふって' }] },
                { label: '4', content: [{ t: 'text', text: 'ふった' }] },
              ],
            },
          ],
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000033',
          mondaiType: 'comprehension_short',
          instructions: [{ t: 'text', text: 'つぎの ぶんしょうを よんで、しつもんに こたえてください。' }],
          passage: [
            {
              type: 'paragraph',
              content: [
                {
                  t: 'text',
                  text: 'わたしは 日本へ 来てから 毎朝 ジョギングを しています。はじめは つらかったですが、今は 体の ちょうしが とても いいです。',
                },
              ],
            },
          ],
          media: [],
          questions: [
            {
              index: 3,
              questionId: '0192f000-2000-7000-8000-000000000034',
              number: '4',
              stem: [{ t: 'text', text: 'この人は 今 どうですか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'ジョギングをやめました' }] },
                { label: '2', content: [{ t: 'text', text: '体の調子がとても良いです' }] },
                { label: '3', content: [{ t: 'text', text: '朝起きるのがつらいです' }] },
                { label: '4', content: [{ t: 'text', text: '日本へ行きたいです' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: null,
    },
    {
      index: 2,
      code: 'listening',
      title: 'Nghe hiểu',
      durationSec: 2100, // 35 minutes
      questionRange: [4, 4],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000034',
          mondaiType: 'utterance',
          instructions: [{ t: 'text', text: '絵を見ながら質問を聞いて、正しいものを一つ選びなさい。' }],
          passage: null,
          media: ['media/n4_listening.mp3', 'media/n4_illustration.webp'],
          questions: [
            {
              index: 4,
              questionId: '0192f000-2000-7000-8000-000000000035',
              number: '5',
              stem: [{ t: 'text', text: '友達の家で帰る時、何と言いますか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'お邪魔しました。' }] },
                { label: '2', content: [{ t: 'text', text: 'いってきます。' }] },
                { label: '3', content: [{ t: 'text', text: 'ただいま。' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: [
        {
          groupId: '0192f000-1000-7000-8000-000000000034',
          mediaKey: 'media/n4_listening.mp3',
          startMs: 0,
          endMs: 18000,
          audioStartMs: 0,
          audioEndMs: 18000,
          gapAfterMs: 4000,
        },
      ],
    },
  ],
});

export const SAMPLE_N5_EXAM_SNAPSHOT: PublicExamSnapshot = PublicExamSnapshotSchema.parse({
  schemaVersion: 1,
  examId: '0192f000-0000-7000-8000-000000000005',
  version: 1,
  level: 'N5',
  title: 'Đề thi thử JLPT N5 Mẫu Chuẩn',
  kind: 'practice',
  totalQuestions: 5,
  sections: [
    {
      index: 0,
      code: 'language_vocab',
      title: 'Kiến thức ngôn ngữ (Từ vựng)',
      durationSec: 1200, // 20 minutes
      questionRange: [0, 1],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000041',
          mondaiType: 'kanji_reading',
          instructions: [{ t: 'text', text: '____の ことばは どう かきますか。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 0,
              questionId: '0192f000-2000-7000-8000-000000000041',
              number: '1',
              stem: [
                { t: 'text', text: 'あそこに ' },
                { t: 'ruby', text: '犬', rt: 'いぬ' },
                { t: 'text', text: ' がいます。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'いぬ' }] },
                { label: '2', content: [{ t: 'text', text: 'ねこ' }] },
                { label: '3', content: [{ t: 'text', text: 'とり' }] },
                { label: '4', content: [{ t: 'text', text: 'うま' }] },
              ],
            },
            {
              index: 1,
              questionId: '0192f000-2000-7000-8000-000000000042',
              number: '2',
              stem: [
                { t: 'text', text: 'この ' },
                {
                  t: 'underline',
                  children: [{ t: 'ruby', text: '本', rt: 'ほん' }],
                },
                { t: 'text', text: ' を読みます。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'ほん' }] },
                { label: '2', content: [{ t: 'text', text: 'き' }] },
                { label: '3', content: [{ t: 'text', text: 'みず' }] },
                { label: '4', content: [{ t: 'text', text: 'やま' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: null,
    },
    {
      index: 1,
      code: 'language_grammar_reading',
      title: 'Ngữ pháp & Đọc hiểu',
      durationSec: 2400, // 40 minutes
      questionRange: [2, 3],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000042',
          mondaiType: 'sentence_composition',
          instructions: [{ t: 'text', text: '★ に 入る ものは どれですか。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 2,
              questionId: '0192f000-2000-7000-8000-000000000043',
              number: '3',
              stem: [
                { t: 'text', text: 'わたしは ' },
                { t: 'blank' },
                { t: 'blank' },
                { t: 'star' },
                { t: 'blank' },
                { t: 'text', text: ' 行きます。' },
              ],
              options: [
                { label: '1', content: [{ t: 'text', text: 'バスで' }] },
                { label: '2', content: [{ t: 'text', text: '学校へ' }] },
                { label: '3', content: [{ t: 'text', text: 'まいあさ' }] },
                { label: '4', content: [{ t: 'text', text: 'ともだちと' }] },
              ],
            },
          ],
        },
        {
          groupId: '0192f000-1000-7000-8000-000000000043',
          mondaiType: 'info_retrieval',
          instructions: [{ t: 'text', text: 'つぎの あんないを みて、しつもんに こたえてください。' }],
          passage: [
            {
              type: 'paragraph',
              content: [{ t: 'text', text: '図書館の利用案内' }],
            },
            {
              type: 'table',
              rows: [
                [
                  [{ t: 'text', text: '曜日' }],
                  [{ t: 'text', text: '開館時間' }],
                ],
                [
                  [{ t: 'text', text: '月曜日〜金曜日' }],
                  [{ t: 'text', text: '9:00〜20:00' }],
                ],
                [
                  [{ t: 'text', text: '土曜日・日曜日' }],
                  [{ t: 'text', text: '9:00〜17:00' }],
                ],
              ],
            },
          ],
          media: [],
          questions: [
            {
              index: 3,
              questionId: '0192f000-2000-7000-8000-000000000044',
              number: '4',
              stem: [{ t: 'text', text: '土曜日は何時まで開いていますか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: '17:00まで' }] },
                { label: '2', content: [{ t: 'text', text: '18:00まで' }] },
                { label: '3', content: [{ t: 'text', text: '20:00まで' }] },
                { label: '4', content: [{ t: 'text', text: '休み' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: null,
    },
    {
      index: 2,
      code: 'listening',
      title: 'Nghe hiểu',
      durationSec: 1800, // 30 minutes
      questionRange: [4, 4],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000044',
          mondaiType: 'quick_response',
          instructions: [{ t: 'text', text: '質問を聞いて、正しい返事を選んでください。' }],
          passage: null,
          media: ['media/n5_audio_sample.mp3'],
          questions: [
            {
              index: 4,
              questionId: '0192f000-2000-7000-8000-000000000045',
              number: '5',
              stem: [{ t: 'text', text: 'すみません、この電車は新宿へ行きますか。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'はい、行きますよ。' }] },
                { label: '2', content: [{ t: 'text', text: 'いいえ、電車です。' }] },
                { label: '3', content: [{ t: 'text', text: '新宿にあります。' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: [
        {
          groupId: '0192f000-1000-7000-8000-000000000044',
          mediaKey: 'media/n5_audio_sample.mp3',
          startMs: 0,
          endMs: 15000,
          audioStartMs: 0,
          audioEndMs: 15000,
          gapAfterMs: 5000,
        },
      ],
    },
  ],
});

export const ALL_SAMPLE_EXAMS: PublicExamSnapshot[] = [
  SAMPLE_N1_EXAM_SNAPSHOT,
  SAMPLE_N2_EXAM_SNAPSHOT,
  SAMPLE_N3_EXAM_SNAPSHOT,
  SAMPLE_N4_EXAM_SNAPSHOT,
  SAMPLE_N5_EXAM_SNAPSHOT,
];

export const SAMPLE_EXAM_SUMMARIES: ExamSummary[] = [
  ExamSummarySchema.parse({
    id: SAMPLE_N1_EXAM_SNAPSHOT.examId,
    slug: 'jlpt-n1-2023-12',
    level: 'N1',
    title: SAMPLE_N1_EXAM_SNAPSHOT.title,
    kind: 'original',
    year: 2023,
    session: '12',
    totalQuestions: SAMPLE_N1_EXAM_SNAPSHOT.totalQuestions,
    sections: SAMPLE_N1_EXAM_SNAPSHOT.sections.map((s) => ({
      title: s.title,
      durationSec: s.durationSec,
    })),
    sourceLabel: 'Japan Foundation & JEES',
    licenseLabel: 'Nghiên cứu & Học tập phi thương mại',
    guestTrial: true,
    publishedVersion: 1,
  }),
  ExamSummarySchema.parse({
    id: SAMPLE_N2_EXAM_SNAPSHOT.examId,
    slug: 'jlpt-n2-2023-07',
    level: 'N2',
    title: SAMPLE_N2_EXAM_SNAPSHOT.title,
    kind: 'original',
    year: 2023,
    session: '7',
    totalQuestions: SAMPLE_N2_EXAM_SNAPSHOT.totalQuestions,
    sections: SAMPLE_N2_EXAM_SNAPSHOT.sections.map((s) => ({
      title: s.title,
      durationSec: s.durationSec,
    })),
    sourceLabel: 'Japan Foundation & JEES',
    licenseLabel: 'Nghiên cứu & Học tập phi thương mại',
    guestTrial: true,
    publishedVersion: 1,
  }),
  ExamSummarySchema.parse({
    id: SAMPLE_N3_EXAM_SNAPSHOT.examId,
    slug: 'jlpt-n3-chuan-so-1',
    level: 'N3',
    title: SAMPLE_N3_EXAM_SNAPSHOT.title,
    kind: 'practice',
    year: 2024,
    session: '7',
    totalQuestions: SAMPLE_N3_EXAM_SNAPSHOT.totalQuestions,
    sections: SAMPLE_N3_EXAM_SNAPSHOT.sections.map((s) => ({
      title: s.title,
      durationSec: s.durationSec,
    })),
    sourceLabel: 'Ban biên soạn JLPT Online',
    licenseLabel: 'Bản quyền giáo trình JLPT Online',
    guestTrial: true,
    publishedVersion: 1,
  }),
  ExamSummarySchema.parse({
    id: SAMPLE_N4_EXAM_SNAPSHOT.examId,
    slug: 'jlpt-n4-mixed-tong-hop',
    level: 'N4',
    title: SAMPLE_N4_EXAM_SNAPSHOT.title,
    kind: 'mixed',
    year: 2024,
    session: '12',
    totalQuestions: SAMPLE_N4_EXAM_SNAPSHOT.totalQuestions,
    sections: SAMPLE_N4_EXAM_SNAPSHOT.sections.map((s) => ({
      title: s.title,
      durationSec: s.durationSec,
    })),
    sourceLabel: 'Tổng hợp ngân hàng đề thi JLPT',
    licenseLabel: 'Mã nguồn mở giáo dục',
    guestTrial: true,
    publishedVersion: 1,
  }),
  ExamSummarySchema.parse({
    id: SAMPLE_N5_EXAM_SNAPSHOT.examId,
    slug: 'jlpt-n5-mau-chuan',
    level: 'N5',
    title: SAMPLE_N5_EXAM_SNAPSHOT.title,
    kind: 'practice',
    year: 2024,
    session: '7',
    totalQuestions: SAMPLE_N5_EXAM_SNAPSHOT.totalQuestions,
    sections: SAMPLE_N5_EXAM_SNAPSHOT.sections.map((s) => ({
      title: s.title,
      durationSec: s.durationSec,
    })),
    sourceLabel: 'Đề mẫu chính thức JLPT N5',
    licenseLabel: 'Sử dụng miễn phí',
    guestTrial: true,
    publishedVersion: 1,
  }),
];

export function findExamSnapshotById(id: string): PublicExamSnapshot | undefined {
  return ALL_SAMPLE_EXAMS.find((e) => e.examId === id);
}

export function findExamSnapshotByLevel(level: string): PublicExamSnapshot | undefined {
  return ALL_SAMPLE_EXAMS.find((e) => e.level === level);
}

export function findExamSummaryBySlug(slug: string): ExamSummary | undefined {
  return SAMPLE_EXAM_SUMMARIES.find((e) => e.slug === slug);
}
