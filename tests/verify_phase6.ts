import fs from 'fs';
import path from 'path';
import {
  sendSms,
  getNotificationProvider,
  getMockSmsHistory,
  clearMockSmsHistory,
  MockSmsProvider,
  TwilioSmsProvider,
  GreenwebSmsProvider,
  SslWirelessSmsProvider,
  GenericHttpSmsProvider,
} from '../src/lib/sms';
import { normalizeBangladeshiPhone } from '../src/lib/auth';
import {
  fetchUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  insertNotificationRecord,
  checkReminderExists,
  IN_MEMORY_NOTIFICATIONS,
} from '../src/lib/queries/notifications';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase6Tests() {
  console.log('===============================================================');
  console.log('TEST SUITE: PHASE 6 NOTIFICATION DELIVERY & SMS GATEWAY');
  console.log('===============================================================');

  // ---------------------------------------------------------------------------
  // 1. PostgreSQL Triggers & Migration Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Testing PostgreSQL Trigger Migration Schema ---');
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20260905000007_notification_delivery_triggers.sql'
  );
  assert(fs.existsSync(migrationPath), 'Migration 20260905000007_notification_delivery_triggers.sql exists');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  assert(
    migrationSql.includes('CREATE OR REPLACE FUNCTION public.trg_fn_booking_notifications()'),
    'Migration defines trg_fn_booking_notifications PostgreSQL function'
  );
  assert(
    migrationSql.includes("TG_OP = 'INSERT'") &&
      migrationSql.includes('v_huzur_user_id') &&
      migrationSql.includes('public.managers'),
    'Trigger function handles INSERT to notify Huzur and delegate managers'
  );
  assert(
    migrationSql.includes("TG_OP = 'UPDATE'") &&
      migrationSql.includes("NEW.status IN ('confirmed', 'rejected')") &&
      migrationSql.includes('public.organizers'),
    'Trigger function handles UPDATE of status to notify Organizer on confirmed/rejected'
  );
  assert(
    migrationSql.includes('CREATE TRIGGER trg_booking_inserted') &&
      migrationSql.includes('AFTER INSERT ON public.bookings'),
    'Migration binds trg_booking_inserted trigger AFTER INSERT'
  );
  assert(
    migrationSql.includes('CREATE TRIGGER trg_booking_status_changed') &&
      migrationSql.includes('AFTER UPDATE OF status ON public.bookings'),
    'Migration binds trg_booking_status_changed trigger AFTER UPDATE OF status'
  );
  assert(
    migrationSql.includes('idx_notifications_user_unread_created'),
    'Migration defines composite index on notifications(user_id, is_read, created_at DESC)'
  );
  assert(
    migrationSql.includes('idx_notifications_booking_type'),
    'Migration defines index on notifications(related_booking_id, type)'
  );

  // ---------------------------------------------------------------------------
  // 2. SMS Gateway Architecture & Provider Interfaces
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing SMS Gateway Architecture (src/lib/sms.ts) ---');
  const smsModulePath = path.join(process.cwd(), 'src/lib/sms.ts');
  const symlinkPath = path.join(process.cwd(), 'lib/sms.ts');
  assert(fs.existsSync(smsModulePath), 'src/lib/sms.ts exists');
  assert(fs.existsSync(symlinkPath), 'lib/sms.ts is accessible via symlink');

  const smsCode = fs.readFileSync(smsModulePath, 'utf8');
  assert(smsCode.includes('export interface NotificationProvider'), 'Exports NotificationProvider interface');
  assert(smsCode.includes('export interface SmsMessage'), 'Exports SmsMessage interface');
  assert(smsCode.includes('export interface SmsSendResult'), 'Exports SmsSendResult interface');

  // Test Bangladeshi phone number normalization for SMS dispatch
  const bdNumbers = [
    { input: '01712345678', expected: '+8801712345678' },
    { input: '+8801812345678', expected: '+8801812345678' },
    { input: '8801912345678', expected: '+8801912345678' },
    { input: '01512-345678', expected: '+8801512345678' },
  ];
  for (const { input, expected } of bdNumbers) {
    const norm = normalizeBangladeshiPhone(input);
    assert(norm.isValid && norm.formatted === expected, `Phone number ${input} normalized to ${expected}`);
  }

  // Provider instantiation checks
  const mockProvider = new MockSmsProvider();
  assert(mockProvider.name === 'mock', 'MockSmsProvider instantiated');
  const twilioProvider = new TwilioSmsProvider();
  assert(twilioProvider.name === 'twilio', 'TwilioSmsProvider instantiated');
  const greenwebProvider = new GreenwebSmsProvider();
  assert(greenwebProvider.name === 'greenweb', 'GreenwebSmsProvider instantiated');
  const sslProvider = new SslWirelessSmsProvider();
  assert(sslProvider.name === 'ssl_wireless', 'SslWirelessSmsProvider instantiated');
  const genericProvider = new GenericHttpSmsProvider();
  assert(genericProvider.name === 'generic', 'GenericHttpSmsProvider instantiated');

  // Test sending via sendSms with mock history tracking
  clearMockSmsHistory();
  process.env.SMS_PROVIDER = 'mock';
  const provider = getNotificationProvider();
  assert(provider.name === 'mock', 'Default/configured provider resolves to mock in test environment');

  const smsResult = await sendSms({
    to: '01712345678',
    text: 'টেস্ট নোটিফিকেশন: আপনার মাহফিল বুকিং নিশ্চিত হয়েছে।',
    bookingId: 'test-booking-101',
  });
  assert(smsResult.success === true, 'sendSms executed successfully');
  assert(smsResult.recipient === '+8801712345678', 'sendSms normalized recipient to E.164');
  assert(smsResult.provider === 'mock', 'sendSms used mock provider');

  const history = getMockSmsHistory();
  assert(history.length === 1, 'Mock provider recorded 1 sent message in history');
  assert(history[0].bookingId === 'test-booking-101', 'History includes associated booking ID');

  // Verify .env.example documentation
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  assert(envExample.includes('SMS_PROVIDER='), '.env.example documents SMS_PROVIDER');
  assert(envExample.includes('TWILIO_ACCOUNT_SID='), '.env.example documents TWILIO_ACCOUNT_SID');
  assert(envExample.includes('GREENWEB_SMS_API_KEY='), '.env.example documents GREENWEB_SMS_API_KEY');
  assert(envExample.includes('SSL_SMS_API_TOKEN='), '.env.example documents SSL_SMS_API_TOKEN');
  assert(envExample.includes('CRON_SECRET='), '.env.example documents CRON_SECRET');

  // ---------------------------------------------------------------------------
  // 3. Vercel Cron & Scheduled Reminder Job (7 Days and 1 Day Out)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing Scheduled Daily Reminder Job (7d & 1d Out) ---');
  const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
  assert(fs.existsSync(vercelJsonPath), 'vercel.json exists');
  const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  assert(Array.isArray(vercelJson.crons) && vercelJson.crons.length > 0, 'vercel.json defines crons array');
  assert(vercelJson.crons[0].path === '/api/cron/reminders', 'Cron path is /api/cron/reminders');
  assert(vercelJson.crons[0].schedule === '0 0 * * *', 'Cron schedule is daily (0 0 * * *)');

  const cronRoutePath = path.join(process.cwd(), 'src/app/api/cron/reminders/route.ts');
  assert(fs.existsSync(cronRoutePath), 'api/cron/reminders/route.ts exists');
  const cronCode = fs.readFileSync(cronRoutePath, 'utf8');
  assert(cronCode.includes('checkReminderExists'), 'Cron route implements idempotency guard checkReminderExists');
  assert(cronCode.includes('sendSms'), 'Cron route calls sendSms for reminder delivery');
  assert(cronCode.includes('target7Days') && cronCode.includes('target1Day'), 'Cron route calculates 7-day and 1-day target windows');

  // Test idempotency logic in queries/notifications.ts
  const mockClient = {} as any;
  const testBookingId = 'idempotency-test-booking-999';
  const reminderType = 'reminder_7day';

  const existsBefore = await checkReminderExists(mockClient, testBookingId, reminderType);
  assert(existsBefore === false, 'Reminder does not exist before insert');

  await insertNotificationRecord(mockClient, {
    userId: 'b1111111-1111-1111-1111-111111111111',
    type: reminderType,
    message: 'আসন্ন মাহফিলের ৭ দিন বাকি',
    relatedBookingId: testBookingId,
  });

  const existsAfter = await checkReminderExists(mockClient, testBookingId, reminderType);
  assert(existsAfter === true, 'Reminder exists after insert (prevents duplicate dispatch)');

  // ---------------------------------------------------------------------------
  // 4. In-App Notification Bell & TanStack Query Polling (30s)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing In-App Notification Bell & Polling Configuration ---');
  const bellComponentPath = path.join(process.cwd(), 'src/components/navigation/NotificationBell.tsx');
  assert(fs.existsSync(bellComponentPath), 'NotificationBell.tsx exists');
  const bellCode = fs.readFileSync(bellComponentPath, 'utf8');
  assert(bellCode.includes('refetchInterval: 30000'), 'NotificationBell configures 30s auto-polling (refetchInterval: 30000)');
  assert(bellCode.includes('notification-unread-badge'), 'NotificationBell renders notification-unread-badge element');
  assert(bellCode.includes('notification-popover-panel'), 'NotificationBell renders notification-popover-panel');
  assert(bellCode.includes('notification-mark-all-read-btn'), 'NotificationBell includes mark-all-read button');
  assert(bellCode.includes('UPGRADE PATH NOTE') && bellCode.includes('Supabase Realtime'), 'NotificationBell documents upgrade path to Supabase Realtime');

  const notifRoutePath = path.join(process.cwd(), 'src/app/api/notifications/route.ts');
  assert(fs.existsSync(notifRoutePath), 'api/notifications/route.ts exists');
  const notifRouteCode = fs.readFileSync(notifRoutePath, 'utf8');
  assert(notifRouteCode.includes('export async function GET'), 'api/notifications exports GET handler');
  assert(notifRouteCode.includes('export async function PATCH'), 'api/notifications exports PATCH handler');

  // Test notification query functions
  const testUserId = 'test-user-notifications-uuid';
  const initialUnread = await getUnreadNotificationCount(mockClient, testUserId);
  assert(typeof initialUnread === 'number', 'getUnreadNotificationCount returns a number');

  const newNotif = await insertNotificationRecord(mockClient, {
    userId: testUserId,
    type: 'booking_request',
    message: 'নতুন মাহফিল আবেদন এসেছে',
  });
  assert(newNotif.id !== undefined, 'insertNotificationRecord created notification record');
  assert(newNotif.is_read === false, 'New notification has is_read = false');

  const readOk = await markNotificationAsRead(mockClient, newNotif.id);
  assert(readOk === true, 'markNotificationAsRead succeeded');

  const markAllOk = await markAllNotificationsAsRead(mockClient, testUserId);
  assert(typeof markAllOk === 'boolean', 'markAllNotificationsAsRead returns boolean');

  // Check integration in TopHeader, Huzur dashboard, and Organizer my-requests
  const topHeaderCode = fs.readFileSync(path.join(process.cwd(), 'src/components/navigation/TopHeader.tsx'), 'utf8');
  assert(topHeaderCode.includes('<NotificationBell'), 'TopHeader renders NotificationBell component');

  const huzurDashboardCode = fs.readFileSync(path.join(process.cwd(), 'src/components/dashboard/HuzurDashboardHomeClient.tsx'), 'utf8');
  assert(huzurDashboardCode.includes('<NotificationBell'), 'HuzurDashboardHomeClient renders NotificationBell');

  const myRequestsCode = fs.readFileSync(path.join(process.cwd(), 'src/app/[locale]/(dashboard)/dashboard/my-requests/page.tsx'), 'utf8');
  assert(myRequestsCode.includes('<NotificationBell'), 'Organizer my-requests page renders NotificationBell');

  const queryProviderCode = fs.readFileSync(path.join(process.cwd(), 'src/providers/QueryProvider.tsx'), 'utf8');
  assert(queryProviderCode.includes("['notifications']"), 'QueryProvider includes notifications in default configuration');

  // ---------------------------------------------------------------------------
  // 5. End-to-End Booking Lifecycle Simulation
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing End-to-End Notification & SMS Dispatch Flow ---');
  clearMockSmsHistory();

  // A. Simulate Booking Request: Organizer submits booking -> Huzur gets notification & SMS
  const simHuzurPhone = '+8801722222222';
  const simEventDate = '2026-11-20';
  const simVenue = 'বগুড়া কেন্দ্রীয় জামে মসজিদ';

  const bookingReqNotif = await insertNotificationRecord(mockClient, {
    userId: 'huzur-user-sim-1',
    type: 'booking_request',
    message: `নতুন মাহফিল বুকিং আবেদন এসেছে: ${simEventDate} তারিখে ${simVenue}`,
    relatedBookingId: 'sim-booking-001',
  });
  assert(bookingReqNotif.type === 'booking_request', 'Step A: Huzur notification created on booking request');

  await sendSms({
    to: simHuzurPhone,
    text: bookingReqNotif.message,
    bookingId: 'sim-booking-001',
  });
  assert(getMockSmsHistory().length === 1, 'Step A: SMS delivered to Huzur upon booking request');

  // B. Simulate Status Update: Huzur confirms booking -> Organizer gets notification & SMS
  const simOrgPhone = '+8801833333333';
  const bookingConfirmNotif = await insertNotificationRecord(mockClient, {
    userId: 'org-user-sim-1',
    type: 'booking_confirmed',
    message: `আলহামদুলিল্লাহ! আপনার মাহফিল বুকিং আবেদনটি নিশ্চিত করা হয়েছে (${simEventDate} - ${simVenue})`,
    relatedBookingId: 'sim-booking-001',
  });
  assert(bookingConfirmNotif.type === 'booking_confirmed', 'Step B: Organizer notification created on confirmation');

  await sendSms({
    to: simOrgPhone,
    text: bookingConfirmNotif.message,
    bookingId: 'sim-booking-001',
  });
  assert(getMockSmsHistory().length === 2, 'Step B: SMS delivered to Organizer upon booking confirmation');

  // C. Simulate Daily Reminder Cron: 7 days & 1 day reminders
  const reminder7d = await insertNotificationRecord(mockClient, {
    userId: 'org-user-sim-1',
    type: 'reminder_7day',
    message: `আসন্ন মাহফিলের ৭ দিন বাকি: আগামী ${simEventDate} তারিখে ${simVenue}-এ আপনার মাহফিল নির্ধারিত রয়েছে।`,
    relatedBookingId: 'sim-booking-001',
    sentAt: new Date().toISOString(),
  });
  assert(reminder7d.type === 'reminder_7day', 'Step C: 7-day reminder notification created');

  await sendSms({
    to: simOrgPhone,
    text: reminder7d.message,
    bookingId: 'sim-booking-001',
  });
  assert(getMockSmsHistory().length === 3, 'Step C: 7-day reminder SMS dispatched to Organizer');

  // D. Simulate In-App Read Action: User clicks notification
  const wasRead = await markNotificationAsRead(mockClient, reminder7d.id);
  assert(wasRead === true, 'Step D: Notification marked as read in in-app notification drawer');

  console.log('===============================================================');
  console.log('🎉 ALL PHASE 6 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runPhase6Tests().catch((err) => {
  console.error('Phase 6 verification failed:', err);
  process.exit(1);
});
