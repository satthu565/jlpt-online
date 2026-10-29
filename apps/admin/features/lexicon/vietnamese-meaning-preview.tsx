'use client';

import React from 'react';
import { t, type Locale } from '../../lib/i18n';
import type { LexiconMeaningSense } from './types';

export function VietnameseMeaningPreview({ senses, fallback, locale }: {
  senses: LexiconMeaningSense[];
  fallback: string[];
  locale: Locale;
}): React.JSX.Element {
  const hasStructuredContent = senses.some(sense => sense.summary || sense.explanation);
  if (!hasStructuredContent) {
    return <p>{fallback.join(' / ') || t('lexicon.viEmpty', locale)}</p>;
  }

  const summary = senses.find(sense => sense.summary)?.summary;
  const meanings = senses.flatMap(sense => sense.vietnamese);
  const explanations = senses.flatMap(sense => sense.explanation ? [sense.explanation] : []);

  return (
    <div className="space-y-2" data-testid="lexicon-vi-structured-preview">
      {summary && (
        <div>
          <p className="text-xs font-semibold text-gray-500">{t('lexicon.commonMeaning', locale)}</p>
          <p>{summary}</p>
        </div>
      )}
      {meanings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500">{t('lexicon.meaningDetails', locale)}</p>
          <ol className="list-decimal space-y-1 pl-5">
            {meanings.map((meaning, index) => <li key={`${index}-${meaning}`}>{meaning}</li>)}
          </ol>
        </div>
      )}
      {explanations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500">{t('lexicon.explanation', locale)}</p>
          {explanations.map((explanation, index) => (
            <p key={`${index}-${explanation}`} className="text-sm leading-relaxed">{explanation}</p>
          ))}
        </div>
      )}
    </div>
  );
}
