import fs from 'fs';
import path from 'path';
import {
  searchHuzurs,
  doesPostMatchCriteria,
  IN_MEMORY_AVAILABILITY_POSTS,
} from '../src/lib/queries/searchHuzurs';
import {
  checkHuzurDateConflict,
  findNearestOpenDates,
  insertBookingRequest,
  updateBookingStatus,
  createNotification,
} from '../src/lib/queries/bookings';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase3Tests() {
  console.log('===============================================================');
  console.log('TEST SUITE: PHASE 3 CORE BOOKING & SEARCH FUNCTIONALITY');
  console.log('===============================================================');

  // Dummy mock client for unit test environment
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;

  // --------------------------------------------------------------------------
  // 1. Search Query Tests (searchHuzurs)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Search Query Engine (searchHuzurs) ---');

  // 1.1 Base query (no filters)
  const baseResult = await searchHuzurs({}, mockClient);
  assert(baseResult.huzurs.length > 0, `Base search returns verified huzurs (found ${baseResult.huzurs.length})`);
  assert(baseResult.total >= 6, `Total huzurs count is at least 6 (got ${baseResult.total})`);

  // 1.2 District filtering (District 10: Cumilla)
  const cumillaResult = await searchHuzurs({ districtId: 10 }, mockClient);
  assert(cumillaResult.huzurs.length > 0, 'Search by districtId=10 (Cumilla) returns matching huzur');
  assert(
    cumillaResult.huzurs.some((h) => h.home_district_id === 10),
    'Returned huzurs list contains local speaker from Cumilla'
  );

  // 1.3 Division filtering (Division 1: Dhaka)
  const dhakaDivResult = await searchHuzurs({ divisionId: 1 }, mockClient);
  assert(dhakaDivResult.huzurs.length >= 3, `Search by divisionId=1 (Dhaka) returns at least 3 huzurs (got ${dhakaDivResult.huzurs.length})`);

  // 1.4 Specialty filtering
  const specialtyResult = await searchHuzurs({ specialty: 'তাফসীরুল কুরআন' }, mockClient);
  assert(specialtyResult.huzurs.length > 0, 'Search by specialty returns matching speakers');
  assert(
    specialtyResult.huzurs.some((h) => h.specialties.includes('তাফসীরুল কুরআন')),
    'Returned huzurs list contains speaker specialized in Tafseer'
  );

  // 1.5 Keyword search (q = 'আহমাদুল্লাহ')
  const keywordResult = await searchHuzurs({ q: 'আহমাদুল্লাহ' }, mockClient);
  assert(keywordResult.huzurs.length === 1, 'Search by keyword "আহমাদুল্লাহ" returns exactly 1 result');
  assert(keywordResult.huzurs[0].name.includes('আহমাদুল্লাহ'), 'Speaker name matches search term');

  // 1.6 Availability Post Surface in Search
  console.log('\n--- 2. Testing Availability Post Surfacing in Search ---');
  // Shaykh Ahmadullah has an availability post in Cumilla (district 10) from 2026-12-01 to 2026-12-07
  const availResult = await searchHuzurs(
    {
      districtId: 10,
      startDate: '2026-12-02',
      endDate: '2026-12-05',
    },
    mockClient
  );

  const shaykh = availResult.huzurs.find((h) => h.id === 'a1111111-1111-1111-1111-111111111111');
  assert(shaykh !== undefined, 'Found Shaykh in availability search results');
  // Check helper doesPostMatchCriteria directly
  const matchPost = IN_MEMORY_AVAILABILITY_POSTS[0];
  const isPostMatching = doesPostMatchCriteria(matchPost, {
    districtId: 10,
    startDate: '2026-12-02',
    endDate: '2026-12-05',
  });
  assert(isPostMatching, 'doesPostMatchCriteria correctly detects overlapping travel date and district');

  // --------------------------------------------------------------------------
  // 3. Conflict Checking & 5 Nearest Open Dates
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Conflict Checking & 5 Nearest Open Dates ---');
  const testHuzurId = 'a1111111-1111-1111-1111-111111111111';
  const takenDate = '2026-11-15'; // Seeded confirmed booking date

  const isTaken = await checkHuzurDateConflict(mockClient, testHuzurId, takenDate);
  assert(isTaken === true, `Date ${takenDate} is recognized as already booked for Huzur ${testHuzurId}`);

  // Query 5 nearest open dates
  const nearestOpenDates = await findNearestOpenDates(mockClient, testHuzurId, takenDate, 5);
  assert(nearestOpenDates.length === 5, `findNearestOpenDates returns exactly 5 suggested dates (got ${nearestOpenDates.length})`);
  assert(!nearestOpenDates.includes(takenDate), `Suggested dates array does NOT contain the taken date ${takenDate}`);
  assert(
    nearestOpenDates.every((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)),
    'All suggested dates follow ISO YYYY-MM-DD format'
  );
  console.log(`   Suggested 5 open dates: ${nearestOpenDates.join(', ')}`);

  // --------------------------------------------------------------------------
  // 4. Booking Insertion, Status Update & Notifications
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Booking Insertion, Status Update & Notifications ---');

  const newBookingDate = '2026-11-18'; // Open date
  const insertRes = await insertBookingRequest(mockClient, {
    huzur_id: testHuzurId,
    organizer_id: 'b1111111-1111-1111-1111-111111111111',
    event_date: newBookingDate,
    venue_address: 'মিরপুর কেন্দ্রীয় জামে মসজিদ',
    status: 'pending',
  });

  assert(insertRes.booking !== null, 'Successfully inserted pending booking on open date');
  assert(insertRes.booking?.status === 'pending', 'Inserted booking has status="pending"');
  assert(insertRes.error === null, 'No error during valid booking insert');

  // Test exclusion defense: re-inserting on same date should fail
  const duplicateInsert = await insertBookingRequest(mockClient, {
    huzur_id: testHuzurId,
    organizer_id: 'b2222222-2222-2222-2222-222222222222',
    event_date: newBookingDate,
    venue_address: 'অন্য একটি ভেন্যু',
    status: 'pending',
  });
  assert(duplicateInsert.booking === null, 'Duplicate booking on same date was rejected');
  assert(duplicateInsert.error !== null, 'Duplicate booking error message returned');

  // Test status update (PATCH /api/bookings/[id])
  const bookingIdToUpdate = insertRes.booking!.id;
  const approveRes = await updateBookingStatus(mockClient, bookingIdToUpdate, 'confirmed');
  assert(approveRes.booking !== null, 'Successfully updated booking status');
  assert(approveRes.booking?.status === 'confirmed', 'Updated booking status is now "confirmed"');

  const rejectRes = await updateBookingStatus(mockClient, bookingIdToUpdate, 'rejected');
  assert(rejectRes.booking?.status === 'rejected', 'Updated booking status is now "rejected"');

  // Test notification creation
  const notifOk = await createNotification(mockClient, {
    userId: '00000000-0000-0000-0000-000000000011',
    type: 'booking_request',
    message: 'নতুন বুকিং আবেদন এসেছে',
    relatedBookingId: bookingIdToUpdate,
  });
  assert(notifOk === true, 'createNotification executed without error');

  // --------------------------------------------------------------------------
  // 5. File & Route Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Verifying Required Files & Components ---');

  const requiredFiles = [
    'src/lib/queries/searchHuzurs.ts',
    'src/app/api/huzurs/search/route.ts',
    'src/app/api/bookings/route.ts',
    'src/app/api/bookings/[id]/route.ts',
    'src/app/api/availability-posts/route.ts',
    'src/components/search/SearchClient.tsx',
    'src/components/huzur/HuzurScheduleCalendar.tsx',
    'src/components/huzur/HuzurBookingModal.tsx',
    'src/components/huzur/HuzurProfileClient.tsx',
    'src/components/dashboard/HuzurDashboardCalendar.tsx',
    'src/components/dashboard/AvailabilityPostForm.tsx',
    'src/app/[locale]/(public)/search/page.tsx',
    'src/app/[locale]/(public)/huzur/[id]/page.tsx',
    'src/app/[locale]/(dashboard)/dashboard/calendar/page.tsx',
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    assert(fs.existsSync(fullPath), `File exists: ${relPath}`);
  }

  // 5.1 Verify ISR configuration in search/page.tsx
  const searchPageContent = fs.readFileSync(path.join(process.cwd(), 'src/app/[locale]/(public)/search/page.tsx'), 'utf8');
  assert(searchPageContent.includes('export const revalidate = 60;'), 'search/page.tsx exports revalidate = 60 (60s ISR)');
  assert(searchPageContent.includes('searchHuzurs('), 'search/page.tsx directly calls searchHuzurs Server Function');

  // 5.2 Verify ISR & generateStaticParams in huzur/[id]/page.tsx
  const profilePageContent = fs.readFileSync(path.join(process.cwd(), 'src/app/[locale]/(public)/huzur/[id]/page.tsx'), 'utf8');
  assert(profilePageContent.includes('export const revalidate = 300;'), 'huzur/[id]/page.tsx exports revalidate = 300 (5m ISR)');
  assert(profilePageContent.includes('export async function generateStaticParams()'), 'huzur/[id]/page.tsx exports generateStaticParams');

  // 5.3 Verify proxy.ts handles /dashboard/calendar
  const proxyContent = fs.readFileSync(path.join(process.cwd(), 'src/proxy.ts'), 'utf8');
  assert(proxyContent.includes('/dashboard/calendar'), 'proxy.ts includes route checking for /dashboard/calendar');

  console.log('\n===============================================================');
  console.log('🎉 ALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runPhase3Tests().catch((err) => {
  console.error('Phase 3 tests failed:', err);
  process.exit(1);
});
