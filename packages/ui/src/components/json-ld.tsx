import React from 'react';

export interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
  id?: string;
}

/**
 * Safely serializes and renders schema.org structured data (JSON-LD)
 * Prevents HTML escaping issues while escaping potential closing script tags.
 */
export function JsonLd({ data, id }: JsonLdProps): React.JSX.Element {
  const jsonString = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
