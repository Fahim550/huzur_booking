'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { Locale } from '@/lib/i18n/config';
import { getClientUser, AuthSessionUser } from '@/lib/auth';
import type { NotificationRecord } from '@/lib/queries/notifications';

interface NotificationBellProps {
  locale?: Locale;
  className?: string;
  align?: 'left' | 'right';
}

function formatRelativeTime(dateString: string, locale: Locale): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (locale === 'en') {
    if (diffSeconds < 60) return 'Just now';
    const mins = Math.floor(diffSeconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  }

  // Bengali numerals & relative wording
  const toBnNumber = (n: number) =>
    n.toString().replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);

  if (diffSeconds < 60) return 'এইমাত্র';
  const mins = Math.floor(diffSeconds / 60);
  if (mins < 60) return `${toBnNumber(mins)} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${toBnNumber(hours)} ঘণ্টা আগে`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'গতকাল';
  return `${toBnNumber(days)} দিন আগে`;
}

/**
 * In-App Notification Bell & Live Drawer
 * 
 * Data Layer: TanStack Query polling every 30 seconds (refetchInterval: 30000).
 * 
 * UPGRADE PATH NOTE:
 * To upgrade from 30s HTTP polling to instantaneous push delivery via Supabase Realtime:
 * 1. Import createClient from '@/lib/supabase/client'
 * 2. In a useEffect hook:
 *    const channel = supabase
 *      .channel('live-notifications')
 *      .on('postgres_changes', {
 *        event: 'INSERT',
 *        schema: 'public',
 *        table: 'notifications',
 *        filter: `user_id=eq.${user.id}`,
 *      }, () => {
 *        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
 *      })
 *      .subscribe();
 *    return () => { supabase.removeChannel(channel); };
 */
export default function NotificationBell({
  locale = 'bn',
  className = '',
  align = 'right',
}: NotificationBellProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getClientUser().then((u) => {
      if (u) setUser(u);
    });
  }, []);

  const userId = user?.id || '00000000-0000-0000-0000-000000000011';

  // ---------------------------------------------------------------------------
  // 1. TanStack Query with 30s auto-polling
  // ---------------------------------------------------------------------------
  const { data, isLoading } = useQuery<{
    notifications: NotificationRecord[];
    unreadCount: number;
  }>({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return res.json();
    },
    // Requirement 4: Polling every 30s
    refetchInterval: 30000,
    staleTime: 15000,
    refetchOnWindowFocus: true,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount ?? notifications.filter((n) => !n.is_read).length;

  // ---------------------------------------------------------------------------
  // 2. Mutations: Mark single / all as read
  // ---------------------------------------------------------------------------
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', userId] });
      const prev = queryClient.getQueryData<{
        notifications: NotificationRecord[];
        unreadCount: number;
      }>(['notifications', userId]);

      if (prev) {
        queryClient.setQueryData(['notifications', userId], {
          notifications: prev.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        });
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['notifications', userId], context.prev);
      }
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true, userId }),
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', userId] });
      const prev = queryClient.getQueryData<{
        notifications: NotificationRecord[];
        unreadCount: number;
      }>(['notifications', userId]);

      if (prev) {
        queryClient.setQueryData(['notifications', userId], {
          notifications: prev.notifications.map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['notifications', userId], context.prev);
      }
    },
  });

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'booking_rejected':
        return <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />;
      case 'reminder_7day':
      case 'reminder_1day':
        return <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />;
      case 'booking_request':
      default:
        return <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200';
      case 'booking_rejected':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200';
      case 'reminder_7day':
      case 'reminder_1day':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200';
      case 'booking_request':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200';
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    if (locale === 'en') {
      switch (type) {
        case 'booking_confirmed':
          return 'Confirmed';
        case 'booking_rejected':
          return 'Cancelled';
        case 'reminder_7day':
          return '7-Day Alert';
        case 'reminder_1day':
          return '1-Day Alert';
        case 'booking_request':
        default:
          return 'New Request';
      }
    }
    switch (type) {
      case 'booking_confirmed':
        return 'বুকিং নিশ্চিত';
      case 'booking_rejected':
        return 'বাতিল';
      case 'reminder_7day':
        return '৭ দিন বাকি';
      case 'reminder_1day':
        return 'আগামীকাল';
      case 'booking_request':
      default:
        return 'নতুন আবেদন';
    }
  };

  return (
    <div ref={containerRef} className={clsx('relative inline-block text-left', className)}>
      {/* Bell Button */}
      <button
        type="button"
        id="notification-bell-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={locale === 'bn' ? 'বিজ্ঞপ্তি সমূহ' : 'Notifications'}
        aria-expanded={isOpen}
        className={clsx(
          'relative p-2.5 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center',
          isOpen
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
            : 'text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50/80 dark:text-zinc-300 dark:hover:text-emerald-300 dark:hover:bg-zinc-800/80'
        )}
      >
        <Bell className="w-5 h-5" />

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span
            id="notification-unread-badge"
            className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-bold rounded-full shadow-xs border-2 border-white dark:border-zinc-950 animate-in zoom-in"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
            <span className="absolute -inset-0.5 rounded-full bg-rose-500 opacity-40 animate-ping -z-10" />
          </span>
        )}
      </button>

      {/* Popover Notification Drawer */}
      {isOpen && (
        <div
          id="notification-popover-panel"
          className={clsx(
            'absolute mt-2 z-50 w-[92vw] max-w-sm sm:w-96 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-950/70 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150',
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          )}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-zinc-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <Bell className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  {locale === 'bn' ? 'বিজ্ঞপ্তি সমূহ' : 'Notifications'}
                </h3>
                <span className="text-[10px] text-emerald-200/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {locale === 'bn' ? 'প্রতি ৩০ সেকেন্ডে স্বয়ংক্রিয় রিফ্রেশ' : 'Auto-polling every 30s'}
                </span>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                id="notification-mark-all-read-btn"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white/10 hover:bg-white/20 active:scale-95 text-emerald-100 rounded-lg transition-colors"
                title={locale === 'bn' ? 'সবগুলো পড়া হয়েছে চিহ্নিত করুন' : 'Mark all as read'}
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>{locale === 'bn' ? 'সব পড়া হয়েছে' : 'Mark all read'}</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">{locale === 'bn' ? 'বিজ্ঞপ্তি লোড হচ্ছে...' : 'Loading notifications...'}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 flex flex-col items-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-medium">
                  {locale === 'bn' ? 'কোনো নতুন বিজ্ঞপ্তি নেই' : 'No new notifications'}
                </p>
                <p className="text-[11px] text-zinc-400 max-w-[200px]">
                  {locale === 'bn'
                    ? 'আপনার সকল বুকিং ও মাহফিল সংক্রান্ত নোটিফিকেশন এখানে প্রদর্শিত হবে।'
                    : 'Your booking requests and event reminders will appear here.'}
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const badgeStyle = getNotificationBadgeColor(n.type);
                const typeLabel = getNotificationTypeLabel(n.type);
                const timeAgo = formatRelativeTime(n.created_at, locale);

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) {
                        markAsReadMutation.mutate(n.id);
                      }
                    }}
                    className={clsx(
                      'p-3.5 sm:p-4 text-left transition-colors flex gap-3 cursor-pointer group',
                      n.is_read
                        ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60 opacity-85'
                        : 'bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40'
                    )}
                  >
                    {/* Status Icon */}
                    <div className="mt-0.5 p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs shrink-0 self-start">
                      {getNotificationIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={clsx(
                            'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                            badgeStyle
                          )}
                        >
                          {typeLabel}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                          <Clock className="w-3 h-3" />
                          <span>{timeAgo}</span>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 ml-0.5 shrink-0" />
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal">
                        {n.message}
                      </p>

                      {n.related_booking_id && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 group-hover:underline">
                          <span>{locale === 'bn' ? 'বুকিং বিবরণ দেখুন' : 'View booking'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Navigation */}
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
            <Link
              href={
                user?.role === 'organizer'
                  ? `/${locale}/dashboard/my-requests`
                  : `/${locale}/dashboard/huzur`
              }
              onClick={() => setIsOpen(false)}
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline px-2 py-1"
            >
              {locale === 'bn' ? 'ড্যাশবোর্ডে যান →' : 'Go to dashboard →'}
            </Link>

            <span className="text-[10px] text-zinc-400">
              {locale === 'bn'
                ? `মোট ${notifications.length}টি বিজ্ঞপ্তি`
                : `${notifications.length} notifications`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
