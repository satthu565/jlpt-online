'use client';

import React, { useState } from 'react';
import { Modal } from './modal.js';
import { Button } from './button.js';
import { Input } from './input.js';

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
      className={`jlpt-share-dialog ${className}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {description && (
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #475569)',
            }}
          >
            {description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
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
            style={{ minWidth: '90px' }}
          >
            {copied ? labels.copied : labels.copyLink}
          </Button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
          }}
        >
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', flex: 1 }}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              style={{ width: '100%' }}
              data-testid="share-twitter-btn"
            >
              🐦 {labels.shareToTwitter || 'Twitter (X)'}
            </Button>
          </a>
          <a
            href={facebookShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', flex: 1 }}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              style={{ width: '100%' }}
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
