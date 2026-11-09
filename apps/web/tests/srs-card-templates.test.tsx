import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FlashcardView } from '../features/learning/components/flashcard-view';
import type { DueFlashcard } from '../features/learning/types';

describe('SRS card templates', () => {
  it.each([
    [{ term: '学生' }, '学生'],
    [{ kanji: '学' }, '学'],
    [{ pattern: '〜に伴い' }, '〜に伴い'],
    [{ prompt: 'Japanese word:', meaning: 'Student' }, 'Student'],
  ])('renders the stored front payload %j', (front, expected) => {
    const card: DueFlashcard = {
      cardId: 'card', notebookItemId: 'item', front, back: { meaning: 'Học sinh' },
      dueAt: '2026-11-09T00:00:00Z', intervalDays: 0, repetitions: 0, state: 'new',
    };
    expect(renderToString(<FlashcardView card={card} onRate={() => {}} />)).toContain(expected);
  });
});
