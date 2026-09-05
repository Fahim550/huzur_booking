export const LOCALES = ['bn', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'bn';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export function isValidLocale(locale: string): locale is Locale {
  return (LOCALES as readonly string[]).includes(locale);
}
