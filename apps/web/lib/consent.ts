'use client';

export type ConsentStatus = 'undetermined' | 'necessary' | 'all';

export const CONSENT_STORAGE_KEY = 'jlpt_cookie_consent';
export const CONSENT_COOKIE_NAME = 'jlpt_consent';

let memoryConsent: ConsentStatus = 'undetermined';

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return memoryConsent;

  try {
    const val = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === 'all' || val === 'necessary') {
      return val;
    }
  } catch {
    // LocalStorage might be disabled in private mode
  }
  return memoryConsent;
}

export function setConsentStatus(status: 'necessary' | 'all' | 'undetermined'): void {
  memoryConsent = status;
  if (typeof window === 'undefined') return;

  try {
    if (status === 'undetermined') {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    } else {
      localStorage.setItem(CONSENT_STORAGE_KEY, status);
      const maxAge = 365 * 24 * 60 * 60; // 1 year
      document.cookie = `${CONSENT_COOKIE_NAME}=${status}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  } catch {
    // Inaccessible storage
  }
}

export function hasAnalyticsConsent(): boolean {
  return getConsentStatus() === 'all';
}
