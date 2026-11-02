import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { createDbClient } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { BlueprintService, toDeterministicUuid } from '../blueprint/blueprint.service.js';
import { ExamService } from '../exam/exam.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { StorageService } from '../storage/storage.service.js';

const EXAM_SLUG = 'n4-2023-07';
const PACKAGE_ID = '329fb71e-6527-4e8a-b184-29eea394cebb';
const INSERT_ORDER = 51;
const CONTENT_VERSION = 2;

const r24Passage = [
  { type: 'paragraph', content: [{ t: 'text', text: '（3）' }] },
  {
    type: 'paragraph',
    content: [{ t: 'text', text: 'これは、中西先生がリムさんに書いたメールです。' }],
  },
  {
    type: 'paragraph',
    content: [
      { t: 'text', text: 'リムさん' },
      { t: 'br' },
      { t: 'text', text: 'こんばんは。' },
      { t: 'br' },
      { t: 'text', text: '送ってくれた卒業式のあいさつの文章ですが、とてもよかったですよ。' },
      { t: 'br' },
      {
        t: 'text',
        text: 'リムさんはみんなの前でうまく話せるか心配だと言っていましたね。前川先生と高木先生も、「練習を見ましょうか。」と言っていたので、頼んでみましょうか。',
      },
      { t: 'br' },
      { t: 'text', text: '中西' },
    ],
  },
];

const r25Passage = [
  {
    type: 'paragraph',
    content: [
      { t: 'text', text: '私は半年前、家族と一緒に住んでいた家を出て、アパートに' },
      { t: 'underline', children: [{ t: 'text', text: '①引っ越しました' }] },
      {
        t: 'text',
        text: '。大学を卒業して会社に入ったのですが、家から遠かったです。引っ越してから、週末、近所にある広い公園へ散歩に行くようになりました。季節の花を見たり、公園の中の喫茶店でお茶を飲んだりして、一人で楽しみます。',
      },
    ],
  },
  {
    type: 'paragraph',
    content: [
      {
        t: 'text',
        text: '先週、散歩をしているとき、音楽が聞こえてきました。最初は、公園の放送だと思いましたが、木の下で男の人がギターの練習をしている音でした。男の人のギターはとても上手でした。',
      },
    ],
  },
  {
    type: 'paragraph',
    content: [
      {
        t: 'text',
        text: '私は男の人のギターを聞いて、自分のバイオリンのことを思い出しました。私は子どものころから大学を卒業するまで、家でよくバイオリンを弾いていました。でも、今のアパートでは弾けません。大きい音を出したら、近所の人にうるさいと思われたからです。でも、公園なら、誰にも遠慮しなくても良さそうです。',
      },
    ],
  },
  {
    type: 'paragraph',
    content: [
      {
        t: 'text',
        text: '今日、私は公園にバイオリンを持って行って、弾いてみました。最初は、人がいる所で弾くのは、恥ずかしかったです。でも、だんだん慣れて、気にならなくなりました。たくさん弾けて、気持ちがよかったです。',
      },
      { t: 'underline', children: [{ t: 'text', text: '②いい場所' }] },
      { t: 'text', text: 'が見つかりました。' },
    ],
  },
];

const r24Stem = [
  {
    t: 'text',
    text: '卒業式の挨拶について、中西先生がリムさんに聞きたいことは何ですか。',
  },
];

const r24Options = [
  '前川先生と高木先生にも文章を送ったかどうか',
  '前川先生と高木先生の前で練習をしているかどうか',
  '前川先生と高木先生に練習を見てもらいたいかどうか',
  '前川先生と高木先生に「練習を見てください。」と頼んだかどうか',
];

async function main(): Promise<void> {
  if (process.env.CONFIRM_N4_2023_07_REPAIR !== 'YES') {
    throw new Error('Set CONFIRM_N4_2023_07_REPAIR=YES after taking a verified backup');
  }

  const dbClient = await createDbClient();
  const storageService = new StorageService();
  const outboxService = new OutboxService(dbClient);
  const blueprintService = new BlueprintService(dbClient);
  const examService = new ExamService(
    dbClient,
    storageService,
    outboxService,
    blueprintService,
  );

  try {
    const [exam] = await dbClient.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.slug, EXAM_SLUG))
      .limit(1);
    if (!exam) throw new Error(`Exam not found: ${EXAM_SLUG}`);

    if (exam.publishedVersion && exam.publishedVersion >= 2) {
      console.log(
        JSON.stringify({
          status: 'already_published',
          examId: exam.id,
          version: exam.publishedVersion,
          totalQuestions: exam.totalQuestions,
        }),
      );
      return;
    }

    const [currentVersion] = await dbClient.db
      .select()
      .from(schema.examVersions)
      .where(eq(schema.examVersions.examId, exam.id))
      .orderBy(desc(schema.examVersions.version))
      .limit(1);
    if (!currentVersion || currentVersion.version !== 1 || currentVersion.totalQuestions !== 82) {
      throw new Error('Unexpected published baseline; expected immutable v1 with 82 questions');
    }

    const r23QuestionId = toDeterministicUuid(`${PACKAGE_ID}:q:r23`);
    const r24GroupId = toDeterministicUuid(`${PACKAGE_ID}:group:g-reading-4-r24`);
    const r24QuestionId = toDeterministicUuid(`${PACKAGE_ID}:q:r24`);
    const r25GroupId = toDeterministicUuid(`${PACKAGE_ID}:group:g-reading-5`);
    const r25QuestionId = toDeterministicUuid(`${PACKAGE_ID}:q:r25`);

    const [r23Question] = await dbClient.db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, r23QuestionId))
      .limit(1);
    const [r23Group] = r23Question?.groupId
      ? await dbClient.db
          .select()
          .from(schema.questionGroups)
          .where(eq(schema.questionGroups.id, r23Question.groupId))
          .limit(1)
      : [];
    if (!r23Group) throw new Error('R23 source group not found');

    const [r25Item] = await dbClient.db
      .select()
      .from(schema.examItems)
      .where(
        and(
          eq(schema.examItems.examId, exam.id),
          eq(schema.examItems.questionId, r25QuestionId),
        ),
      )
      .limit(1);
    if (!r25Item || r25Item.orderIndex !== INSERT_ORDER) {
      throw new Error('Unexpected R25 position; refusing to shift exam items');
    }

    const [publisher] = await dbClient.db
      .select({ publishedBy: schema.examVersions.publishedBy })
      .from(schema.examVersions)
      .where(
        and(
          eq(schema.examVersions.examId, exam.id),
          eq(schema.examVersions.version, currentVersion.version),
        ),
      )
      .limit(1);
    if (!publisher?.publishedBy) throw new Error('Existing publisher actor not found');

    await dbClient.db.transaction(async (tx: typeof dbClient.db) => {
      await tx
        .insert(schema.questionGroups)
        .values({
          id: r24GroupId,
          sourceId: r23Group.sourceId,
          licenseId: r23Group.licenseId,
          level: 'N4',
          sectionCode: 'language_grammar_reading',
          title: 'Nhóm g-reading-4-r24',
        })
        .onConflictDoNothing();

      await tx
        .insert(schema.questionGroupVersions)
        .values({
          groupId: r24GroupId,
          version: CONTENT_VERSION,
          passage: r24Passage,
          audioSha256: null,
          status: 'approved',
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            schema.questionGroupVersions.groupId,
            schema.questionGroupVersions.version,
          ],
          set: { passage: r24Passage, status: 'approved' },
        });

      await tx
        .insert(schema.questions)
        .values({
          id: r24QuestionId,
          groupId: r24GroupId,
          level: 'N4',
          skill: 'reading',
          mondaiType: 'comprehension_short',
          origin: 'official_past_exam',
        })
        .onConflictDoNothing();

      await tx
        .insert(schema.questionVersions)
        .values({
          questionId: r24QuestionId,
          version: CONTENT_VERSION,
          stem: r24Stem,
          explanation: null,
          status: 'approved',
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            schema.questionVersions.questionId,
            schema.questionVersions.version,
          ],
          set: { stem: r24Stem, status: 'approved' },
        });

      for (let index = 0; index < r24Options.length; index += 1) {
        await tx
          .insert(schema.answerOptions)
          .values({
            questionId: r24QuestionId,
            questionVersion: CONTENT_VERSION,
            orderIndex: index + 1,
            content: [{ t: 'text', text: r24Options[index] }],
          })
          .onConflictDoNothing();
      }

      await tx
        .insert(schema.correctAnswers)
        .values({
          questionId: r24QuestionId,
          questionVersion: CONTENT_VERSION,
          correctOption: 3,
          explanationNotes: null,
        })
        .onConflictDoNothing();

      await tx
        .insert(schema.questionGroupVersions)
        .values({
          groupId: r25GroupId,
          version: CONTENT_VERSION,
          passage: r25Passage,
          audioSha256: null,
          status: 'approved',
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            schema.questionGroupVersions.groupId,
            schema.questionGroupVersions.version,
          ],
          set: { passage: r25Passage, status: 'approved' },
        });

      const [existingR24Item] = await tx
        .select()
        .from(schema.examItems)
        .where(
          and(
            eq(schema.examItems.examId, exam.id),
            eq(schema.examItems.questionId, r24QuestionId),
          ),
        )
        .limit(1);

      if (!existingR24Item) {
        await tx
          .update(schema.examItems)
          .set({
            orderIndex: sql`${schema.examItems.orderIndex} + 1`,
          })
          .where(
            and(
              eq(schema.examItems.examId, exam.id),
              gte(schema.examItems.orderIndex, INSERT_ORDER),
            ),
          );

        const [grammarReadingSection] = await tx
          .select()
          .from(schema.examSections)
          .where(
            and(
              eq(schema.examSections.examId, exam.id),
              eq(schema.examSections.code, 'language_grammar_reading'),
            ),
          )
          .limit(1);
        if (!grammarReadingSection) throw new Error('Grammar-reading section not found');

        await tx.insert(schema.examItems).values({
          id: generateUuidV7(),
          examId: exam.id,
          sectionId: grammarReadingSection.id,
          questionId: r24QuestionId,
          orderIndex: INSERT_ORDER,
        });
      }

      await tx
        .update(schema.exams)
        .set({ totalQuestions: 83, updatedAt: new Date() })
        .where(eq(schema.exams.id, exam.id));
    });

    const published = await examService.publishExam(exam.id, publisher.publishedBy);
    if (published.version !== 2 || published.totalQuestions !== 83) {
      throw new Error('Unexpected publication result');
    }

    console.log(
      JSON.stringify({
        status: 'published',
        examId: exam.id,
        version: published.version,
        totalQuestions: published.totalQuestions,
      }),
    );
  } finally {
    await dbClient.close();
  }
}

void main();

