'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Input, Button, Badge, Alert, TTSAudioPlayer, Spinner } from '@jlpt/ui';
import { CorpusClient } from '../services/corpus-client';
import type { VocabTermDto } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface VocabExplorerProps {
  initialLevel?: string;
  initialItems?: VocabTermDto[];
  className?: string;
}

export function VocabExplorer({
  initialLevel = 'ALL',
  initialItems,
  className = '',
}: VocabExplorerProps): React.JSX.Element {
  const { t } = useI18n();
  const [client] = useState(() => new CorpusClient());
  const [selectedLevel, setSelectedLevel] = useState<string>(initialLevel);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<VocabTermDto[]>(() => initialItems || [
    {
      term: '曖昧',
      reading: 'あいまい',
      meaning: 'Mơ hồ, không rõ ràng, lập lờ',
      level: 'N1',
      frequency: 48,
      partOfSpeech: 'Tính từ đuôi な / Danh từ',
      exampleSentence: '曖昧な返事をして相手を困らせた。',
      exampleReading: 'あいまいなへんじをしてあいてをこまらせた。',
      exampleMeaning: 'Tôi đã trả lời lập lờ khiến đối phương bối rối.',
    },
    {
      term: '徹底',
      reading: 'てってい',
      meaning: 'Triệt để, thấu đáo',
      level: 'N2',
      frequency: 72,
      partOfSpeech: 'Danh từ / Động từ nhóm 3',
      exampleSentence: '安全管理を徹底する必要がある。',
      exampleReading: 'あんぜんかんりをてっていするひつようがある。',
      exampleMeaning: 'Cần phải triệt để quản lý an toàn.',
    },
    {
      term: '納得',
      reading: 'なっとく',
      meaning: 'Thấu hiểu, đồng ý, bị thuyết phục',
      level: 'N3',
      frequency: 110,
      partOfSpeech: 'Danh từ / Động từ nhóm 3',
      exampleSentence: '説明を聞いて納得した。',
      exampleReading: 'せつめいをきいてなっとくした。',
      exampleMeaning: 'Sau khi nghe giải thích tôi đã hiểu và bị thuyết phục.',
    },
    {
      term: '複雑',
      reading: 'ふくざつ',
      meaning: 'Phức tạp, rắc rối',
      level: 'N4',
      frequency: 95,
      partOfSpeech: 'Tính từ đuôi な',
      exampleSentence: 'この機械は構造が複雑だ。',
      exampleReading: 'このきかいはこうぞうがふくざつだ。',
      exampleMeaning: 'Cỗ máy này có cấu trúc phức tạp.',
    },
    {
      term: '便利',
      reading: 'べんり',
      meaning: 'Tiện lợi, thuận tiện',
      level: 'N5',
      frequency: 160,
      partOfSpeech: 'Tính từ đuôi な',
      exampleSentence: '駅の近くは便利です。',
      exampleReading: 'えきのちかくはべんりです。',
      exampleMeaning: 'Khu vực gần nhà ga rất tiện lợi.',
    },
  ]);

  const [savingTerm, setSavingTerm] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [saveErrorNotice, setSaveErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    client
      .getVocabulary('jlpt-official', selectedLevel === 'ALL' ? undefined : selectedLevel)
      .then((data) => {
        if (active && data && data.length > 0) {
          setItems(data);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Không thể tải dữ liệu từ vựng');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, selectedLevel]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedLevel !== 'ALL' && item.level !== selectedLevel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTerm = item.term.toLowerCase().includes(q);
        const matchReading = item.reading.toLowerCase().includes(q);
        const matchMeaning = item.meaning.toLowerCase().includes(q);
        if (!matchTerm && !matchReading && !matchMeaning) return false;
      }
      return true;
    });
  }, [items, selectedLevel, searchQuery]);

  const handleSaveToNotebook = async (item: VocabTermDto) => {
    try {
      setSavingTerm(item.term);
      setSaveSuccessNotice(null);
      setSaveErrorNotice(null);
      await client.addToNotebook('jlpt-official', item.term, item.reading, item.meaning);
      setSaveSuccessNotice(t('seo.corpus.addedToNotebook'));
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch {
      setSaveErrorNotice(t('seo.corpus.saveFailed') || 'Không thể lưu từ vào sổ tay. Vui lòng thử lại sau.');
      setTimeout(() => setSaveErrorNotice(null), 4000);
    } finally {
      setSavingTerm(null);
    }
  };

  const levels = ['ALL', 'N1', 'N2', 'N3', 'N4', 'N5'];

  return (
    <div
      data-testid="vocab-explorer"
      className={`jlpt-vocab-explorer space-y-6 ${className}`}
    >
      {/* Header controls: Search & Level Tabs */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-full md:w-96">
          <Input
            id="vocab-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('seo.corpus.searchPlaceholder')}
            data-testid="vocab-search-input"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap" data-testid="level-tabs">
          {levels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              data-testid={`level-tab-${lvl}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedLevel === lvl
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {saveSuccessNotice && (
        <Alert variant="success" className="text-xs" data-testid="notebook-save-notice">
          {saveSuccessNotice}
        </Alert>
      )}

      {saveErrorNotice && (
        <Alert variant="error" className="text-xs" data-testid="notebook-save-error">
          {saveErrorNotice}
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-6" data-testid="vocab-loading-spinner">
          <Spinner size="md" aria-label="Đang tải dữ liệu từ vựng..." />
        </div>
      )}

      {loadError && (
        <Alert variant="error" className="text-xs" data-testid="vocab-load-error">
          {loadError}
        </Alert>
      )}

      {/* Vocab Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="vocab-cards-grid">
        {filteredItems.map((item) => (
          <Card
            key={item.term}
            data-testid="vocab-term-card"
            className="p-5 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-japanese text-slate-900 dark:text-slate-100">
                    {item.term}
                  </h3>
                  <span className="text-xs font-japanese text-slate-500">
                    【{item.reading}】
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                  {item.meaning}
                </p>
                {item.partOfSpeech && (
                  <span className="text-[11px] text-slate-400">
                    {item.partOfSpeech}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant={
                    item.level === 'N1'
                      ? 'danger'
                      : item.level === 'N2'
                        ? 'warning'
                        : item.level === 'N3'
                          ? 'primary'
                          : 'neutral'
                  }
                  size="sm"
                >
                  {item.level}
                </Badge>
                <span className="text-[10px] text-slate-400">
                  Tần suất: {item.frequency} lần
                </span>
              </div>
            </div>

            {/* Example sentence */}
            {item.exampleSentence && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
                <p className="font-japanese font-medium text-slate-800 dark:text-slate-200">
                  {item.exampleSentence}
                </p>
                {item.exampleMeaning && (
                  <p className="text-slate-500 text-[11px]">
                    👉 {item.exampleMeaning}
                  </p>
                )}
              </div>
            )}

            {/* Bottom Actions: TTS & Add to Notebook */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <TTSAudioPlayer
                text={item.term}
                voice="ja-JP-Standard-A"
                status="SANDBOX"
                isExternal={false}
                onFetchAudio={() => client.synthesizePronunciation(item.term)}
                labels={{
                  play: t('seo.tts.play'),
                  pause: t('seo.tts.pause'),
                  loading: t('seo.tts.loading'),
                  sandboxNotice: t('seo.tts.sandboxNotice'),
                  errorNotice: t('seo.tts.errorNotice'),
                }}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={savingTerm === item.term}
                onClick={() => handleSaveToNotebook(item)}
                data-testid="add-to-notebook-btn"
              >
                📓 {t('seo.corpus.addToNotebook')}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          Không tìm thấy từ vựng nào phù hợp.
        </div>
      )}
    </div>
  );
}
