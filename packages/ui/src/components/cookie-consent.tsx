'use client';

import React from 'react';
import { Button } from './button.js';

export interface CookieConsentBannerProps {
  isOpen: boolean;
  onAcceptAll: () => void;
  onRejectAnalytics: () => void;
  onCustomize?: () => void;
  labels: {
    title: string;
    description: string;
    acceptAll: string;
    rejectAnalytics: string;
    customize?: string;
  };
  className?: string;
}

export function CookieConsentBanner({
  isOpen,
  onAcceptAll,
  onRejectAnalytics,
  onCustomize,
  labels,
  className = '',
}: CookieConsentBannerProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <aside
      role="region"
      aria-label={labels.title}
      data-testid="cookie-consent-banner"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '1.25rem 1.5rem',
        backgroundColor: 'var(--bg-surface, #ffffff)',
        color: 'var(--text-primary, #0f172a)',
        borderTop: '1px solid var(--border-subtle, #e2e8f0)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
      }}
      className={`jlpt-cookie-consent ${className}`}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ flex: '1 1 500px', maxWidth: '800px' }}>
          <h3
            style={{
              margin: '0 0 0.375rem 0',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span role="img" aria-hidden="true">
              🍪
            </span>
            {labels.title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              lineHeight: 1.5,
              color: 'var(--text-secondary, #475569)',
            }}
          >
            {labels.description}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {onCustomize && labels.customize && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCustomize}
              data-testid="consent-customize-btn"
            >
              {labels.customize}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRejectAnalytics}
            data-testid="consent-reject-btn"
          >
            {labels.rejectAnalytics}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onAcceptAll}
            data-testid="consent-accept-btn"
          >
            {labels.acceptAll}
          </Button>
        </div>
      </div>
    </aside>
  );
}
