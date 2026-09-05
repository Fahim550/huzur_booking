import { Locale, DEFAULT_LOCALE } from './config';
import { bn, Dictionary } from './dictionaries/bn';
import { en } from './dictionaries/en';

const dictionaries: Record<Locale, Dictionary> = {
  bn,
  en,
};

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
}
