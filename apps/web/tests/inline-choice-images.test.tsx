import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaperBooklet } from '../features/exam/components/paper-booklet';
import { flattenExamQuestions } from '../features/exam/utils/flatten-questions';
import { SAMPLE_N5_EXAM_SNAPSHOT } from './fixtures/sample-exam';

const noop = () => {};

describe('Source images inside answer choices', () => {
  it('renders option images once while retaining a separate illustration and audio reference', () => {
    const snapshot = structuredClone(SAMPLE_N5_EXAM_SNAPSHOT);
    const group = snapshot.sections[0]!.groups[0]!;
    const question = group.questions[0]!;
    group.media = ['media/choice-a.png', '/api/v1/media/choice-b.png', 'media/diagram.png', 'media/audio.mp3'];
    question.options[0]!.content = [{ t: 'image', mediaKey: 'media/choice-a.png', alt: 'Choice A' }];
    question.options[1]!.content = [{ t: 'emphasis', children: [{ t: 'image', url: '/media/choice-b.png', alt: 'Choice B' }] }];
    const original = structuredClone(snapshot);
    const flat = flattenExamQuestions(snapshot);
    const first = flat[0]!;
    expect(first.media).toEqual(['media/diagram.png', 'media/audio.mp3']);
    expect(first.options).toEqual(question.options);
    expect(snapshot).toEqual(original);
    const html = renderToStaticMarkup(<PaperBooklet title="N5" questions={[first]} answers={[0]} flags={[0]} currentIndex={0} workspace={{ fontSize: 'base', font: 'mincho', notes: {}, marks: {} }} showFurigana={false} disabled={false} onActivate={noop} onAnswer={noop} onFlag={noop} onNote={noop} onMark={noop} onClearMarks={noop} onOpenPassage={noop} />);
    expect(html.match(/<img[^>]+alt="Choice A"/g)).toHaveLength(1);
    expect(html.match(/<img[^>]+alt="Choice B"/g)).toHaveLength(1);
    expect(html.match(/<img[^>]+src="\/api\/v1\/media\/diagram.png"/g)).toHaveLength(1);
    expect(html.match(/type="radio"/g)).toHaveLength(question.options.length);
  });

  it('handles image choices on a later question without removing any normal illustration', () => {
    const snapshot = structuredClone(SAMPLE_N5_EXAM_SNAPSHOT);
    const group = snapshot.sections[0]!.groups[0]!;
    const first = group.questions[0]!;
    group.questions = [first, { ...structuredClone(first), questionId: 'later-question', number: '2', index: 1 }];
    group.media = ['media/later.png', 'https://cdn.example.test/diagram.png?t=example'];
    group.questions[1]!.options[0]!.content = [{ t: 'image', mediaKey: 'media/later.png', alt: 'Later choice' }];
    const flat = flattenExamQuestions(snapshot, [0]);
    expect(flat[0]!.media).toEqual(['https://cdn.example.test/diagram.png?t=example']);
    expect(flat[1]!.media).toEqual(flat[0]!.media);
    expect(flat[1]!.options[0]!.content).toEqual([{ t: 'image', mediaKey: 'media/later.png', alt: 'Later choice' }]);
    expect(flat[0]!.isLocked).toBe(true);
  });
  it('keeps passage and stem images in their original positions rather than duplicating them above the question', () => {
    const snapshot = structuredClone(SAMPLE_N5_EXAM_SNAPSHOT);
    const group = snapshot.sections[0]!.groups[0]!;
    group.media = ['media/passage.png', 'media/stem.png', 'media/table.png', 'media/audio.mp3'];
    group.passage = [
      { type: 'image', mediaKey: 'media/passage.png', alt: 'Passage diagram', width: 200, height: 100 },
      { type: 'table', rows: [[[{ t: 'image', mediaKey: 'media/table.png', alt: 'Table diagram' }]]] },
    ];
    group.questions[0]!.stem = [{ t: 'image', mediaKey: 'media/stem.png', alt: 'Stem diagram' }];
    const first = flattenExamQuestions(snapshot)[0]!;
    expect(first.media).toEqual(['media/audio.mp3']);
    const html = renderToStaticMarkup(<PaperBooklet title="N5" questions={[first]} answers={[0]} flags={[0]} currentIndex={0} workspace={{ fontSize: 'base', font: 'mincho', notes: {}, marks: {} }} showFurigana={false} disabled={false} onActivate={noop} onAnswer={noop} onFlag={noop} onNote={noop} onMark={noop} onClearMarks={noop} onOpenPassage={noop} />);
    for (const alt of ['Passage diagram', 'Table diagram', 'Stem diagram']) {
      expect(html.match(new RegExp('<img[^>]+alt="' + alt + '"', 'g'))).toHaveLength(1);
    }
  });

});
