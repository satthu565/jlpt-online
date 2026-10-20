import { ShieldCheck } from 'lucide-react';
import React from 'react';

export interface WatermarkBadgeProps {
  userId?: string;
  timestamp?: string;
  notice?: string;
  className?: string;
}

/**
 * Watermark component for paid and protected content (SYS-17)
 * Embeds anti-tamper watermark into views, score reports, and PDF exports.
 */
export function WatermarkBadge({
  userId = 'GUEST',
  timestamp = new Date().toISOString(),
  notice = 'BẢN QUYỀN THUỘC JLPT ONLINE - NGHIÊM CẤM SAO CHÉP & PHÁT TÁN TRÁI PHÉP',
  className = '',
}: WatermarkBadgeProps): React.JSX.Element {
  const maskedId =
    userId.length > 8 ? `${userId.slice(0, 4)}...${userId.slice(-4)}` : userId;

  return (
    <div
      data-testid="security-watermark"
      className={`jlpt-watermark ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.375rem 0.75rem',
        backgroundColor: 'rgba(241, 245, 249, 0.8)',
        border: '1px dashed #cbd5e1',
        borderRadius: '6px',
        fontSize: '0.6875rem',
        color: '#64748b',
        fontFamily: 'monospace',
        letterSpacing: '0.025em',
        userSelect: 'none',
        maxWidth: '100%',
        overflowWrap: 'anywhere',
      }}
    >
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      <span>
        [JLPT-SECURE-WATERMARK] ID:{maskedId} | TIME:{timestamp} | {notice}
      </span>
    </div>
  );
}
