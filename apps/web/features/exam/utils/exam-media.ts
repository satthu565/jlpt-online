import type { PublicSection } from '@jlpt/schema';

export function mediaUrl(value: string): string {
  // The API proxy also works when the web build runs inside a separate container.
  if (/^\/?media\//i.test(value)) return `/api/v1/${value.replace(/^\//, '')}`;
  return /^(https?:\/\/|\/)/i.test(value) ? value : `/${value}`;
}

export function isListeningSection(section: PublicSection | undefined): boolean {
  return Boolean(section && (section.code.toLowerCase().includes('listen') || section.title.includes('聴解') || section.groups.some(group => ['task_based', 'point', 'summary', 'utterance', 'quick_response', 'integrated_listening'].includes(group.mondaiType))));
}
