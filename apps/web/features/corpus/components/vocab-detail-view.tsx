'use client';

import { Flag, NotebookPen } from 'lucide-react';
import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Modal } from '@jlpt/ui/components/modal';
import { Input } from '@jlpt/ui/components/input';
import { Textarea } from '@jlpt/ui/components/textarea';
import type { DictionaryEntryDetailDto } from '../types';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { CorpusClient } from '../services/corpus-client';
import { defaultLearningClient } from '../../learning';

export interface VocabDetailViewProps {
  entry: DictionaryEntryDetailDto;
  className?: string;
}

export function VocabDetailView({
  entry,
  className = '',
}: VocabDetailViewProps): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const [client] = useState(() => new CorpusClient());

  // Save to notebook state
  const [isSavingNotebook, setIsSavingNotebook] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Han-Viet error report dialog state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuggestion, setReportSuggestion] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleSaveToNotebook = async () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        window.location.href = '/dang-nhap';
      }
      return;
    }
    setIsSavingNotebook(true);
    setSaveNotice(null);
    setSaveError(null);
    try {
      await defaultLearningClient.createNotebookItem({
        kind: 'vocab',
        term: entry.entry,
        reading: entry.readings?.[0] || undefined,
        meaning: entry.meanings?.[0] || '',
        hanViet: entry.hanViet || undefined,
        partOfSpeech: entry.partOfSpeech,
      });
      setSaveNotice(t('dictionary.savedToNotebook'));
      setTimeout(() => setSaveNotice(null), 4000);
    } catch {
      setSaveError(t('dictionary.saveFailed'));
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setIsSavingNotebook(false);
    }
  };

  const handleSubmitReport = async () => {
    setIsSubmittingReport(true);
    setReportError(null);
    try {
      await client.reportHanViet({
        entry: entry.entry,
        reading: entry.readings?.[0] || undefined,
        suggestion: reportSuggestion.trim() || undefined,
        note: reportNote.trim() || undefined,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportSuccess(false);
        setReportSuggestion('');
        setReportNote('');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setReportError(msg || t('dictionary.reportFailed'));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Safe occurrences array from corpusOccurrences or occurrences
  const occurrences = (entry.corpusOccurrences || entry.occurrences || []).filter(
    (o) => o.count > 0,
  );

  return (
    <div
      data-testid="vocab-detail-view"
      className={`jlpt-vocab-detail space-y-6 ${className}`}
    >
      {/* 1. Main Header Card */}
      <Card className="p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1
                data-testid="vocab-detail-entry"
                className="text-4xl md:text-5xl font-extrabold font-japanese text-slate-900 dark:text-slate-100 tracking-tight"
              >
                {entry.entry}
              </h1>
              {entry.level && (
                <Badge variant="primary" size="md" data-testid="vocab-detail-level">
                  JLPT {entry.level}
                </Badge>
              )}
            </div>

            {/* Readings */}
            {entry.readings && entry.readings.length > 0 && (
              <div
                data-testid="vocab-detail-readings"
                className="text-xl md:text-2xl font-medium font-japanese text-blue-600 dark:text-blue-400"
              >
                【{entry.readings.join('、')}】
              </div>
            )}

            {/* Han-Viet and POS tags */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {entry.hanViet && (
                <span
                  data-testid="vocab-detail-hanviet"
                  className="text-base font-bold px-3 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                >
                  {entry.hanVietConfidence === 'kun'
                    ? `${t('dictionary.hanvietKun')} ${entry.hanViet}`
                    : entry.hanViet}
                </span>
              )}
              {entry.hanVietConfidence === 'review' && (
                <Badge variant="warning" size="md" data-testid="vocab-detail-hanviet-review">
                  {t('dictionary.hanvietReview')}
                </Badge>
              )}
              {entry.posLabels && entry.posLabels.length > 0
                ? entry.posLabels.map((lbl, idx) => (
                    <span
                      key={idx}
                      data-testid="vocab-detail-pos"
                      className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {lbl}
                    </span>
                  ))
                : entry.partOfSpeech && (
                    <span
                      data-testid="vocab-detail-pos"
                      className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {entry.partOfSpeech}
                    </span>
                  )}
            </div>
          </div>

          {/* Action Buttons: Save to Notebook & Report Han-Viet */}
          <div className="flex items-center gap-2 flex-wrap">
            {!user ? (
              <>
                <Button
                  asChild
                  variant="outline"
                  size="md"
                  data-testid="detail-save-notebook-btn"
                >
                  <Link href="/dang-nhap">
                    <NotebookPen className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('dictionary.saveToNotebook')}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="md"
                  data-testid="detail-report-hanviet-btn"
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <Link href="/dang-nhap">
                    <Flag className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('dictionary.reportHanviet')}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  data-testid="detail-save-notebook-btn"
                  loading={isSavingNotebook}
                  onClick={handleSaveToNotebook}
                >
                  <NotebookPen className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('dictionary.saveToNotebook')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  data-testid="detail-report-hanviet-btn"
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  onClick={() => {
                    setIsReportModalOpen(true);
                    setReportSuggestion('');
                    setReportNote('');
                    setReportError(null);
                    setReportSuccess(false);
                  }}
                >
                  <Flag className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('dictionary.reportHanviet')}
                </Button>
              </>
            )}
          </div>
        </div>

        {saveNotice && (
          <Alert variant="success" className="text-xs" data-testid="detail-save-success">
            {saveNotice}
          </Alert>
        )}

        {saveError && (
          <Alert variant="error" className="text-xs" data-testid="detail-save-error">
            {saveError}
          </Alert>
        )}
      </Card>

      {/* 2. Meanings and Senses */}
      <Card className="p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('dictionary.meaningsTitle')}
        </h2>

        {entry.senses && entry.senses.length > 0 ? (
          <div className="space-y-4" data-testid="vocab-senses-list">
            {entry.senses.map((sense, sIdx) => (
              <div
                key={sIdx}
                data-testid="vocab-sense-item"
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {sIdx + 1}.
                  </span>
                  {sense.posLabels && sense.posLabels.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {sense.posLabels.map((lbl, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-900"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                  )}
                  {sense.pos && (!sense.posLabels || sense.posLabels.length === 0) && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                      {sense.pos}
                    </span>
                  )}
                </div>
                <div className="text-sm md:text-base text-slate-800 dark:text-slate-200 pl-4 leading-relaxed">
                  {sense.meanings.join('; ')}
                </div>
              </div>
            ))}
          </div>
        ) : entry.meanings && entry.meanings.length > 0 ? (
          <ol
            data-testid="vocab-meanings-list"
            className="list-decimal list-inside space-y-2 text-base text-slate-800 dark:text-slate-200"
          >
            {entry.meanings.map((meaning, idx) => (
              <li key={idx} className="leading-relaxed">
                {meaning}
              </li>
            ))}
          </ol>
        ) : null}
      </Card>

      {/* 3. Kanji Breakdown Table & Character Details */}
      {((entry.hanVietPerKanji && entry.hanVietPerKanji.length > 0) ||
        (entry.kanji && entry.kanji.length > 0)) && (
        <Card className="p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('dictionary.kanjiDetails')}
            </h2>
            <p className="text-xs text-slate-500">
              Phân tách âm Hán Việt và chi tiết nét, âm On, âm Kun của từng chữ Hán cấu thành từ vựng.
            </p>
          </div>

          {/* Breakdown Table: Chữ Hán - Âm On - Âm Hán Việt */}
          {entry.hanVietPerKanji && entry.hanVietPerKanji.length > 0 && (
            <div className="overflow-x-auto" data-testid="kanji-breakdown-table-wrapper">
              <table
                data-testid="kanji-breakdown-table"
                className="w-full text-left border-collapse text-sm"
              >
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Chữ Hán</th>
                    <th className="py-2.5 px-3">Âm On (Onyomi)</th>
                    <th className="py-2.5 px-3">Âm Hán Việt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {entry.hanVietPerKanji.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-japanese text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {row.kanji}
                      </td>
                      <td className="py-3 px-3 font-japanese text-slate-600 dark:text-slate-300">
                        {row.onyomi || '—'}
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-700 dark:text-amber-400">
                        {row.hanViet}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed Kanji Cards from KANJIDIC2 */}
          {entry.kanji && entry.kanji.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2" data-testid="kanji-cards-grid">
              {entry.kanji.map((k, idx) => (
                <div
                  key={idx}
                  data-testid="kanji-detail-card"
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold font-japanese text-slate-900 dark:text-slate-100">
                      {k.kanji}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {k.strokeCount && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {k.strokeCount} {t('dictionary.strokes')}
                        </span>
                      )}
                      {k.level && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-semibold">
                          {k.level}
                        </span>
                      )}
                      {k.hanViet && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200">
                          {k.hanViet}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-1 pt-1">
                    {k.onyomi && k.onyomi.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-500 mr-2">On:</span>
                        <span className="font-japanese text-slate-800 dark:text-slate-200">
                          {k.onyomi.join('、')}
                        </span>
                      </div>
                    )}
                    {k.kunyomi && k.kunyomi.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-500 mr-2">Kun:</span>
                        <span className="font-japanese text-slate-800 dark:text-slate-200">
                          {k.kunyomi.join('、')}
                        </span>
                      </div>
                    )}
                    {k.meanings && k.meanings.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-500 mr-2">Nghĩa:</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {k.meanings.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 4. Exam Occurrences (Corpus) */}
      <Card className="p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('dictionary.examOccurrences')}
        </h2>

        {occurrences.length > 0 ? (
          <div className="flex flex-wrap gap-3" data-testid="vocab-occurrences-list">
            {occurrences.map((item, idx) => (
              <div
                key={idx}
                data-testid="vocab-occurrence-badge"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-sm font-semibold text-blue-900 dark:text-blue-200"
              >
                <span>{item.level}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-xs">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500" data-testid="vocab-no-occurrences">
            {t('dictionary.noOccurrences')}
          </p>
        )}
      </Card>

      {/* 5. Attribution */}
      <footer className="text-xs text-slate-500 space-y-1">
        <p data-testid="vocab-attribution">
          Dữ liệu từ điển: JMdict và KANJIDIC2 của EDRDG, giấy phép CC BY-SA 4.0 —{' '}
          <a
            href="/gioi-thieu#nguon-du-lieu"
            className="underline hover:text-blue-600 dark:hover:text-blue-400"
          >
            {t('dictionary.attributionLink')}
          </a>.
        </p>
      </footer>

      {/* Han-Viet Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={t('dictionary.reportModalTitle')}
        closeLabel={t('dictionary.cancel')}
      >
        <div className="space-y-4" data-testid="report-hanviet-modal">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {t('dictionary.reportEntryLabel')}{' '}
            <strong className="font-japanese text-slate-900 dark:text-slate-100">{entry.entry}</strong>
            {entry.readings?.[0] ? ` (${entry.readings[0]})` : ''}
          </p>

          {reportError && (
            <Alert variant="error" className="text-xs" data-testid="report-error-alert">
              {reportError}
            </Alert>
          )}

          {reportSuccess ? (
            <Alert variant="success" className="text-xs" data-testid="report-hanviet-success">
              {t('dictionary.reportSent')}
            </Alert>
          ) : (
            <>
              <div>
                <Input
                  id="hanviet-suggestion-input"
                  data-testid="hanviet-suggestion-input"
                  label={t('dictionary.reportSuggestionLabel')}
                  placeholder={t('dictionary.reportSuggestionPlaceholder')}
                  value={reportSuggestion}
                  onChange={(e) => setReportSuggestion(e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  id="hanviet-note-input"
                  data-testid="hanviet-note-input"
                  label={t('dictionary.reportNoteLabel')}
                  placeholder={t('dictionary.reportNotePlaceholder')}
                  rows={3}
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsReportModalOpen(false)}
                >
                  {t('dictionary.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  data-testid="submit-report-btn"
                  loading={isSubmittingReport}
                  onClick={handleSubmitReport}
                >
                  {t('dictionary.sendReport')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
