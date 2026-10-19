'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@jlpt/ui';
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
      <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CardTitle>{t('community.share.cardTitle')}</CardTitle>
        <Badge variant="primary">{data.badge}</Badge>
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Visual Achievement Card */}
        <div
          style={{
            padding: '2rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#ffffff',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
            {data.title}
          </h3>
          <p style={{ margin: '0 0 1rem 0', opacity: 0.9 }}>
            {t('community.share.congratulations', { name: displayName })}
          </p>

          <div style={{ display: 'inline-flex', gap: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
            {data.level && <span><strong>{data.level}</strong></span>}
            {data.score !== undefined && <span>{t('community.share.scoreLabel', { score: String(data.score) })}</span>}
            {data.streakDays !== undefined && <span>{t('community.share.streakLabel', { days: String(data.streakDays) })}</span>}
          </div>
        </div>

        {/* Privacy Option */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Input
            type="checkbox"
            checked={hideRealName}
            onChange={(e) => setHideRealName(e.target.checked)}
            data-testid="hide-name-toggle"
            className="h-4 w-4 min-h-0 cursor-pointer"
          />
          <span>🛡️ {t('community.share.hideNameOption')}</span>
        </label>

        {/* Share Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button
            variant="primary"
            onClick={handleCopy}
            data-testid="copy-share-link-button"
          >
            {copied ? `✓ ${t('community.share.copied')}` : `🔗 ${t('community.share.copyLink')}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
