import fs from 'fs';
import path from 'path';
import { SEED_HUZURS, SEED_BOOKINGS } from '../src/lib/data/mockData';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('--- RUNNING PHASE 1 VERIFICATION TEST SUITE ---');

// 1. Check SQL Migration file exists and contains the EXCLUDE constraint
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260905000002_core_schema.sql');
assert(fs.existsSync(migrationPath), 'Migration SQL file 20260905000002_core_schema.sql exists');

const migrationSql = fs.readFileSync(migrationPath, 'utf8');
assert(migrationSql.includes('CREATE EXTENSION IF NOT EXISTS btree_gist;'), 'Migration enables btree_gist extension');
assert(migrationSql.includes('EXCLUDE USING gist'), 'Migration defines EXCLUDE constraint using gist');
assert(migrationSql.includes('huzur_id WITH ='), 'Migration EXCLUDE constraint includes huzur_id WITH =');
assert(migrationSql.includes('event_date WITH ='), 'Migration EXCLUDE constraint includes event_date WITH =');
assert(migrationSql.includes("status IN ('pending', 'confirmed')"), "Migration EXCLUDE constraint specifies status IN ('pending', 'confirmed')");

// Check all 9 tables in migration
const requiredTables = [
  'divisions',
  'districts',
  'upazilas',
  'huzurs',
  'managers',
  'organizers',
  'bookings',
  'availability_posts',
  'notifications',
];
for (const table of requiredTables) {
  assert(migrationSql.includes(`TABLE IF NOT EXISTS public.${table}`), `Migration defines table public.${table}`);
  assert(migrationSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`), `RLS enabled on table public.${table}`);
}

// Check required query pattern indexes
assert(migrationSql.includes('idx_bookings_huzur_event_date ON public.bookings(huzur_id, event_date)'), 'Index on bookings(huzur_id, event_date)');
assert(migrationSql.includes('idx_bookings_district_event_date ON public.bookings(district_id, event_date)'), 'Index on bookings(district_id, event_date)');
assert(migrationSql.includes('idx_availability_posts_district_dates ON public.availability_posts(district_id, start_date, end_date)'), 'Index on availability_posts(district_id, start_date, end_date)');

// 2. Check Seed SQL file exists
const seedPath = path.join(process.cwd(), 'supabase/seed.sql');
assert(fs.existsSync(seedPath), 'Seed SQL file exists');
const seedSql = fs.readFileSync(seedPath, 'utf8');
assert(seedSql.includes('শায়খ আহমাদুল্লাহ'), 'Seed SQL includes authentic Bangladeshi speakers');
assert(seedSql.includes('INSERT INTO public.divisions'), 'Seed SQL populates divisions');
assert(seedSql.includes('INSERT INTO public.districts'), 'Seed SQL populates districts');
assert(seedSql.includes('INSERT INTO public.upazilas'), 'Seed SQL populates upazilas');

// 3. Check README has the non-negotiable section: Scaling & Load Balancing
const readmePath = path.join(process.cwd(), 'README.md');
assert(fs.existsSync(readmePath), 'README.md exists');
const readmeContent = fs.readFileSync(readmePath, 'utf8');
assert(readmeContent.includes('## ⚡ Scaling & Load Balancing'), 'README includes "Scaling & Load Balancing" section');
assert(readmeContent.includes('Supavisor Connection Pooling'), 'README documents Supavisor connection pooling');
assert(readmeContent.includes('port 6543') || readmeContent.includes('6543'), 'README documents port 6543 for transaction mode');

// 4. Check Client Factories and Server-Only Guard
const clientPath = path.join(process.cwd(), 'src/lib/supabase/client.ts');
const serverPath = path.join(process.cwd(), 'src/lib/supabase/server.ts');
const servicePath = path.join(process.cwd(), 'src/lib/supabase/service.ts');
assert(fs.existsSync(clientPath), 'Browser client factory exists');
assert(fs.existsSync(serverPath), 'Server client factory exists');
assert(fs.existsSync(servicePath), 'Service-role client factory exists');

const serviceCode = fs.readFileSync(servicePath, 'utf8');
assert(serviceCode.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Service client references SUPABASE_SERVICE_ROLE_KEY');
assert(serviceCode.includes("typeof window !== 'undefined'"), 'Service client guards against browser execution');

// 5. Check Typed Query Layer
const queriesIndexPath = path.join(process.cwd(), 'src/lib/queries/index.ts');
const queriesLocationsPath = path.join(process.cwd(), 'src/lib/queries/locations.ts');
const queriesHuzursPath = path.join(process.cwd(), 'src/lib/queries/huzurs.ts');
const queriesBookingsPath = path.join(process.cwd(), 'src/lib/queries/bookings.ts');
assert(fs.existsSync(queriesIndexPath), 'Queries index exists');
assert(fs.existsSync(queriesLocationsPath), 'Locations queries exist');
assert(fs.existsSync(queriesHuzursPath), 'Huzurs queries exist');
assert(fs.existsSync(queriesBookingsPath), 'Bookings queries exist');

// 6. Check Types
const dbTypesRoot = path.join(process.cwd(), 'types/database.ts');
const dbTypesSrc = path.join(process.cwd(), 'src/types/database.ts');
assert(fs.existsSync(dbTypesRoot), 'Root /types/database.ts exists');
assert(fs.existsSync(dbTypesSrc), 'src/types/database.ts exists');

// 7. Check Route Groups and API routes
assert(fs.existsSync(path.join(process.cwd(), 'src/app/[locale]/(public)/search/page.tsx')), '(public)/search route exists');
assert(fs.existsSync(path.join(process.cwd(), 'src/app/[locale]/(public)/huzur/[id]/page.tsx')), '(public)/huzur/[id] route exists');
assert(fs.existsSync(path.join(process.cwd(), 'src/app/[locale]/(dashboard)/dashboard/huzur/page.tsx')), '(dashboard)/dashboard/huzur route exists');
assert(fs.existsSync(path.join(process.cwd(), 'src/app/[locale]/(dashboard)/dashboard/organizer/page.tsx')), '(dashboard)/dashboard/organizer route exists');
assert(fs.existsSync(path.join(process.cwd(), 'src/app/api/bookings/route.ts')), 'api/bookings route exists');
assert(fs.existsSync(path.join(process.cwd(), 'src/app/api/huzurs/route.ts')), 'api/huzurs route exists');
assert(fs.existsSync(path.join(process.cwd(), 'src/app/api/locations/route.ts')), 'api/locations route exists');

// 8. Test Bilingual Support & Dictionaries
console.log('--- Testing Bilingual Support & Dictionaries ---');
import { bn } from '../src/lib/i18n/dictionaries/bn';
import { en } from '../src/lib/i18n/dictionaries/en';
import { LOCALES, DEFAULT_LOCALE } from '../src/lib/i18n/config';

assert(LOCALES.includes('bn') && LOCALES.includes('en'), 'Supported locales include bn and en');
assert(DEFAULT_LOCALE === 'bn', 'Default locale is bn');

// Check navigation keys match
assert(bn.nav.search === 'অনুসন্ধান', 'bn nav search matches বাংলা');
assert(en.nav.search === 'Search', 'en nav search matches English');
assert(bn.nav.myBookings === 'বুকিং সমূহ', 'bn nav myBookings matches বাংলা');
assert(en.nav.myBookings === 'My Bookings', 'en nav myBookings matches English');

// Check 1-tap language switch label
assert(bn.nav.langToggle === 'English', 'bn nav offers toggle to English');
assert(en.nav.langToggle === 'বাংলা', 'en nav offers toggle to বাংলা');

console.log('--- ALL PHASE 1 AUTOMATED TESTS PASSED SUCCESSFULLY ---');
