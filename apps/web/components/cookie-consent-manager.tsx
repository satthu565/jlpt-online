'use client';

import React, { useState, useEffect } from 'react';
import { CookieConsentBanner } from '@jlpt/ui/components/cookie-consent';
import { getConsentStatus, setConsentStatus } from '../lib/consent';
import { captureTrafficAttribution } from '../lib/attribution';
import { useI18n } from '../lib/i18n';

export function CookieConsentManager(): React.JSX.Element | null {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const status = getConsentStatus();
    if (status === 'undetermined') {
      setIsOpen(true);
    }
  }, []);

  const handleAcceptAll = () => {
    setConsentStatus('all');
    setIsOpen(false);
    captureTrafficAttribution();
  };

  const handleRejectAnalytics = () => {
    setConsentStatus('necessary');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <CookieConsentBanner
      isOpen={isOpen}
      onAcceptAll={handleAcceptAll}
      onRejectAnalytics={handleRejectAnalytics}
      labels={{
        title: t('seo.consent.bannerTitle'),
        description: t('seo.consent.bannerDescription'),
        acceptAll: t('seo.consent.acceptAll'),
        rejectAnalytics: t('seo.consent.rejectAnalytics'),
        customize: t('seo.consent.customize'),
      }}
    />
  );
}
