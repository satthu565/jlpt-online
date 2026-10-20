// Shared by the client consent store and the server layout (no 'use client', so plain values reach the server).
export const CONSENT_STORAGE_KEY = 'jlpt_cookie_consent';
export const CONSENT_COOKIE_NAME = 'jlpt_consent';

/**
 * Inline <head> script: marks <html data-consent="set"> when a choice is stored, so the server-rendered
 * banner is hidden by CSS before the first paint (no flash for returning visitors).
 */
export const CONSENT_HEAD_SCRIPT = `try{var v=localStorage.getItem('${CONSENT_STORAGE_KEY}');if(v==='all'||v==='necessary'||/(?:^|; )${CONSENT_COOKIE_NAME}=(all|necessary)/.test(document.cookie))document.documentElement.dataset.consent='set'}catch(e){}`;
