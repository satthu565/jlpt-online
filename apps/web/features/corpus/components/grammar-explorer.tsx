'use client';

import { ArrowRight, PencilLine } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@jlpt/ui/components/card';
import { Input } from '@jlpt/ui/components/input';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { TTSAudioPlayer } from '@jlpt/ui/components/tts-audio-player';
import { Spinner } from '@jlpt/ui/components/spinner';
import { Alert } from '@jlpt/ui/components/alert';
import { CorpusClient } from '../services/corpus-client';
import type { GrammarPatternDto } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface GrammarExplorerProps {
  initialLevel?: string;
  initialPatterns?: GrammarPatternDto[];
  className?: string;
}

export function GrammarExplorer({
  initialLevel = 'ALL',
  initialPatterns,
  className = '',
}: GrammarExplorerProps): React.JSX.Element {
  const { t } = useI18n();
  const [client] = useState(() => new CorpusClient());
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>(initialLevel);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<GrammarPatternDto[]>(() => initialPatterns || []);

  // 1. Fetch real dataset ID dynamically from API (no hardcoded IDs)
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    client
      .listDatasets()
      .then((res) => {
        if (active) {
          if (res.items && res.items.length > 0) {
            setDatasetId(res.items[0]!.id);
          } else {
            setIsLoading(false);
          }
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách tập ngữ liệu');
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [client]);

  // 2. Fetch grammar patterns using the real datasetId
  useEffect(() => {
    if (!datasetId) return;
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    client
      .getGrammar(datasetId, selectedLevel === 'ALL' ? undefined : selectedLevel)
      .then((data) => {
        if (active) {
          setPatterns(data || []);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Không thể tải dữ liệu ngữ pháp');
          setPatterns([]);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, datasetId, selectedLevel]);

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
            <Button
              key={lvl}
              type="button"
              size="sm"
              variant={selectedLevel === lvl ? 'primary' : 'secondary'}
              onClick={() => setSelectedLevel(lvl)}
              data-testid={`grammar-tab-${lvl}`}
              className="text-xs font-bold">
              {lvl}
            </Button>
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
            className="p-6 border border-slate-200 dark:border-slate-800 space-y-4">
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

              <a className="no-underline"
                href={`/luyen-tap?patternId=${encodeURIComponent(pat.patternId)}&level=${pat.level}`}
              >
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  data-testid="practice-pattern-btn"
                >
                  <PencilLine className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('seo.corpus.practicePattern')}
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
                      <ArrowRight className="inline size-4 align-[-2px]" aria-hidden="true" /> {ex.meaning}
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
