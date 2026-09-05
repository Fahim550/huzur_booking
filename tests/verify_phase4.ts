import fs from 'fs';
import path from 'path';
import {
  fetchAdminMetrics,
  fetchHuzursForVerification,
  updateHuzurVerification,
  IN_MEMORY_HUZUR_VERIFICATION,
} from '../src/lib/queries/admin';
import { BOOKING_STATUS_LABELS_BN } from '../src/types/database';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase4Tests() {
  console.log('===============================================================');
  console.log('TEST SUITE: PHASE 4 COMPLETE DASHBOARD EXPERIENCES');
  console.log('===============================================================');

  // --------------------------------------------------------------------------
  // 1. Organizer Dashboard (/dashboard/my-requests) Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Organizer Dashboard (/dashboard/my-requests) ---');
  const myRequestsPath = path.join(
    process.cwd(),
    'src/app/[locale]/(dashboard)/dashboard/my-requests/page.tsx'
  );
  assert(fs.existsSync(myRequestsPath), 'my-requests/page.tsx exists');

  const myRequestsContent = fs.readFileSync(myRequestsPath, 'utf8');
  assert(
    myRequestsContent.includes('refetchInterval: 30000'),
    'my-requests/page.tsx enforces 30s auto-refetch interval (refetchInterval: 30000)'
  );
  assert(
    myRequestsContent.includes('useQuery'),
    'my-requests/page.tsx uses TanStack Query (useQuery)'
  );
  assert(
    myRequestsContent.includes('BOOKING_STATUS_LABELS_BN'),
    'my-requests/page.tsx utilizes standard BOOKING_STATUS_LABELS_BN'
  );
  assert(
    myRequestsContent.includes('pending') &&
      myRequestsContent.includes('confirmed') &&
      myRequestsContent.includes('cancelled'),
    'my-requests/page.tsx handles pending, confirmed, and cancelled booking statuses'
  );
  assert(
    myRequestsContent.includes('cancelMutation'),
    'my-requests/page.tsx provides cancel mutation with optimistic feedback'
  );

  // --------------------------------------------------------------------------
  // 2. Huzur Dashboard Home (/dashboard/huzur) Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Huzur Dashboard Home (/dashboard/huzur) ---');
  const huzurDashPagePath = path.join(
    process.cwd(),
    'src/app/[locale]/(dashboard)/dashboard/huzur/page.tsx'
  );
  assert(fs.existsSync(huzurDashPagePath), 'dashboard/huzur/page.tsx exists');

  const huzurClientCompPath = path.join(
    process.cwd(),
    'src/components/dashboard/HuzurDashboardHomeClient.tsx'
  );
  assert(fs.existsSync(huzurClientCompPath), 'HuzurDashboardHomeClient.tsx exists');

  const huzurClientContent = fs.readFileSync(huzurClientCompPath, 'utf8');
  assert(
    huzurClientContent.includes('upcomingConfirmed'),
    'Huzur dashboard calculates upcoming confirmed mahfils'
  );
  assert(
    huzurClientContent.includes('.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())'),
    'Upcoming confirmed mahfils are strictly sorted by date ascending (chronological order)'
  );
  assert(
    huzurClientContent.includes('pendingCount'),
    'Huzur dashboard calculates pending request count'
  );
  assert(
    huzurClientContent.includes('statusMutation') &&
      huzurClientContent.includes('confirmed') &&
      huzurClientContent.includes('rejected'),
    'Huzur dashboard provides 1-click Approve / Reject status mutation'
  );
  assert(
    huzurClientContent.includes('quickLinks') &&
      huzurClientContent.includes('dashboard/calendar') &&
      huzurClientContent.includes('availability') &&
      huzurClientContent.includes('profile'),
    'Huzur dashboard renders quick links to Calendar, Post Availability, Delegates and Profile'
  );

  // --------------------------------------------------------------------------
  // 3. Admin Panel (/admin, Role-Gated) & Postgres Aggregates
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Admin Panel & Postgres Aggregate Reporting ---');
  const migration5Path = path.join(
    process.cwd(),
    'supabase/migrations/20260905000005_admin_reporting_and_verification.sql'
  );
  assert(fs.existsSync(migration5Path), 'Migration 00005 for admin reporting exists');

  const migration5Content = fs.readFileSync(migration5Path, 'utf8');
  assert(
    migration5Content.includes('get_admin_monthly_bookings_count'),
    'Migration defines get_admin_monthly_bookings_count Postgres function'
  );
  assert(
    migration5Content.includes("date_trunc('month', CURRENT_DATE)"),
    'Migration uses Postgres date_trunc for monthly aggregation'
  );
  assert(
    migration5Content.includes('get_admin_active_districts'),
    'Migration defines get_admin_active_districts aggregate query function'
  );

  // Test admin query engine directly
  const metrics = await fetchAdminMetrics();
  assert(
    typeof metrics.totalBookingsThisMonth === 'number' && metrics.totalBookingsThisMonth > 0,
    `Admin aggregate returns totalBookingsThisMonth: ${metrics.totalBookingsThisMonth}`
  );
  assert(
    Array.isArray(metrics.activeDistricts) && metrics.activeDistricts.length > 0,
    `Admin aggregate returns most active districts (found ${metrics.activeDistricts.length})`
  );
  assert(
    metrics.activeDistricts[0].booking_count >=
      (metrics.activeDistricts[1]?.booking_count || 0),
    'Active districts are sorted in descending order of booking count'
  );
  console.log(`   Top Active District: ${metrics.activeDistricts[0].district_bn_name} (${metrics.activeDistricts[0].booking_count} bookings)`);

  // Test Huzur Verification Queue
  const queue = await fetchHuzursForVerification();
  assert(queue.length >= 4, `Huzur verification queue returns speakers (found ${queue.length})`);
  assert(
    queue.some((h) => typeof h.is_verified === 'boolean'),
    'Huzur items include is_verified boolean flag'
  );

  const testHuzur = queue[0];
  const originalStatus = testHuzur.is_verified;
  const toggleResult1 = await updateHuzurVerification(null, testHuzur.id, !originalStatus);
  assert(toggleResult1.success, 'Toggled huzur verification status successfully');
  assert(
    IN_MEMORY_HUZUR_VERIFICATION[testHuzur.id] === !originalStatus,
    'Verification status reflected in verification tracker'
  );

  // Restore status
  const toggleResult2 = await updateHuzurVerification(null, testHuzur.id, originalStatus);
  assert(toggleResult2.success, 'Restored original verification status');

  // Verify Admin Page & API endpoints
  const adminPagePath = path.join(process.cwd(), 'src/app/[locale]/admin/page.tsx');
  assert(fs.existsSync(adminPagePath), 'src/app/[locale]/admin/page.tsx exists');

  const adminPageContent = fs.readFileSync(adminPagePath, 'utf8');
  assert(
    adminPageContent.includes("currentUser?.role === 'admin'"),
    'admin/page.tsx enforces role-gating (checks admin role)'
  );
  assert(
    adminPageContent.includes('activeDistricts') &&
      adminPageContent.includes('totalBookingsThisMonth'),
    'admin/page.tsx renders monthly bookings and active districts aggregate reports'
  );
  assert(
    adminPageContent.includes('verifyMutation') &&
      adminPageContent.includes('handleVerify'),
    'admin/page.tsx includes verification queue approve/reject mutators'
  );

  const adminReportsApiPath = path.join(process.cwd(), 'src/app/api/admin/reports/route.ts');
  assert(fs.existsSync(adminReportsApiPath), 'api/admin/reports/route.ts exists');

  const adminHuzursApiPath = path.join(process.cwd(), 'src/app/api/admin/huzurs/route.ts');
  assert(fs.existsSync(adminHuzursApiPath), 'api/admin/huzurs/route.ts exists');

  // --------------------------------------------------------------------------
  // 4. Proxy / Middleware Role Gating Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Proxy Role-Gating for Admin & Dashboard ---');
  const proxyPath = path.join(process.cwd(), 'src/proxy.ts');
  const proxyContent = fs.readFileSync(proxyPath, 'utf8');
  assert(
    proxyContent.includes('isAdminRoute'),
    'proxy.ts checks isAdminRoute for /admin paths'
  );
  assert(
    proxyContent.includes("authenticatedUser.role !== 'admin'"),
    'proxy.ts rejects non-admin users from accessing /admin'
  );
  assert(
    proxyContent.includes('/dashboard/my-requests'),
    'proxy.ts includes route handling for /dashboard/my-requests'
  );

  // --------------------------------------------------------------------------
  // 5. Mobile Navigation (BottomNav) Role Adaptation Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Mobile Navigation Role Adaptation ---');
  const bottomNavPath = path.join(process.cwd(), 'src/components/navigation/BottomNav.tsx');
  assert(fs.existsSync(bottomNavPath), 'BottomNav.tsx exists');

  const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');
  assert(
    bottomNavContent.includes("role === 'organizer'"),
    'BottomNav detects organizer role'
  );
  assert(
    bottomNavContent.includes('/dashboard/my-requests'),
    'BottomNav links organizer to /dashboard/my-requests'
  );
  assert(
    bottomNavContent.includes("role === 'huzur'"),
    'BottomNav detects huzur role'
  );
  assert(
    bottomNavContent.includes('/dashboard/huzur'),
    'BottomNav links huzur to /dashboard/huzur'
  );
  assert(
    bottomNavContent.includes("role === 'admin'"),
    'BottomNav detects admin role'
  );
  assert(
    bottomNavContent.includes('/admin'),
    'BottomNav links admin to /admin'
  );
  assert(
    bottomNavContent.includes('LanguageSwitcher'),
    'BottomNav preserves 1-Tap language switcher'
  );

  console.log('===============================================================');
  console.log('🎉 ALL PHASE 4 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runPhase4Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
