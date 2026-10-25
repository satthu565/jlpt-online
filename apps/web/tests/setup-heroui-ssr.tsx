import React from 'react';
import { vi } from 'vitest';

// SSR tests assert application dialog content; portals only exist in a browser.
// Playwright exercises the real HeroUI modal, focus trap and dismissal behavior.
vi.mock('@jlpt/ui/components/exam-controls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@jlpt/ui/components/exam-controls')>();
  return { ...actual, Modal: ({ isOpen, title, children, footer }: import('@jlpt/ui/components/modal').ModalProps) => isOpen ? <section role="dialog" aria-label={title}><h2>{title}</h2>{children}{footer}</section> : null };
});
