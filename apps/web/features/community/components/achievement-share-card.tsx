'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Input } from '@jlpt/ui/components/input';
import { Trophy, Shield, Check, Link2 } from 'lucide-react';
import type { AchievementShareData } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface AchievementShareCardProps {
  data: AchievementShareData;
  onCopyLink?: (url: string) => void;
}

export function AchievementShareCard({
  data,
  onCopyLink,
}: AchievementShareCardProps): React.JSX.Element {
  const { t } = useI18n();

  const [hideRealName, setHideRealName] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayName = hideRealName
    ? t('community.share.anonymousLearner')
    : data.userName || t('community.share.defaultLearner');

  const shareUrl = data.shareUrl || `https://jlpt.online/share/${data.type}-${Date.now()}`;

  const handleCopy = () => {
    if (onCopyLink) {
      onCopyLink(shareUrl);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card data-testid="achievement-share-card">
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>{t('community.share.cardTitle')}</CardTitle>
        <Badge variant="primary">{data.badge}</Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {/* Visual Achievement Card */}
        <div className="p-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-center shadow-md flex flex-col items-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-white/20 mb-2">
            <Trophy className="size-8 text-amber-300" />
          </div>
          <h3 className="text-2xl font-extrabold m-0 mb-2 text-white">
            {data.title}
          </h3>
          <p className="m-0 mb-4 opacity-90 text-sm">
            {t('community.share.congratulations', { name: displayName })}
          </p>

          <div className="inline-flex gap-4 bg-white/20 px-4 py-2 rounded-lg text-sm">
            {data.level && <span><strong>{data.level}</strong></span>}
            {data.score !== undefined && <span>{t('community.share.scoreLabel', { score: String(data.score) })}</span>}
            {data.streakDays !== undefined && <span>{t('community.share.streakLabel', { days: String(data.streakDays) })}</span>}
          </div>
        </div>

        {/* Privacy Option */}
        <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
          <Input
            type="checkbox"
            checked={hideRealName}
            onChange={(e) => setHideRealName(e.target.checked)}
            data-testid="hide-name-toggle"
            className="size-4 min-h-0 cursor-pointer"
          />
          <span className="flex items-center gap-1.5">
            <Shield className="size-4 text-[var(--color-primary)]" />
            <span>{t('community.share.hideNameOption')}</span>
          </span>
        </label>

        {/* Share Action */}
        <div className="flex justify-end gap-3">
          <Button
            variant="primary"
            onClick={handleCopy}
            data-testid="copy-share-link-button"
            className="flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                <span>{t('community.share.copied')}</span>
              </>
            ) : (
              <>
                <Link2 className="size-4" />
                <span>{t('community.share.copyLink')}</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
