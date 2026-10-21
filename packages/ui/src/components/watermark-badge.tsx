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
      className={`jlpt-watermark inline-flex max-w-full select-none items-center gap-2 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1.5 font-mono text-[0.6875rem] tracking-wide text-[var(--muted)] [overflow-wrap:anywhere] ${className}`}
    >
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      <span>
        [JLPT-SECURE-WATERMARK] ID:{maskedId} | TIME:{timestamp} | {notice}
      </span>
    </div>
  );
}
