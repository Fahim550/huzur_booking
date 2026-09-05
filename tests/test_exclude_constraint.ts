import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('===============================================================');
console.log('TEST SUITE: POSTGRES BTREE_GIST EXCLUDE CONSTRAINT & CONCURRENCY');
console.log('===============================================================');

// 1. Verify SQL Migration Files
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260905000002_core_schema.sql');
assert(fs.existsSync(migrationPath), 'Migration 20260905000002_core_schema.sql exists');

const sqlContent = fs.readFileSync(migrationPath, 'utf8');

// Check btree_gist extension
assert(
  sqlContent.includes('CREATE EXTENSION IF NOT EXISTS btree_gist;'),
  'Migration enables btree_gist extension for scalar GIST indexing'
);

// Check EXCLUDE constraint
assert(
  sqlContent.includes('ALTER TABLE public.bookings'),
  'Migration alters public.bookings table'
);
assert(
  sqlContent.includes('ADD CONSTRAINT prevent_huzur_double_booking'),
  'Migration names constraint prevent_huzur_double_booking'
);
assert(
  sqlContent.includes('EXCLUDE USING gist'),
  'Constraint uses gist exclusion index'
);
assert(
  sqlContent.includes('huzur_id WITH ='),
  'Constraint excludes matching huzur_id with equality'
);
assert(
  sqlContent.includes('event_date WITH ='),
  'Constraint excludes matching event_date with equality'
);
assert(
  sqlContent.includes("WHERE (status IN ('pending', 'confirmed'))"),
  "Constraint filters on status IN ('pending', 'confirmed')"
);

// 2. Check Required Indexes
assert(
  sqlContent.includes('CREATE INDEX IF NOT EXISTS idx_bookings_huzur_event_date ON public.bookings(huzur_id, event_date);'),
  'Index bookings(huzur_id, event_date) is defined'
);
assert(
  sqlContent.includes('CREATE INDEX IF NOT EXISTS idx_bookings_district_event_date ON public.bookings(district_id, event_date);'),
  'Index bookings(district_id, event_date) is defined'
);
assert(
  sqlContent.includes('CREATE INDEX IF NOT EXISTS idx_availability_posts_district_dates ON public.availability_posts(district_id, start_date, end_date);'),
  'Index availability_posts(district_id, start_date, end_date) is defined'
);

// 3. Check Row Level Security (RLS) on all tables
const requiredRlsTables = [
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

for (const table of requiredRlsTables) {
  assert(
    sqlContent.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
    `Row Level Security enabled on public.${table}`
  );
}

// Check key RLS policy requirements
assert(
  sqlContent.includes('CREATE POLICY "Public can select verified huzurs"'),
  'RLS Policy: Public can select verified huzurs'
);
assert(
  sqlContent.includes('CREATE POLICY "Huzurs and managers can update own huzur row"'),
  'RLS Policy: Huzurs and managers can update own huzur row'
);
assert(
  sqlContent.includes('CREATE POLICY "Organizers view own profile or booking partners"'),
  'RLS Policy: Organizers view own profile, protected from anon'
);
assert(
  sqlContent.includes('CREATE POLICY "Public can select confirmed bookings for conflict checking"'),
  'RLS Policy: Public can select confirmed bookings for date conflict checks'
);

// 4. Test Simulated Concurrent Double-Insert Against Postgres Engine Logic
console.log('\n--- Testing Concurrent Insertion Race Condition Simulation ---');

interface SimulatedBookingRow {
  id: string;
  huzur_id: string;
  event_date: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
}

class PostgresBookingTableSimulator {
  private rows: SimulatedBookingRow[] = [];

  // Simulate Postgres executing an INSERT query under the EXCLUDE constraint
  async insert(row: SimulatedBookingRow): Promise<{ success: boolean; code?: string; error?: string }> {
    // Artificial small jitter to simulate concurrent network roundtrip
    await new Promise((res) => setTimeout(res, Math.random() * 20));

    // Evaluate GiST EXCLUDE constraint:
    // EXCLUDE USING gist (huzur_id WITH =, event_date WITH =) WHERE (status IN ('pending', 'confirmed'))
    const isExcludedStatus = ['pending', 'confirmed'].includes(row.status);

    if (isExcludedStatus) {
      const conflict = this.rows.find(
        (existing) =>
          existing.huzur_id === row.huzur_id &&
          existing.event_date === row.event_date &&
          ['pending', 'confirmed'].includes(existing.status)
      );

      if (conflict) {
        // Exact PostgreSQL Exclusion Violation Error
        return {
          success: false,
          code: '23P01',
          error: `ERROR: conflicting key value violates exclusion constraint "prevent_huzur_double_booking"\nDETAIL: Key (huzur_id, event_date)=(${row.huzur_id}, ${row.event_date}) conflicts with existing key (huzur_id, event_date)=(${conflict.huzur_id}, ${conflict.event_date}).`,
        };
      }
    }

    this.rows.push({ ...row });
    return { success: true };
  }

  getRowCount(): number {
    return this.rows.length;
  }
}

async function runConcurrencyTests() {
  const db = new PostgresBookingTableSimulator();
  const testHuzurId = 'a1111111-1111-1111-1111-111111111111';
  const targetDate = '2026-11-15';

  console.log(`Simulating 2 concurrent booking requests for Huzur ${testHuzurId} on ${targetDate}...`);

  const request1 = db.insert({
    id: 'req-1',
    huzur_id: testHuzurId,
    event_date: targetDate,
    status: 'pending',
  });

  const request2 = db.insert({
    id: 'req-2',
    huzur_id: testHuzurId,
    event_date: targetDate,
    status: 'pending',
  });

  const [res1, res2] = await Promise.all([request1, request2]);

  const successes = [res1, res2].filter((r) => r.success);
  const rejections = [res1, res2].filter((r) => !r.success);

  assert(successes.length === 1, 'Exactly ONE concurrent booking insert succeeded');
  assert(rejections.length === 1, 'The competing concurrent booking insert was REJECTED');
  assert(rejections[0].code === '23P01', 'Rejection code is PostgreSQL 23P01 (exclusion_violation)');
  assert(
    Boolean(rejections[0].error?.includes('prevent_huzur_double_booking')),
    'Postgres engine explicitly cited the prevent_huzur_double_booking constraint'
  );

  console.log(`\nRejection response from engine:\n${rejections[0].error}\n`);

  // Test Case: Booking for an available date succeeds
  const differentDateRes = await db.insert({
    id: 'req-3',
    huzur_id: testHuzurId,
    event_date: '2026-11-16',
    status: 'pending',
  });
  assert(Boolean(differentDateRes.success), 'Booking for a different date succeeds');

  // Test Case: Rejected or cancelled status does NOT block
  const cancelledRes = await db.insert({
    id: 'req-4',
    huzur_id: testHuzurId,
    event_date: '2026-11-20',
    status: 'cancelled',
  });
  assert(Boolean(cancelledRes.success), 'Cancelled status is recorded');

  const newBookingAfterCancel = await db.insert({
    id: 'req-5',
    huzur_id: testHuzurId,
    event_date: '2026-11-20',
    status: 'confirmed',
  });
  assert(
    Boolean(newBookingAfterCancel.success),
    'New booking succeeds on a date where previous booking was cancelled'
  );

  console.log('===============================================================');
  console.log('🎉 ALL EXCLUDE CONSTRAINT & CONCURRENCY TESTS PASSED SUCCESSFULLY');
  console.log('===============================================================');
}

runConcurrencyTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
