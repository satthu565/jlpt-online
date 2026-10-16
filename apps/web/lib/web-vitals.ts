'use client';

import { hasAnalyticsConsent } from './consent';

export interface WebVitalMetric {
  id: string;
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType?: string;
}

export function reportWebVitals(metric: WebVitalMetric): void {
  // Acceptance 2 & 4: Consent-aware Core Web Vitals instrumentation
  if (!hasAnalyticsConsent()) {
    return;
  }

  // Sanitize metric before dispatching to beacon
  const payload = {
    id: metric.id,
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    page: typeof window !== 'undefined' ? window.location.pathname : '',
    timestamp: Date.now(),
  };

  // Dispatch via sendBeacon or fetch without blocking page lifecycle
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/v1/analytics/vitals', blob);
    } catch {
      // Ignored
    }
  }
}
