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
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260905000001_init_schema.sql');
assert(fs.existsSync(migrationPath), 'Migration SQL file exists');

const migrationSql = fs.readFileSync(migrationPath, 'utf8');
assert(migrationSql.includes('CREATE EXTENSION IF NOT EXISTS btree_gist;'), 'Migration enables btree_gist extension');
assert(migrationSql.includes('EXCLUDE USING gist'), 'Migration defines EXCLUDE constraint using gist');
assert(migrationSql.includes('huzur_id WITH ='), 'Migration EXCLUDE constraint includes huzur_id WITH =');
assert(migrationSql.includes('event_date WITH ='), 'Migration EXCLUDE constraint includes event_date WITH =');
assert(migrationSql.includes("status IN ('pending', 'confirmed')"), "Migration EXCLUDE constraint specifies status IN ('pending', 'confirmed')");

// 2. Check Seed SQL file exists
const seedPath = path.join(process.cwd(), 'supabase/seed.sql');
assert(fs.existsSync(seedPath), 'Seed SQL file exists');
const seedSql = fs.readFileSync(seedPath, 'utf8');
assert(seedSql.includes('শায়খ আহমাদুল্লাহ'), 'Seed SQL includes authentic Bangladeshi speakers');

// 3. Check README has the non-negotiable section: Scaling & Load Balancing
const readmePath = path.join(process.cwd(), 'README.md');
assert(fs.existsSync(readmePath), 'README.md exists');
const readmeContent = fs.readFileSync(readmePath, 'utf8');
assert(readmeContent.includes('## ⚡ Scaling & Load Balancing'), 'README includes "Scaling & Load Balancing" section');
assert(readmeContent.includes('Supavisor Connection Pooling'), 'README documents Supavisor connection pooling');
assert(readmeContent.includes('port 6543') || readmeContent.includes('6543'), 'README documents port 6543 for transaction mode');

// 4. Test Mock Data & Types
assert(SEED_HUZURS.length >= 6, 'Seed Huzurs dataset has at least 6 speakers');
assert(SEED_BOOKINGS.length >= 3, 'Seed Bookings dataset has sample bookings');

// 5. Test Simulated EXCLUDE Constraint Logic (Race condition & conflict protection)
console.log('--- Testing EXCLUDE Constraint Business Logic Simulation ---');

function attemptNewBooking(
  existingBookings: typeof SEED_BOOKINGS,
  newBooking: { huzur_id: string; event_date: string; status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' }
): { success: boolean; error?: string } {
  // Check if conflict matches Postgres EXCLUDE constraint condition:
  // EXCLUDE USING gist (huzur_id WITH =, event_date WITH =) WHERE (status IN ('pending', 'confirmed'))
  const conflict = existingBookings.find(
    (b) =>
      b.huzur_id === newBooking.huzur_id &&
      b.event_date === newBooking.event_date &&
      ['pending', 'confirmed'].includes(b.status) &&
      ['pending', 'confirmed'].includes(newBooking.status)
  );

  if (conflict) {
    return {
      success: false,
      error: `Postgres EXCLUDE violation (23P01): Booking conflict for huzur ${newBooking.huzur_id} on ${newBooking.event_date}. Existing booking status is ${conflict.status}.`,
    };
  }

  return { success: true };
}

// Case A: Book on date already confirmed -> Must FAIL
const conflictTest1 = attemptNewBooking(SEED_BOOKINGS, {
  huzur_id: SEED_BOOKINGS[0].huzur_id,
  event_date: SEED_BOOKINGS[0].event_date,
  status: 'pending',
});
assert(!conflictTest1.success, 'Attempting to book a confirmed speaker date correctly fails with constraint violation');

// Case B: Book on different date -> Must SUCCEED
const validTest = attemptNewBooking(SEED_BOOKINGS, {
  huzur_id: SEED_BOOKINGS[0].huzur_id,
  event_date: '2026-12-01',
  status: 'pending',
});
assert(validTest.success, 'Attempting to book an available date succeeds');

// Case C: Rejected or Cancelled booking does NOT block new booking -> Must SUCCEED
const cancelledBookingList = [
  ...SEED_BOOKINGS,
  {
    ...SEED_BOOKINGS[0],
    id: 'test-cancelled-id',
    event_date: '2026-12-05',
    status: 'cancelled' as const,
  },
];
const retryAfterCancel = attemptNewBooking(cancelledBookingList, {
  huzur_id: SEED_BOOKINGS[0].huzur_id,
  event_date: '2026-12-05',
  status: 'pending',
});
assert(retryAfterCancel.success, 'Cancelled status is excluded from the constraint and allows new bookings');

// 6. Test Bilingual Support & Dictionaries
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

// Check reference data completeness
assert(Object.keys(bn.reference.divisions).length >= 8, 'bn reference divisions covers 8 divisions');
assert(Object.keys(en.reference.divisions).length >= 8, 'en reference divisions covers 8 divisions');
assert(Object.keys(bn.reference.districts).length >= 10, 'bn reference districts covers key districts');
assert(Object.keys(en.reference.districts).length >= 10, 'en reference districts covers key districts');
assert(Object.keys(bn.reference.topics).length >= 15, 'bn reference topics covers key topics');
assert(Object.keys(en.reference.topics).length >= 15, 'en reference topics covers key topics');

console.log('--- ALL PHASE 1 & BILINGUAL AUTOMATED TESTS PASSED SUCCESSFULLY ---');
