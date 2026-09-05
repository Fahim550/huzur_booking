'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  MapPin,
  Phone,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Plus,
  UserCheck,
  CalendarDays,
} from 'lucide-react';
import { BookingWithDetails, BookingStatus } from '@/types/database';
import { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import { getClientUser, AuthSessionUser } from '@/lib/auth';
import { SEED_BOOKINGS } from '@/lib/data/mockData';
import NotificationBell from '@/components/navigation/NotificationBell';

interface HuzurDashboardHomeClientProps {
  locale: Locale;
  initialHuzurId?: string;
}

export default function HuzurDashboardHomeClient({
  locale,
  initialHuzurId = 'a1111111-1111-1111-1111-111111111111',
}: HuzurDashboardHomeClientProps) {
  const queryClient = useQueryClient();
  const dict = getDictionary(locale);

  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [actingBookingId, setActingBookingId] = useState<string | null>(null);

  useEffect(() => {
    getClientUser().then((u) => {
      if (u) setCurrentUser(u);
    });
  }, []);

  const huzurId = initialHuzurId;

  // Query bookings for this huzur
  const { data: bookings = SEED_BOOKINGS, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ['huzur-dashboard-bookings', huzurId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/bookings?huzurId=${encodeURIComponent(huzurId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.bookings && Array.isArray(json.bookings)) {
            return json.bookings;
          }
        }
      } catch (e) {
        console.warn('Huzur bookings fetch failed, using fallback:', e);
      }
      return SEED_BOOKINGS;
    },
    staleTime: 15000,
  });

  // Mutation for 1-click Approve / Reject from dashboard
  const statusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: BookingStatus }) => {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error('Failed to update booking status');
      }
      return res.json();
    },
    onMutate: async ({ bookingId, status }) => {
      setActingBookingId(bookingId);
      await queryClient.cancelQueries({ queryKey: ['huzur-dashboard-bookings', huzurId] });
      const previous = queryClient.getQueryData<BookingWithDetails[]>(['huzur-dashboard-bookings', huzurId]);

      if (previous) {
        queryClient.setQueryData<BookingWithDetails[]>(
          ['huzur-dashboard-bookings', huzurId],
          previous.map((b) => (b.id === bookingId ? { ...b, status } : b))
        );
      }
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['huzur-dashboard-bookings', huzurId], context.previous);
      }
      alert(locale === 'bn' ? 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।' : 'Failed to update status.');
    },
    onSettled: () => {
      setActingBookingId(null);
      queryClient.invalidateQueries({ queryKey: ['huzur-dashboard-bookings', huzurId] });
      queryClient.invalidateQueries({ queryKey: ['huzur-calendar-bookings', huzurId] });
    },
  });

  const handleAction = (bookingId: string, status: BookingStatus) => {
    const promptText =
      status === 'confirmed'
        ? locale === 'bn'
          ? 'আপনি কি এই মাহফিল বুকিংটি নিশ্চিত করতে চান?'
          : 'Do you want to confirm this booking?'
        : locale === 'bn'
        ? 'আপনি কি এই বুকিং আবেদনটি প্রত্যাখ্যান করতে চান?'
        : 'Do you want to reject this booking?';

    if (window.confirm(promptText)) {
      statusMutation.mutate({ bookingId, status });
    }
  };

  // 1. Pending bookings
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const pendingCount = pendingBookings.length;

  // 2. Upcoming confirmed mahfils sorted chronologically by event_date ascending
  const upcomingConfirmed = bookings
    .filter((b) => b.status === 'confirmed')
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  const confirmedCount = upcomingConfirmed.length;

  const quickLinks = [
    {
      title: locale === 'bn' ? 'ক্যালেন্ডার সময়সূচি' : 'Calendar Schedule',
      desc: locale === 'bn' ? 'তারিখভিত্তিক শিডিউল ও বুকিং স্থিতি' : 'View full calendar timeline',
      href: `/${locale}/dashboard/calendar`,
      icon: Calendar,
      color: 'from-emerald-600 to-teal-700',
    },
    {
      title: locale === 'bn' ? 'প্রাপ্যতা ঘোষণা করুন' : 'Post Availability',
      desc: locale === 'bn' ? 'সফর ও উন্মুক্ত তারিখ নির্ধারণ' : 'Post open travel dates',
      href: `/${locale}/availability`,
      icon: CalendarDays,
      color: 'from-blue-600 to-indigo-700',
    },
    {
      title: locale === 'bn' ? 'প্রতিনিধি ম্যানেজার' : 'Delegate Managers',
      desc: locale === 'bn' ? 'দায়িত্বপ্রাপ্ত মুখপাত্র ও সমন্বয়ক' : 'Manage delegate coordinators',
      href: `/${locale}/profile?tab=delegates`,
      icon: Users,
      color: 'from-purple-600 to-violet-700',
    },
    {
      title: locale === 'bn' ? 'প্রোফাইল ও হাদিয়া' : 'Profile & Hadya',
      desc: locale === 'bn' ? 'বায়ো, প্রতিষ্ঠান ও আলোচনার বিষয়' : 'Edit profile, topics & bio',
      href: `/${locale}/profile`,
      icon: UserCheck,
      color: 'from-amber-600 to-orange-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-zinc-900 rounded-2xl p-6 sm:p-7 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-700/60 text-emerald-200 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
              {locale === 'bn' ? 'হুজুর / সমন্বয়কারী ড্যাশবোর্ড' : 'Huzur Command Center'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif">
              {locale === 'bn' ? 'মাহফিল সময়সূচি ও বুকিং সমন্বয়' : 'Mahfil Schedule & Booking Coordination'}
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-xl">
              {locale === 'bn'
                ? 'আসন্ন নিশ্চিত মাহফিলসমূহ, অপেক্ষমাণ বুকিং আবেদন ও সরাসরি শিডিউল নিয়ন্ত্রক প্যানেল।'
                : 'Manage upcoming confirmed speaking engagements, approve requests, and publish availability.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white/10 dark:bg-zinc-800/60 rounded-xl border border-white/15">
              <NotificationBell locale={locale} />
            </div>
            <Link
              href={`/${locale}/dashboard/calendar`}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5 min-h-[44px]"
            >
              <Calendar className="w-4 h-4" />
              <span>{locale === 'bn' ? 'ক্যালেন্ডার ভিউ' : 'Calendar View'}</span>
            </Link>
            <Link
              href={`/${locale}/availability`}
              className="px-4 py-2.5 bg-white text-emerald-950 rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-50 transition-colors shadow-sm min-h-[44px] flex items-center gap-1"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>{locale === 'bn' ? 'তারিখ উন্মুক্ত করুন' : 'Post Availability'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {locale === 'bn' ? 'অপেক্ষমাণ আবেদন' : 'Pending Requests'}
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
            {locale === 'bn' ? pendingCount.toLocaleString('bn-BD') : pendingCount}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {locale === 'bn' ? 'আসন্ন নিশ্চিত মাহফিল' : 'Confirmed Mahfils'}
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">
            {locale === 'bn' ? confirmedCount.toLocaleString('bn-BD') : confirmedCount}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {locale === 'bn' ? 'মোট মাহফিল' : 'Total Engagements'}
            </span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {locale === 'bn' ? bookings.length.toLocaleString('bn-BD') : bookings.length}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {locale === 'bn' ? 'দায়িত্বপ্রাপ্ত প্রতিনিধি' : 'Managers'}
            </span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {locale === 'bn' ? '২ জন' : '2'}
          </p>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>{locale === 'bn' ? 'দ্রুত অ্যাক্সেস ও সমন্বয়' : 'Quick Actions & Links'}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-all shadow-xs group flex flex-col justify-between min-h-[90px]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center text-white shadow-xs`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{link.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Pending Requests Queue (if any) */}
      {pendingCount > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="font-bold text-base text-amber-900 dark:text-amber-200">
                {locale === 'bn'
                  ? `অপেক্ষমাণ বুকিং আবেদন (${pendingCount.toLocaleString('bn-BD')} টি)`
                  : `Pending Booking Requests (${pendingCount})`}
              </h2>
            </div>
            <Link
              href={`/${locale}/dashboard/calendar`}
              className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline inline-flex items-center gap-1"
            >
              <span>{locale === 'bn' ? 'ক্যালেন্ডারে দেখুন' : 'View Calendar'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingBookings.map((b) => {
              const booking = b as any;
              const slotLabel =
                dict.reference?.slots?.[booking.session_slot || 'after_esha'] ||
                booking.session_slot ||
                'বাদ এশা';
              const districtStr =
                typeof booking.district === 'string'
                  ? booking.district
                  : booking.district?.bn_name || booking.district?.name || 'ঢাকা';

              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-amber-200/80 dark:border-amber-800/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950 px-2 py-0.5 rounded-md">
                        {b.event_date} ({slotLabel})
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {districtStr}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                      {booking.mahfil_name || booking.event_details || 'ওয়াজ মাহফিল'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        {b.venue_address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        {booking.contact_person_name || 'আয়োজক কমিটি'} ({booking.contact_phone || '+8801700000000'})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(b.id, 'confirmed')}
                      disabled={actingBookingId === b.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all min-h-[44px] disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{locale === 'bn' ? 'অনুমোদন করুন' : 'Confirm'}</span>
                    </button>
                    <button
                      onClick={() => handleAction(b.id, 'rejected')}
                      disabled={actingBookingId === b.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold transition-all min-h-[44px] disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>{locale === 'bn' ? 'প্রত্যাখ্যান' : 'Reject'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Confirmed Mahfils (Sorted by Date Ascending) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
              {locale === 'bn'
                ? `আসন্ন নিশ্চিত মাহফিলসমূহ (তারিখানুসারে সাজানো)`
                : `Upcoming Confirmed Mahfils (Sorted by Date)`}
            </h2>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {locale === 'bn'
              ? `মোট ${confirmedCount.toLocaleString('bn-BD')} টি`
              : `${confirmedCount} total`}
          </span>
        </div>

        {upcomingConfirmed.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center space-y-3">
            <Calendar className="w-8 h-8 mx-auto text-zinc-400" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {locale === 'bn'
                ? 'বর্তমানে কোনো নিশ্চিত মাহফিল নেই।'
                : 'No upcoming confirmed mahfils found.'}
            </p>
            <Link
              href={`/${locale}/availability`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>{locale === 'bn' ? 'নতুন তারিখের প্রাপ্যতা ঘোষণা করুন' : 'Post Open Dates'}</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingConfirmed.map((b) => {
              const booking = b as any;
              const slotLabel =
                dict.reference?.slots?.[booking.session_slot || 'after_esha'] ||
                booking.session_slot ||
                'বাদ এশা';
              const districtStr =
                typeof booking.district === 'string'
                  ? booking.district
                  : booking.district?.bn_name || booking.district?.name || 'ঢাকা';

              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{b.event_date}</span>
                      </div>
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {slotLabel}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800/60">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{locale === 'bn' ? 'নিশ্চিতকৃত' : 'Confirmed'}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                      {booking.mahfil_name || booking.event_details || 'ওয়াজ মাহফিল'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">
                        {b.venue_address}, {districtStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">
                        {booking.contact_person_name || 'আয়োজক'} ({booking.contact_phone || '+8801700000000'})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-zinc-500">
                      {locale === 'bn' ? 'হাদিয়া: ' : 'Hadya: '}
                      <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        {booking.hadya_offered
                          ? locale === 'bn'
                            ? `${booking.hadya_offered.toLocaleString('bn-BD')} ৳`
                            : `BDT ${booking.hadya_offered.toLocaleString('en-US')}`
                          : locale === 'bn'
                          ? 'আলোচনা সাপেক্ষে'
                          : 'Negotiable'}
                      </strong>
                    </span>

                    {booking.contact_phone && (
                      <a
                        href={`tel:${booking.contact_phone}`}
                        className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline min-h-[44px] px-2 py-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'সরাসরি কল' : 'Call'}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Double Booking Prevention Banner */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">
            {locale === 'bn' ? 'দ্বৈত বুকিং প্রতিরোধ সক্রিয়' : 'Double Booking Prevention Active'}
          </p>
          <p className="text-emerald-800/80 dark:text-emerald-300/80 text-xs mt-0.5">
            {locale === 'bn'
              ? 'ডাটাবেজে Postgres EXCLUDE constraint কার্যকর রয়েছে। একই তারিখে দুটি অনুমোদিত বা অপেক্ষমাণ আবেদন গ্রহণ করা হবে না।'
              : 'Postgres EXCLUDE constraint protects your schedule from concurrent double booking.'}
          </p>
        </div>
      </div>
    </div>
  );
}
