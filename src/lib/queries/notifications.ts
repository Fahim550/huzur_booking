import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { isRealSupabaseConfigured } from '@/lib/auth';
import { SEED_NOTIFICATIONS } from '@/lib/data/mockData';

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  related_booking_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

// In-memory notifications store for local development, simulation, and tests
export const IN_MEMORY_NOTIFICATIONS: NotificationRecord[] = [
  ...SEED_NOTIFICATIONS.map((n) => ({
    id: n.id,
    user_id: n.user_id,
    type: (n.title && n.title.includes('অনুরোধ')) ? 'booking_request' : 'booking_confirmed',
    message: n.message_bn || n.message || 'বিজ্ঞপ্তি বার্তা',
    is_read: Boolean(n.is_read),
    related_booking_id: n.related_booking_id || n.booking_id || null,
    scheduled_at: n.scheduled_at || null,
    sent_at: n.sent_at || '2026-09-02T12:05:00Z',
    created_at: n.created_at,
  })),
  {
    id: 'notif-3',
    user_id: '00000000-0000-0000-0000-000000000011',
    type: 'booking_request',
    message: 'নতুন মাহফিল বুকিং আবেদন এসেছে: ২০২৬-১১-১৮ তারিখে মিরপুর কেন্দ্রীয় জামে মসজিদ',
    is_read: false,
    related_booking_id: 'c1111111-1111-1111-1111-111111111111',
    scheduled_at: null,
    sent_at: '2026-09-04T10:00:00Z',
    created_at: '2026-09-04T10:00:00Z',
  },
  {
    id: 'notif-4',
    user_id: 'b1111111-1111-1111-1111-111111111111',
    type: 'reminder_7day',
    message: 'আসন্ন মাহফিলের ৭ দিন বাকি: আগামী ২০২৬-১১-১৫ তারিখে কুমিল্লা কেন্দ্রীয় ঈদগাহ মাঠে আপনার মাহফিল নির্ধারিত রয়েছে।',
    is_read: false,
    related_booking_id: 'c1111111-1111-1111-1111-111111111111',
    scheduled_at: null,
    sent_at: '2026-09-04T12:00:00Z',
    created_at: '2026-09-04T12:00:00Z',
  },
];

/**
 * Fetch all notifications for a given user, ordered by creation time descending
 */
export async function fetchUserNotifications(
  client: SupabaseClient<Database>,
  userId: string
): Promise<NotificationRecord[]> {
  if (isRealSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        return data as NotificationRecord[];
      }
    } catch (err) {
      console.warn('Supabase notifications query failed, using in-memory store:', err);
    }
  }

  // In-memory fallback
  return IN_MEMORY_NOTIFICATIONS.filter(
    (n) => n.user_id === userId || userId === '00000000-0000-0000-0000-000000000011'
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Get unread notification count for badge display
 */
export async function getUnreadNotificationCount(
  client: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  if (isRealSupabaseConfigured()) {
    try {
      const { count, error } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error && typeof count === 'number') {
        return count;
      }
    } catch (err) {
      console.warn('Supabase count query failed, using in-memory store:', err);
    }
  }

  return IN_MEMORY_NOTIFICATIONS.filter(
    (n) => (n.user_id === userId || userId === '00000000-0000-0000-0000-000000000011') && !n.is_read
  ).length;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  client: SupabaseClient<Database>,
  notificationId: string
): Promise<boolean> {
  if (isRealSupabaseConfigured()) {
    try {
      const { error } = await (client.from('notifications') as any)
        .update({ is_read: true })
        .eq('id', notificationId);

      if (!error) return true;
    } catch (err) {
      console.warn('Supabase mark read error:', err);
    }
  }

  const idx = IN_MEMORY_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
  if (idx !== -1) {
    IN_MEMORY_NOTIFICATIONS[idx].is_read = true;
    return true;
  }
  return false;
}

/**
 * Mark all unread notifications for a user as read
 */
export async function markAllNotificationsAsRead(
  client: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  if (isRealSupabaseConfigured()) {
    try {
      const { error } = await (client.from('notifications') as any)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error) return true;
    } catch (err) {
      console.warn('Supabase mark all read error:', err);
    }
  }

  let updated = false;
  for (const n of IN_MEMORY_NOTIFICATIONS) {
    if ((n.user_id === userId || userId === '00000000-0000-0000-0000-000000000011') && !n.is_read) {
      n.is_read = true;
      updated = true;
    }
  }
  return updated;
}

/**
 * Insert a notification record (used by API and Cron reminder jobs)
 */
export async function insertNotificationRecord(
  client: SupabaseClient<Database>,
  record: {
    userId: string;
    type: string;
    message: string;
    relatedBookingId?: string | null;
    scheduledAt?: string | null;
    sentAt?: string | null;
  }
): Promise<NotificationRecord> {
  const newNotification: NotificationRecord = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: record.userId,
    type: record.type,
    message: record.message,
    is_read: false,
    related_booking_id: record.relatedBookingId || null,
    scheduled_at: record.scheduledAt || null,
    sent_at: record.sentAt || null,
    created_at: new Date().toISOString(),
  };

  if (isRealSupabaseConfigured()) {
    try {
      const { data, error } = await (client.from('notifications') as any)
        .insert({
          user_id: record.userId,
          type: record.type,
          message: record.message,
          related_booking_id: record.relatedBookingId || null,
          scheduled_at: record.scheduledAt || null,
          sent_at: record.sentAt || null,
          is_read: false,
        })
        .select('*')
        .single();

      if (!error && data) {
        return data as NotificationRecord;
      }
    } catch (err) {
      console.warn('Supabase insert notification error, storing in-memory:', err);
    }
  }

  IN_MEMORY_NOTIFICATIONS.unshift(newNotification);
  return newNotification;
}

/**
 * Check if a reminder for a booking already exists (Idempotency check for Cron)
 */
export async function checkReminderExists(
  client: SupabaseClient<Database>,
  bookingId: string,
  reminderType: string
): Promise<boolean> {
  if (isRealSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('notifications')
        .select('id')
        .eq('related_booking_id', bookingId)
        .eq('type', reminderType)
        .limit(1);

      if (!error && data && data.length > 0) {
        return true;
      }
    } catch (err) {
      console.warn('Supabase checkReminderExists failed, fallback:', err);
    }
  }

  return IN_MEMORY_NOTIFICATIONS.some(
    (n) => n.related_booking_id === bookingId && n.type === reminderType
  );
}
