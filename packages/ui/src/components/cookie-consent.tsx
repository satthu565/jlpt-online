'use client';

import React from 'react';
import { Cookie } from 'lucide-react';
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
      className={`jlpt-cookie-consent fixed inset-x-0 bottom-0 z-[9999] border-t border-[var(--separator)] bg-[var(--surface)] px-6 py-5 text-[var(--foreground)] shadow-[var(--overlay-shadow)] ${className}`}
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
        <div className="max-w-[800px] flex-[1_1_500px]">
          <h2 className="mb-1.5 flex items-center gap-2 text-base font-bold">
            <Cookie className="size-5 shrink-0" aria-hidden="true" />
            {labels.title}
          </h2>
          <p className="m-0 text-sm leading-normal text-[var(--muted)]">{labels.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
