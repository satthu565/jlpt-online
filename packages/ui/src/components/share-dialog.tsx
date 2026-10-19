'use client';

import React, { useState } from 'react';
import { Modal } from './modal.js';
import { Button } from './button.js';
import { Input } from './input.js';
import { cn } from '../lib/utils.js';

export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
  labels: {
    dialogTitle: string;
    copyLink: string;
    copied: string;
    close: string;
    shareToTwitter?: string;
    shareToFacebook?: string;
  };
  className?: string;
}

export function ShareDialog({
  isOpen,
  onClose,
  url,
  title,
  description,
  labels,
  className = '',
}: ShareDialogProps): React.JSX.Element | null {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    title,
  )}&url=${encodeURIComponent(url)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url,
  )}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={labels.dialogTitle}
      className={cn('jlpt-share-dialog', className)}
    >
      <div className="flex flex-col gap-4">
        {description && (
          <p className="m-0 text-sm text-[var(--text-secondary,#475569)] dark:text-[var(--text-muted,#94a3b8)]">
            {description}
          </p>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label={labels.copyLink}
              id="share-link-input"
              value={url}
              readOnly
              data-testid="share-link-input"
            />
          </div>
          <Button
            type="button"
            variant={copied ? 'primary' : 'outline'}
            onClick={handleCopy}
            data-testid="share-copy-btn"
            className="min-w-[90px]"
          >
            {copied ? labels.copied : labels.copyLink}
          </Button>
        </div>

        <div className="flex gap-3 pt-2 border-t border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#334155)]">
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline flex-1"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="share-twitter-btn"
            >
              🐦 {labels.shareToTwitter || 'Twitter (X)'}
            </Button>
          </a>
          <a
            href={facebookShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline flex-1"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="share-facebook-btn"
            >
              📘 {labels.shareToFacebook || 'Facebook'}
            </Button>
          </a>
        </div>
      </div>
    </Modal>
  );
}
