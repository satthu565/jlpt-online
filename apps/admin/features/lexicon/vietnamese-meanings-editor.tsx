'use client';

import React, { useState } from 'react';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Textarea } from '@jlpt/ui/components/textarea';
import { apiClient } from '../../lib/api-client';
import { t, type Locale } from '../../lib/i18n';
import type { LexiconItem, LexiconMeaningSense } from './types';

export function VietnameseMeaningsEditor({
  item,
  locale,
  onSaved,
  onCancel,
}: {
  item: LexiconItem;
  locale: Locale;
  onSaved: (result: { meaningsVi: string[]; meaningSenses: LexiconMeaningSense[] }) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const senses = item.meaningSenses.length
    ? item.meaningSenses
    : [
        {
          senseIndex: 0,
          english: [],
          vietnamese: [],
          summary: null,
          explanation: null,
          partOfSpeech: item.partOfSpeech,
        },
      ];
  const [drafts, setDrafts] = useState<Record<number, { summary: string; meanings: string; explanation: string }>>(() =>
    Object.fromEntries(
      senses.map((s) => [
        s.senseIndex,
        {
          summary: s.summary ?? '',
          meanings: s.vietnamese.join('\n'),
          explanation: s.explanation ?? '',
        },
      ]),
    ),
  );
  const [showMeaningDetails, setShowMeaningDetails] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(senses.map((sense) => [sense.senseIndex, sense.vietnamese.length > 0])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await apiClient.updateVietnameseMeanings(
        item.id,
        senses.map((s) => ({
          senseIndex: s.senseIndex,
          summary: drafts[s.senseIndex]?.summary.trim() ?? '',
          meanings: (drafts[s.senseIndex]?.meanings ?? '')
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean),
          explanation: drafts[s.senseIndex]?.explanation.trim() ?? '',
        })),
      );
      onSaved(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('lexicon.saveError', locale));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="rounded-2xl border border-gray-200 p-5 space-y-4" aria-label={t('lexicon.editVi', locale)} data-testid="lexicon-vi-editor">
      <h2 className="text-xl font-semibold">
        {t('lexicon.editVi', locale)}: {item.term}（{item.readings.join('、')}）
      </h2>
      <p className="text-sm text-gray-600">{t('lexicon.viHint', locale)}</p>
      {error && <Alert variant="error">{error}</Alert>}
      {senses.map((sense, index) => (
        <div key={sense.senseIndex} className="space-y-2">
          <h3 className="font-semibold">
            {t('lexicon.sense', locale)} {index + 1} {sense.partOfSpeech ? `(${sense.partOfSpeech})` : ''}
          </h3>
          <p className="text-sm">{sense.english.join('; ') || t('lexicon.noEnglishSense', locale)}</p>
          <Textarea
            label={t('lexicon.commonMeaning', locale)}
            value={drafts[sense.senseIndex]?.summary ?? ''}
            rows={2}
            disabled={saving}
            autoFocus={index === 0}
            data-testid={`lexicon-vi-summary-${sense.senseIndex}`}
            onChange={(event) =>
              setDrafts((previous) => ({
                ...previous,
                [sense.senseIndex]: {
                  ...previous[sense.senseIndex]!,
                  summary: event.target.value,
                },
              }))
            }
          />
          {showMeaningDetails[sense.senseIndex] ? (
            <Textarea
              label={t('lexicon.independentMeanings', locale)}
              value={drafts[sense.senseIndex]?.meanings ?? ''}
              rows={3}
              disabled={saving}
              data-testid={`lexicon-vi-sense-${sense.senseIndex}`}
              onChange={(event) =>
                setDrafts((previous) => ({
                  ...previous,
                  [sense.senseIndex]: {
                    ...previous[sense.senseIndex]!,
                    meanings: event.target.value,
                  },
                }))
              }
            />
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={saving}
              data-testid={`lexicon-add-independent-meaning-${sense.senseIndex}`}
              onClick={() => setShowMeaningDetails((previous) => ({ ...previous, [sense.senseIndex]: true }))}
            >
              {t('lexicon.addIndependentMeaning', locale)}
            </Button>
          )}
          <Textarea
            label={t('lexicon.explanation', locale)}
            value={drafts[sense.senseIndex]?.explanation ?? ''}
            rows={4}
            disabled={saving}
            data-testid={`lexicon-vi-explanation-${sense.senseIndex}`}
            onChange={(event) =>
              setDrafts((previous) => ({
                ...previous,
                [sense.senseIndex]: {
                  ...previous[sense.senseIndex]!,
                  explanation: event.target.value,
                },
              }))
            }
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void save()} loading={saving} disabled={saving} data-testid="lexicon-vi-save">
          {t('lexicon.saveVi', locale)}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          {t('lexicon.cancel', locale)}
        </Button>
      </div>
    </section>
  );
}
