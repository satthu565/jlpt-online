'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Input, Button, Badge, TTSAudioPlayer, Spinner, Alert } from '@jlpt/ui';
import { CorpusClient } from '../services/corpus-client';
import type { GrammarPatternDto } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface GrammarExplorerProps {
  initialLevel?: string;
  initialPatterns?: GrammarPatternDto[];
  className?: string;
}

const DEFAULT_GRAMMAR_PATTERNS: GrammarPatternDto[] = [
  {
    patternId: 'gp-n1-01',
    pattern: '〜を皮切りに（して） / 〜を皮切りとして',
    meaning: 'Khởi đầu với..., mở màn bằng... (sau đó diễn ra hàng loạt hành động tương tự)',
    level: 'N1',
    formation: 'Danh từ + を皮切りに（して） / を皮切りとして',
    examples: [
      {
        sentence: '東京公演を皮切りに、全国ツアーが始まった。',
        reading: 'とうきょうこうえんをかわきりに、ぜんこくツアーがはじまった。',
        meaning: 'Khởi đầu bằng buổi diễn ở Tokyo, chuyến lưu diễn toàn quốc đã bắt đầu.',
      },
    ],
  },
  {
    patternId: 'gp-n2-01',
    pattern: '〜に際して / 〜に際し',
    meaning: 'Nhân dịp..., khi bắt đầu làm một việc quan trọng...',
    level: 'N2',
    formation: 'Động từ thể từ điển / Danh từ + に際して',
    examples: [
      {
        sentence: '留学に際して、多くの人から温かい励ましを受けた。',
        reading: 'りゅうがくにさいして、おおくのひとからあたたかいはげましをうけた。',
        meaning: 'Nhân dịp đi du học, tôi đã nhận được sự động viên ấm áp từ nhiều người.',
      },
    ],
  },
  {
    patternId: 'gp-n3-01',
    pattern: '〜わけにはいかない',
    meaning: 'Không thể nào... (vì lý do đạo đức, xã hội, tâm lý chứ không phải khả năng)',
    level: 'N3',
    formation: 'Động từ thể từ điển / thể ない + わけにはいかない',
    examples: [
      {
        sentence: '大事な会議があるので、仕事を休むわけにはいかない。',
        reading: 'だいじなかいぎがあるので、しごとをやすむわけにはいかない。',
        meaning: 'Vì có cuộc họp quan trọng nên tôi không thể nào nghỉ làm được.',
      },
    ],
  },
  {
    patternId: 'gp-n4-01',
    pattern: '〜てはいけない',
    meaning: 'Không được phép làm...',
    level: 'N4',
    formation: 'Động từ thể て + はいけない',
    examples: [
      {
        sentence: 'ここで写真を撮ってはいけません。',
        reading: 'ここでしゃしんをとってはいけません。',
        meaning: 'Không được chụp ảnh ở đây.',
      },
    ],
  },
  {
    patternId: 'gp-n5-01',
    pattern: '〜から〜まで',
    meaning: 'Từ... đến...',
    level: 'N5',
    formation: 'Danh từ (thời gian/địa điểm) + から + Danh từ + まで',
    examples: [
      {
        sentence: '銀行は午前9時から午後3時までです。',
        reading: 'ぎんこうはごぜんくじからごごさんじまでです。',
        meaning: 'Ngân hàng mở cửa từ 9 giờ sáng đến 3 giờ chiều.',
      },
    ],
  },
];

export function GrammarExplorer({
  initialLevel = 'ALL',
  initialPatterns,
  className = '',
}: GrammarExplorerProps): React.JSX.Element {
  const { t } = useI18n();
  const [client] = useState(() => new CorpusClient());
  const [selectedLevel, setSelectedLevel] = useState<string>(initialLevel);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<GrammarPatternDto[]>(() => initialPatterns || DEFAULT_GRAMMAR_PATTERNS);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    client
      .getGrammar('jlpt-official', selectedLevel === 'ALL' ? undefined : selectedLevel)
      .then((data) => {
        if (active) {
          setPatterns(data || []);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Không thể tải dữ liệu ngữ pháp');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, selectedLevel]);

  const filteredPatterns = useMemo(() => {
    return patterns.filter((p) => {
      if (selectedLevel !== 'ALL' && p.level !== selectedLevel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPattern = p.pattern.toLowerCase().includes(q);
        const matchMeaning = p.meaning.toLowerCase().includes(q);
        if (!matchPattern && !matchMeaning) return false;
      }
      return true;
    });
  }, [patterns, selectedLevel, searchQuery]);

  const levels = ['ALL', 'N1', 'N2', 'N3', 'N4', 'N5'];

  return (
    <div
      data-testid="grammar-explorer"
      className={`jlpt-grammar-explorer space-y-6 ${className}`}
    >
      {/* Search and Tabs */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-full md:w-96">
          <Input
            id="grammar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm mẫu ngữ pháp..."
            data-testid="grammar-search-input"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap" data-testid="grammar-level-tabs">
          {levels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              data-testid={`grammar-tab-${lvl}`}
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

      {isLoading && (
        <div className="flex justify-center items-center py-6" data-testid="grammar-loading-spinner">
          <Spinner size="md" aria-label="Đang tải dữ liệu ngữ pháp..." />
        </div>
      )}

      {loadError && (
        <Alert variant="error" className="text-xs" data-testid="grammar-load-error">
          {loadError}
        </Alert>
      )}

      {/* Patterns Grid */}
      <div className="space-y-4" data-testid="grammar-cards-list">
        {filteredPatterns.map((pat) => (
          <Card
            key={pat.patternId}
            data-testid="grammar-pattern-card"
            className="p-6 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-japanese text-slate-900 dark:text-slate-100">
                    {pat.pattern}
                  </h3>
                  <Badge
                    variant={
                      pat.level === 'N1'
                        ? 'danger'
                        : pat.level === 'N2'
                          ? 'warning'
                          : pat.level === 'N3'
                            ? 'primary'
                            : 'neutral'
                    }
                    size="sm"
                  >
                    {pat.level}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                  Ý nghĩa: {pat.meaning}
                </p>
              </div>

              <a
                href={`/luyen-tap?patternId=${encodeURIComponent(pat.patternId)}&level=${pat.level}`}
                style={{ textDecoration: 'none' }}
              >
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  data-testid="practice-pattern-btn"
                >
                  📝 {t('seo.corpus.practicePattern')}
                </Button>
              </a>
            </div>

            {/* Formation */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Cấu trúc kết hợp:
              </span>
              <code className="font-japanese font-semibold text-blue-700 dark:text-blue-300">
                {pat.formation}
              </code>
            </div>

            {/* Examples */}
            {pat.examples.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Ví dụ minh họa:
                </span>
                {pat.examples.map((ex, idx) => (
                  <div key={idx} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-japanese font-medium text-slate-800 dark:text-slate-200">
                        {ex.sentence}
                      </p>
                      <TTSAudioPlayer
                        text={ex.sentence}
                        status="SANDBOX"
                        isExternal={false}
                        labels={{
                          play: t('seo.tts.play'),
                          pause: t('seo.tts.pause'),
                          loading: t('seo.tts.loading'),
                          sandboxNotice: t('seo.tts.sandboxNotice'),
                          errorNotice: t('seo.tts.errorNotice'),
                        }}
                      />
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      👉 {ex.meaning}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
