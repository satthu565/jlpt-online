export const configVersion = '0.1.0';
export const supportedLocales = ['vi', 'ja', 'en'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
