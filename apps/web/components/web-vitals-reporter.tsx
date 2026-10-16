'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVitals, type WebVitalMetric } from '../lib/web-vitals';
import { captureTrafficAttribution } from '../lib/attribution';

export function WebVitalsReporter(): null {
  useReportWebVitals((metric) => {
    reportWebVitals(metric as unknown as WebVitalMetric);
  });

  useEffect(() => {
    // Capture traffic attribution (SEO-11)
    captureTrafficAttribution();
  }, []);

  return null;
}
