import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/queries/notifications';

export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const supabase = await createClient();

    // Determine target user id
    let targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id || null;
    }

    // Default to demo user if unauthenticated for preview experience
    if (!targetUserId) {
      targetUserId = '00000000-0000-0000-0000-000000000011';
    }

    const [notifications, unreadCount] = await Promise.all([
      fetchUserNotifications(supabase, targetUserId),
      getUnreadNotificationCount(supabase, targetUserId),
    ]);

    return NextResponse.json(
      {
        notifications,
        unreadCount,
        userId: targetUserId,
      },
      { headers: PRIVATE_HEADERS }
    );
  } catch (err) {
    console.error('API notifications GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, markAll, userId } = body as {
      id?: string;
      markAll?: boolean;
      userId?: string;
    };

    const supabase = await createClient();

    if (markAll && userId) {
      const success = await markAllNotificationsAsRead(supabase, userId);
      return NextResponse.json({ success, markedAll: true }, { headers: PRIVATE_HEADERS });
    }

    if (id) {
      const success = await markNotificationAsRead(supabase, id);
      return NextResponse.json({ success, id }, { headers: PRIVATE_HEADERS });
    }

    return NextResponse.json(
      { error: 'Either notification id or (markAll and userId) is required' },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  } catch (err) {
    console.error('API notifications PATCH error:', err);
    return NextResponse.json(
      { error: 'Failed to update notification status' },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }
}
