'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CalendarDays,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import type { BookingWithDetails, Division, District, Upazila } from '@/types/database';
import { Locale } from '@/lib/i18n/config';
import AvailabilityPostForm from './AvailabilityPostForm';

interface HuzurDashboardCalendarProps {
  huzurId: string;
  divisions: Division[];
  districts: District[];
  upazilas: Upazila[];
  locale: Locale;
}

export default function HuzurDashboardCalendar({
  huzurId,
  divisions,
  districts,
  upazilas,
  locale,
}: HuzurDashboardCalendarProps) {
  const isBn = locale === 'bn';
  const queryClient = useQueryClient();

  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Month navigation state: anchor to November 2026 for demonstration
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10); // 0-indexed: 10 = Nov

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // 1. Fetch Bookings with TanStack Query
  const {
    data: bookingsData,
    isLoading: isBookingsLoading,
    error: bookingsError,
  } = useQuery<{ bookings: BookingWithDetails[]; total: number }>({
    queryKey: ['huzur-calendar-bookings', huzurId],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?huzurId=${huzurId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return res.json();
    },
  });

  // 2. Fetch Availability Posts with TanStack Query
  const {
    data: availabilityData,
    isLoading: isAvailabilityLoading,
  } = useQuery<{ data: any[] }>({
    queryKey: ['huzur-availability-posts', huzurId],
    queryFn: async () => {
      const res = await fetch(`/api/availability-posts?huzurId=${huzurId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch availability posts');
      }
      return res.json();
    },
  });

  const bookings = bookingsData?.bookings || [];
  const availabilityPosts = availabilityData?.data || [];

  // Optimistic UI Mutation for Booking Status (Approve / Reject)
  const statusMutation = useMutation({
    mutationFn: async ({
      bookingId,
      status,
    }: {
      bookingId: string;
      status: 'confirmed' | 'rejected';
    }) => {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update booking');
      }
      return res.json();
    },
    onMutate: async ({ bookingId, status }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ['huzur-calendar-bookings', huzurId],
      });

      // Snapshot previous state
      const previousData = queryClient.getQueryData<{
        bookings: BookingWithDetails[];
        total: number;
      }>(['huzur-calendar-bookings', huzurId]);

      // Optimistically update cache
      if (previousData) {
        queryClient.setQueryData(['huzur-calendar-bookings', huzurId], {
          ...previousData,
          bookings: previousData.bookings.map((b) =>
            b.id === bookingId ? { ...b, status } : b
          ),
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ['huzur-calendar-bookings', huzurId],
          context.previousData
        );
      }
      alert(err.message || 'Operation failed. Rolled back.');
    },
    onSettled: () => {
      // Re-fetch to sync with server
      queryClient.invalidateQueries({
        queryKey: ['huzur-calendar-bookings', huzurId],
      });
    },
  });

  // Calculate days for current month
  const monthDays = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1);
    const days: { dateStr: string; dayNum: number; dayOfWeek: number }[] = [];

    while (date.getMonth() === currentMonth) {
      const dayNum = date.getDate();
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(dayNum).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

      days.push({
        dateStr,
        dayNum,
        dayOfWeek: date.getDay(),
      });

      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentYear, currentMonth]);

  const firstDayOffset = monthDays[0]?.dayOfWeek || 0;

  const weekdays = isBn
    ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthName = isBn
    ? new Date(currentYear, currentMonth, 1).toLocaleDateString('bn-BD', {
        month: 'long',
        year: 'numeric',
      })
    : new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

  // Pending Requests List
  const pendingRequests = useMemo(() => {
    return bookings.filter((b) => b.status === 'pending');
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Top Header with Action */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-700/60 text-emerald-200 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
              {isBn ? 'শিডিউল ও বুকিং সমন্বয়' : 'Schedule & Bookings Coordination'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif">
              {isBn ? 'মাহফিল ক্যালেন্ডার ড্যাশবোর্ড' : 'Mahfil Calendar Dashboard'}
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-1">
              {isBn
                ? 'তারিখ সংঘাতমুক্ত মাহফিল বুকিং অনুমোদন এবং জেলাভিত্তিক প্রাপ্যতা উন্মুক্ত করুন'
                : 'Review pending booking invitations with optimistic approval and post open availability'}
            </p>
          </div>

          <button
            onClick={() => setIsAvailabilityModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-emerald-900 rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-50 transition-colors shadow-md shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>{isBn ? 'তারিখ উন্মুক্ত করুন (Post Availability)' : 'Post Availability'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold">{isBn ? 'অপেক্ষমাণ আবেদন' : 'Pending Requests'}</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {pendingRequests.length}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold">{isBn ? 'নিশ্চিতকৃত মাহফিল' : 'Confirmed Events'}</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {bookings.filter((b) => b.status === 'confirmed').length}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <CalendarDays className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold">{isBn ? 'উন্মুক্ত প্রাপ্যতা' : 'Availability Posts'}</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {availabilityPosts.length}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold">{isBn ? 'দ্বৈত বুকিং প্রতিরোধ' : 'Conflict Guard'}</span>
          </div>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {isBn ? 'সক্রিয় (EXCLUDE)' : 'Active (GIST)'}
          </p>
        </div>
      </div>

      {/* Main Grid: Calendar View on Left, Pending Requests on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Calendar (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 shadow-xs space-y-4">
          {/* Month Header & Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {monthName}
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{isBn ? 'নিশ্চিতকৃত' : 'Confirmed'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>{isBn ? 'অপেক্ষমাণ' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>{isBn ? 'প্রাপ্যতা উন্মুক্ত' : 'Open Broadcast'}</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div>
            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {weekdays.map((w, idx) => (
                <div
                  key={idx}
                  className={`text-[11px] font-bold py-1 ${
                    idx === 5 ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: firstDayOffset }).map((_, idx) => (
                <div key={`emp-${idx}`} className="h-14 sm:h-16 rounded-xl opacity-0" />
              ))}

              {monthDays.map(({ dateStr, dayNum }) => {
                const dayBookings = bookings.filter((b) => b.event_date === dateStr);
                const hasConfirmed = dayBookings.some((b) => b.status === 'confirmed');
                const hasPending = dayBookings.some((b) => b.status === 'pending');
                const hasAvailability = availabilityPosts.some(
                  (p) => dateStr >= p.start_date && dateStr <= p.end_date
                );

                const isSelected = selectedDateFilter === dateStr;

                return (
                  <button
                    key={dateStr}
                    onClick={() =>
                      setSelectedDateFilter(selectedDateFilter === dateStr ? null : dateStr)
                    }
                    className={`h-14 sm:h-16 p-1 rounded-xl border flex flex-col justify-between items-start transition-all text-left ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : hasConfirmed
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30'
                        : hasPending
                        ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30'
                        : hasAvailability
                        ? 'border-blue-200 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/30'
                        : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      {dayNum}
                    </span>

                    {/* Indicators */}
                    <div className="flex flex-col gap-0.5 w-full">
                      {hasConfirmed && (
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-600 text-white truncate w-full text-center">
                          {isBn ? 'নিশ্চিত' : 'Confirmed'}
                        </span>
                      )}
                      {hasPending && (
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500 text-white truncate w-full text-center">
                          {isBn ? 'অনুরোধ' : 'Pending'}
                        </span>
                      )}
                      {hasAvailability && !hasConfirmed && !hasPending && (
                        <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-blue-500/20 text-blue-800 dark:text-blue-300 truncate w-full text-center">
                          {isBn ? 'উন্মুক্ত' : 'Open'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Pending Requests & Actions (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  {isBn ? 'অপেক্ষমাণ বুকিং আবেদন' : 'Pending Requests'}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {pendingRequests.length}
              </span>
            </div>

            {isBookingsLoading ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                <p className="text-xs text-zinc-500">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {isBn ? 'কোনো অপেক্ষমাণ অনুরোধ নেই' : 'No pending requests'}
                </p>
                <p className="text-xs text-zinc-500">
                  {isBn
                    ? 'আপনার সকল বুকিং আবেদন নিষ্পত্তি করা হয়েছে।'
                    : 'All booking invitations have been addressed.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-xs">
                          {req.event_date}
                        </span>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">
                          {req.mahfil_name || (req as any).event_details || (isBn ? 'ইসলামী মহা সম্মেলন' : 'Mahfil')}
                        </h4>
                      </div>

                      {req.hadya_offered && (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-200">
                          ৳ {req.hadya_offered}
                        </span>
                      )}
                    </div>

                    {/* Venue & Location */}
                    <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{req.venue_address}</span>
                      </div>

                      {req.contact_person_name && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{req.contact_person_name}</span>
                        </div>
                      )}

                      {req.contact_phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <a
                            href={`tel:${req.contact_phone}`}
                            className="text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            {req.contact_phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Optimistic Action Buttons: Approve & Reject */}
                    <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                      <button
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            bookingId: req.id,
                            status: 'confirmed',
                          })
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs transition-colors shadow-2xs min-h-[40px]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isBn ? 'অনুমোদন করুন' : 'Approve'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            bookingId: req.id,
                            status: 'rejected',
                          })
                        }
                        className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold text-xs transition-colors border border-rose-200 dark:border-rose-900 min-h-[40px]"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{isBn ? 'প্রত্যাখ্যান' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Availability Post Creation Form Modal */}
      <AvailabilityPostForm
        huzurId={huzurId}
        divisions={divisions}
        districts={districts}
        upazilas={upazilas}
        locale={locale}
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        onPostCreated={() => {
          queryClient.invalidateQueries({
            queryKey: ['huzur-availability-posts', huzurId],
          });
        }}
      />
    </div>
  );
}
