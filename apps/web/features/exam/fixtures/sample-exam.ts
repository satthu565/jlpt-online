import type { PublicExamSnapshot } from '@jlpt/schema';

export const SAMPLE_N5_EXAM_SNAPSHOT: PublicExamSnapshot = {
  schemaVersion: 1,
  examId: '00000000-0000-4000-8000-000000000001',
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
      durationSec: 1500, // 25 minutes
      questionRange: [0, 1],
      groups: [
        {
          groupId: '10000000-0000-4000-8000-000000000001',
          mondaiType: 'kanji_reading',
          instructions: [{ t: 'text', text: '____の ことばは どう かきますか。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 0,
              questionId: '20000000-0000-4000-8000-000000000001',
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
              questionId: '20000000-0000-4000-8000-000000000002',
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
      durationSec: 3000, // 50 minutes
      questionRange: [2, 3],
      groups: [
        {
          groupId: '10000000-0000-4000-8000-000000000002',
          mondaiType: 'sentence_composition',
          instructions: [{ t: 'text', text: '★ に 入る ものは どれですか。' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 2,
              questionId: '20000000-0000-4000-8000-000000000003',
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
          groupId: '10000000-0000-4000-8000-000000000003',
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
              questionId: '20000000-0000-4000-8000-000000000004',
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
          groupId: '10000000-0000-4000-8000-000000000004',
          mondaiType: 'quick_response',
          instructions: [{ t: 'text', text: '質問を聞いて、正しい返事を選んでください。' }],
          passage: null,
          media: ['media/audio-sample.mp3'],
          questions: [
            {
              index: 4,
              questionId: '20000000-0000-4000-8000-000000000005',
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
          groupId: '10000000-0000-4000-8000-000000000004',
          mediaKey: 'media/audio-sample.mp3',
          startMs: 0,
          endMs: 5000,
          audioStartMs: 0,
          audioEndMs: 5000,
          gapAfterMs: 5000,
        },
      ],
    },
  ],
};
