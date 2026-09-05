import fs from 'fs';
import path from 'path';
import { normalizeBangladeshiPhone } from '../src/lib/auth';
import { formatBytes } from '../src/lib/utils/imageCompression';
import { createManagerInvite, getManagerInvite, acceptManagerInvite, fetchHuzurManagers, revokeManager } from '../src/lib/queries/profiles';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase2Tests() {
  console.log('--- RUNNING PHASE 2 VERIFICATION TEST SUITE ---');

  // 1. Migration 00004 Verification
  const migration4Path = path.join(process.cwd(), 'supabase/migrations/20260905000004_manager_invites_and_storage.sql');
  assert(fs.existsSync(migration4Path), 'Migration 00004 SQL file exists');

  const migration4Sql = fs.readFileSync(migration4Path, 'utf8');
  assert(migration4Sql.includes('TABLE IF NOT EXISTS public.manager_invites'), 'Migration defines public.manager_invites');
  assert(migration4Sql.includes('invite_code TEXT NOT NULL UNIQUE'), 'manager_invites includes invite_code TEXT NOT NULL UNIQUE');
  assert(migration4Sql.includes("status IN ('pending', 'accepted', 'expired', 'revoked')"), 'manager_invites enforces status check constraint');
  assert(migration4Sql.includes('ALTER TABLE public.manager_invites ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on manager_invites');
  assert(migration4Sql.includes('CREATE POLICY "Huzurs can select own manager invites"'), 'Huzur owner RLS policy created for invites');
  assert(migration4Sql.includes('INSERT INTO storage.buckets'), 'Storage bucket avatars provisioned');
  assert(migration4Sql.includes('CREATE POLICY "Public read avatars"'), 'Public read RLS policy on storage');

  // 2. Database Types Verification
  const dbTypesPath = path.join(process.cwd(), 'src/types/database.ts');
  const dbTypesContent = fs.readFileSync(dbTypesPath, 'utf8');
  assert(dbTypesContent.includes('manager_invites: {'), 'Database interface defines manager_invites table');
  assert(dbTypesContent.includes('invite_code: string;'), 'manager_invites Row type includes invite_code');

  // 3. Bangladeshi Phone Normalization & Validation Tests
  const valid1 = normalizeBangladeshiPhone('01711234567');
  assert(valid1.isValid && valid1.formatted === '+8801711234567', 'Valid 01711234567 normalizes to +8801711234567');

  const valid2 = normalizeBangladeshiPhone('+8801812345678');
  assert(valid2.isValid && valid2.formatted === '+8801812345678', 'Valid +8801812345678 accepted');

  const valid3 = normalizeBangladeshiPhone('01912-345678');
  assert(valid3.isValid && valid3.formatted === '+8801912345678', 'Valid hyphenated 01912-345678 normalizes correctly');

  const invalid1 = normalizeBangladeshiPhone('01211234567'); // 012 not a valid BD operator
  assert(!invalid1.isValid, 'Invalid operator 012 is rejected');

  const invalid2 = normalizeBangladeshiPhone('0171123456'); // 10 digits instead of 11
  assert(!invalid2.isValid, 'Invalid length 10 digits is rejected');

  // 4. Utility formatBytes tests
  assert(formatBytes(1024) === '1 KB', 'formatBytes formats 1024 to 1 KB');
  assert(formatBytes(1572864) === '1.5 MB', 'formatBytes formats 1572864 to 1.5 MB');

  // 5. Manager Invite & Delegation Flow Tests
  const testHuzurId = 'test-huzur-uuid-1';
  const inviteRes = await createManagerInvite(testHuzurId, 'মাওলানা হাফিজুর রহমান', '+8801711000099');
  assert(inviteRes.inviteCode.startsWith('HZ-'), `Generated invite code has format HZ-XXXXXX (got ${inviteRes.inviteCode})`);

  const fetchedInvite = await getManagerInvite(inviteRes.inviteCode);
  assert(fetchedInvite !== null, 'Fetched manager invite by code');
  assert(fetchedInvite?.invite_code === inviteRes.inviteCode, 'Invite code matches');
  assert(fetchedInvite?.status === 'pending', 'Invite status is pending');

  const acceptRes = await acceptManagerInvite(inviteRes.inviteCode, 'test-manager-uid-1', 'মাওলানা হাফিজুর রহমান', '+8801711000099');
  assert(acceptRes.success, 'Manager accepted invite successfully');

  const managersList = await fetchHuzurManagers(testHuzurId);
  assert(managersList.length > 0, 'Huzur managers list contains newly added delegate');

  const mgrId = managersList[0].id;
  const revokeRes = await revokeManager(mgrId);
  assert(revokeRes, 'Manager access revoked successfully');

  // 6. Proxy / Middleware File Verification
  const proxyPath = path.join(process.cwd(), 'src/proxy.ts');
  const proxyContent = fs.readFileSync(proxyPath, 'utf8');
  assert(proxyContent.includes('isDashboardRoute'), 'proxy.ts checks dashboard routes');
  assert(proxyContent.includes('NextResponse.redirect(loginUrl)'), 'proxy.ts redirects unauthenticated users to login');
  assert(proxyContent.includes('/dashboard/organizer'), 'proxy.ts handles role mismatch redirects');

  // 7. Pages & Components Existence
  assert(fs.existsSync(path.join(process.cwd(), 'src/app/[locale]/(auth)/register/page.tsx')), 'Register page exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src/app/[locale]/(auth)/login/page.tsx')), 'Login page exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src/components/auth/OtpInput.tsx')), 'OtpInput component exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src/components/profile/HuzurProfileForm.tsx')), 'HuzurProfileForm component exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src/components/profile/OrganizerProfileForm.tsx')), 'OrganizerProfileForm component exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src/components/profile/ManagerDelegation.tsx')), 'ManagerDelegation component exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src/app/[locale]/invite/accept/page.tsx')), 'Invite accept page exists');

  console.log('🎉 ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runPhase2Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
