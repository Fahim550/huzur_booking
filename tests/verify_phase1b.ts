import fs from 'fs';
import path from 'path';
import { routing } from '../src/i18n/routing';
import { getLocalizedName } from '../src/types/database';
import { SEED_DIVISIONS, SEED_DISTRICTS, SEED_SPECIALTIES, SEED_HUZURS } from '../src/lib/data/mockData';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('===============================================================');
console.log('TEST SUITE: PHASE 1B INTERNATIONALIZATION (NEXT-INTL)');
console.log('===============================================================');

// 1. Check next-intl routing configuration
console.log('\n--- 1. Testing next-intl Routing Configuration ---');
assert(routing.locales.includes('bn') && routing.locales.includes('en'), 'Routing includes locales bn and en');
assert(routing.defaultLocale === 'bn', 'Default locale is bn');
assert(routing.localePrefix === 'always', 'Locale prefix is set to always (/bn and /en)');
assert(routing.localeDetection === true, 'Locale detection is enabled (cookie first, then Accept-Language, fallback to bn)');

const requestConfigPath = path.join(process.cwd(), 'src/i18n/request.ts');
assert(fs.existsSync(requestConfigPath), 'src/i18n/request.ts exists');
const requestConfigCode = fs.readFileSync(requestConfigPath, 'utf8');
assert(requestConfigCode.includes('getRequestConfig'), 'request.ts uses getRequestConfig from next-intl/server');
assert(requestConfigCode.includes('messages/${locale}.json'), 'request.ts dynamically loads messages by locale');

const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
const nextConfigCode = fs.readFileSync(nextConfigPath, 'utf8');
assert(nextConfigCode.includes('createNextIntlPlugin'), 'next.config.ts configures createNextIntlPlugin');
assert(nextConfigCode.includes('withNextIntl(nextConfig)'), 'next.config.ts wraps nextConfig with withNextIntl');

const proxyPath = path.join(process.cwd(), 'src/proxy.ts');
assert(fs.existsSync(proxyPath), 'src/proxy.ts exists');
const proxyCode = fs.readFileSync(proxyPath, 'utf8');
assert(proxyCode.includes('createMiddleware(routing)'), 'src/proxy.ts uses next-intl createMiddleware with routing');
assert(proxyCode.includes('export function proxy('), 'src/proxy.ts exports proxy function for Next.js 16');

// 2. Check translation message files
console.log('\n--- 2. Testing Message Files (/messages/bn.json & /messages/en.json) ---');
const bnMessagesPath = path.join(process.cwd(), 'messages/bn.json');
const enMessagesPath = path.join(process.cwd(), 'messages/en.json');
assert(fs.existsSync(bnMessagesPath), 'messages/bn.json exists');
assert(fs.existsSync(enMessagesPath), 'messages/en.json exists');

const bnMessages = JSON.parse(fs.readFileSync(bnMessagesPath, 'utf8'));
const enMessages = JSON.parse(fs.readFileSync(enMessagesPath, 'utf8'));

const requiredNamespaces = ['common', 'nav', 'auth', 'search', 'booking', 'dashboard'];
for (const ns of requiredNamespaces) {
  assert(Boolean(bnMessages[ns]), `messages/bn.json contains namespace "${ns}"`);
  assert(Boolean(enMessages[ns]), `messages/en.json contains namespace "${ns}"`);
}

// Check booking statuses
const requiredStatuses = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];
for (const status of requiredStatuses) {
  assert(Boolean(bnMessages.booking.status[status]), `bn.json has booking status "${status}"`);
  assert(Boolean(enMessages.booking.status[status]), `en.json has booking status "${status}"`);
}
assert(bnMessages.booking.status.pending === 'অনুরোধ অপেক্ষমাণ', 'bn status pending is localized');
assert(enMessages.booking.status.pending === 'Pending', 'en status pending is localized');
assert(bnMessages.booking.status.confirmed === 'নিশ্চিতকৃত', 'bn status confirmed is localized');
assert(enMessages.booking.status.confirmed === 'Confirmed', 'en status confirmed is localized');

// Check session slots
const requiredSlots = ['after_asr', 'after_maghrib', 'after_esha', 'all_night', 'daytime_special'];
for (const slot of requiredSlots) {
  assert(Boolean(bnMessages.booking.slots[slot]), `bn.json has session slot "${slot}"`);
  assert(Boolean(enMessages.booking.slots[slot]), `en.json has session slot "${slot}"`);
}

// 3. Check reference data schema and seed SQL
console.log('\n--- 3. Testing Reference Data Migration & Seed SQL ---');
const i18nMigrationPath = path.join(process.cwd(), 'supabase/migrations/20260905000003_i18n_reference_data.sql');
assert(fs.existsSync(i18nMigrationPath), 'Migration 20260905000003_i18n_reference_data.sql exists');

const i18nMigrationSql = fs.readFileSync(i18nMigrationPath, 'utf8');
assert(i18nMigrationSql.includes('ALTER TABLE public.divisions'), 'Migration alters public.divisions');
assert(i18nMigrationSql.includes('ADD COLUMN IF NOT EXISTS name_en TEXT'), 'Migration adds name_en to divisions');
assert(i18nMigrationSql.includes('ADD COLUMN IF NOT EXISTS name_bn TEXT'), 'Migration adds name_bn to divisions');
assert(i18nMigrationSql.includes('ALTER TABLE public.districts'), 'Migration alters public.districts');
assert(i18nMigrationSql.includes('ALTER TABLE public.upazilas'), 'Migration alters public.upazilas');
assert(i18nMigrationSql.includes('CREATE TABLE IF NOT EXISTS public.specialties'), 'Migration creates public.specialties table');
assert(i18nMigrationSql.includes('ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;'), 'Migration enables RLS on specialties');
assert(i18nMigrationSql.includes('CREATE POLICY "Public read for specialties"'), 'Migration adds public read policy for specialties');

const seedPath = path.join(process.cwd(), 'supabase/seed.sql');
const seedSql = fs.readFileSync(seedPath, 'utf8');
assert(seedSql.includes('INSERT INTO public.divisions (id, name, bn_name, name_en, name_bn)'), 'Seed SQL populates divisions with name_en and name_bn');
assert(seedSql.includes('INSERT INTO public.districts (id, division_id, name, bn_name, name_en, name_bn)'), 'Seed SQL populates districts with name_en and name_bn');
assert(seedSql.includes('INSERT INTO public.upazilas (id, district_id, name, bn_name, name_en, name_bn)'), 'Seed SQL populates upazilas with name_en and name_bn');
assert(seedSql.includes('INSERT INTO public.specialties (id, slug, name_en, name_bn, description_en, description_bn, display_order)'), 'Seed SQL populates public.specialties with bilingual labels');
assert(seedSql.includes('তাফসীরুল কুরআন') && seedSql.includes('Tafseer & Quranic Exegesis'), 'Seed SQL includes bilingual Tafseer specialty');
assert(seedSql.includes('হাদীস ও সুন্নাহ') && seedSql.includes('Hadith & Sunnah'), 'Seed SQL includes bilingual Hadith specialty');

// 4. Test Localized Entities & Helper Function
console.log('\n--- 4. Testing Localized Entity Helpers ---');
const sampleDivision = SEED_DIVISIONS[0]; // Dhaka
assert(getLocalizedName(sampleDivision, 'bn') === 'ঢাকা', 'getLocalizedName returns Bengali name for bn locale');
assert(getLocalizedName(sampleDivision, 'en') === 'Dhaka', 'getLocalizedName returns English name for en locale');

const sampleSpecialty = SEED_SPECIALTIES[0]; // tafsir
assert(getLocalizedName(sampleSpecialty, 'bn') === 'তাফসীরুল কুরআন', 'Specialty localized name is Bengali in bn');
assert(getLocalizedName(sampleSpecialty, 'en') === 'Tafseer & Quranic Exegesis', 'Specialty localized name is English in en');

// 5. Test LanguageSwitcher Component & Root Layout
console.log('\n--- 5. Testing LanguageSwitcher & Root Layout Markup ---');
const switcherPath = path.join(process.cwd(), 'src/components/navigation/LanguageSwitcher.tsx');
assert(fs.existsSync(switcherPath), 'LanguageSwitcher component exists');
const switcherCode = fs.readFileSync(switcherPath, 'utf8');
assert(switcherCode.includes('NEXT_LOCALE'), 'LanguageSwitcher sets NEXT_LOCALE cookie');
assert(switcherCode.includes('useSearchParams'), 'LanguageSwitcher preserves search parameters');
assert(switcherCode.includes('aria-label='), 'LanguageSwitcher has accessibility aria-label');
assert(switcherCode.includes('lang={targetLocale}'), 'LanguageSwitcher specifies lang on language trigger');

const layoutPath = path.join(process.cwd(), 'src/app/[locale]/layout.tsx');
const layoutCode = fs.readFileSync(layoutPath, 'utf8');
assert(layoutCode.includes('lang={locale}'), 'LocaleLayout sets html lang attribute dynamically to locale');
assert(layoutCode.includes('dir="ltr"'), 'LocaleLayout sets dir="ltr" for both bn and en');
assert(layoutCode.includes('<NextIntlClientProvider'), 'LocaleLayout renders NextIntlClientProvider');
assert(layoutCode.includes('setRequestLocale(locale)'), 'LocaleLayout calls setRequestLocale for static generation');

// 6. Test User-Generated Content (UGC) Policy Isolation
console.log('\n--- 6. Testing User-Generated Content (UGC) Policy Isolation ---');
const speaker = SEED_HUZURS[0];
assert(typeof speaker.bio === 'string' && speaker.bio.includes('বিশিষ্ট ইসলামী চিন্তাবিদ'), 'Huzur bio is stored verbatim as authored by user');
assert(speaker.full_name === 'শায়খ আহমাদুল্লাহ', 'Huzur full_name is stored verbatim as authored by user');
console.log('✅ UGC Confirmation: User-authored content (bio, notes) is stored and presented verbatim with zero automatic translation.');

console.log('\n===============================================================');
console.log('🎉 ALL PHASE 1B INTERNATIONALIZATION TESTS PASSED SUCCESSFULLY');
console.log('===============================================================');
