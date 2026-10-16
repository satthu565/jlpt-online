'use client';

import { hasAnalyticsConsent } from './consent';

export interface AttributionData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  ref?: string;
  referrer?: string;
  capturedAt: string;
}

export const ATTRIBUTION_STORAGE_KEY = 'jlpt_traffic_attribution';

export function captureTrafficAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null;

  // Acceptance 2 & SEO-11: Consent-aware analytics
  if (!hasAnalyticsConsent()) {
    return null;
  }

  try {
    const url = new URL(window.location.href);
    const utmSource = url.searchParams.get('utm_source') || undefined;
    const utmMedium = url.searchParams.get('utm_medium') || undefined;
    const utmCampaign = url.searchParams.get('utm_campaign') || undefined;
    const utmTerm = url.searchParams.get('utm_term') || undefined;
    const utmContent = url.searchParams.get('utm_content') || undefined;
    const ref = url.searchParams.get('ref') || undefined;
    const referrer = document.referrer ? new URL(document.referrer).hostname : undefined;

    if (utmSource || utmMedium || utmCampaign || ref || referrer) {
      const data: AttributionData = {
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        ref,
        referrer,
        capturedAt: new Date().toISOString(),
      };

      sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch {
    // Inaccessible storage
  }

  return null;
}

export function getStoredAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null;
  if (!hasAnalyticsConsent()) return null;

  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AttributionData;
    }
  } catch {
    // Ignored
  }
  return null;
}
