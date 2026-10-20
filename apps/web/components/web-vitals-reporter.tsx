'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '../lib/web-vitals';
import { captureTrafficAttribution } from '../lib/attribution';

export function WebVitalsReporter(): null {
  useEffect(() => {
    // Capture traffic attribution (SEO-11)
    captureTrafficAttribution();

    // Native PerformanceObserver implementation to avoid 16KB next/web-vitals bundle
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      // 1. Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          const val = Math.round(lastEntry.startTime);
          reportWebVitals({
            id: 'lcp',
            name: 'LCP',
            value: val,
            delta: val,
            rating: val < 2500 ? 'good' : val < 4000 ? 'needs-improvement' : 'poor',
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // 2. Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as { hadRecentInput?: boolean }).hadRecentInput) {
            clsValue += (entry as { value?: number }).value || 0;
          }
        }
        reportWebVitals({
          id: 'cls',
          name: 'CLS',
          value: clsValue,
          delta: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // 3. First Contentful Paint (FCP)
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            const val = Math.round(entry.startTime);
            reportWebVitals({
              id: 'fcp',
              name: 'FCP',
              value: val,
              delta: val,
              rating: val < 1800 ? 'good' : val < 3000 ? 'needs-improvement' : 'poor',
            });
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch {
      // Graceful fallback on unsupported browsers
    }
  }, []);

  return null;
}
