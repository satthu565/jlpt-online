import React from 'react';

export interface SkipToContentProps {
  targetId?: string;
  label?: string;
  className?: string;
}

export function SkipToContent({
  targetId = 'main-content',
  label = 'Chuyển đến nội dung chính',
  className = '',
}: SkipToContentProps): React.JSX.Element {
  return (
    <a href={`#${targetId}`} className={`skip-link ${className}`}>
      {label}
    </a>
  );
}
