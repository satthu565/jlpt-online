'use client';

import React from 'react';
import { Card, Chip } from '@jlpt/ui/components/exam-controls';
import { useI18n } from '../../../lib/i18n';
import type { KanjiHanVietBreakdown } from '../types';
import { selectedKanji } from '../utils/selected-kanji';

export function SelectionKanjiPanel({ text, breakdown = [] }: {
  text: string;
  breakdown?: KanjiHanVietBreakdown[];
}): React.JSX.Element {
  const { t } = useI18n();
  const kanji = selectedKanji(text);
  return <section data-testid="lookup-kanji-panel" className="space-y-3" aria-label={t('dictionary.selectedKanji')}>
    <p className="text-sm">{t('dictionary.selectedText')}: <span lang="ja">{text}</span></p>
    {kanji.length > 0 ? <ul className="grid grid-cols-2 gap-2" aria-label={t('dictionary.selectedKanji')}>
      {kanji.map((character) => {
        const reading = breakdown.find((item) => item.kanji === character);
        return <li key={character} data-testid="lookup-kanji-item">
          <Card><Card.Header>
            <Card.Title><span lang="ja" className="text-3xl" data-testid="lookup-kanji-character">{character}</span></Card.Title>
            {reading?.hanViet && <Chip size="sm" variant="soft">{reading.hanViet}</Chip>}
          </Card.Header></Card>
        </li>;
      })}
    </ul> : <p role="status" className="text-sm">{t('dictionary.noSelectedKanji')}</p>}
  </section>;
}
