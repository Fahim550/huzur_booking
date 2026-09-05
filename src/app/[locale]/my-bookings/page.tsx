'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, MapPin, Phone, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { SEED_BOOKINGS } from '@/lib/data/mockData';
import { BOOKING_STATUS_LABELS_BN, BookingWithDetails } from '@/types/database';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

export default function MyBookingsPage() {
  const params = useParams();
  const rawLocale = params?.locale as string;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed'>('all');

  // TanStack Query for client-side caching & background refetch
  const { data: bookings = SEED_BOOKINGS, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ['my-bookings', activeTab, locale],
    queryFn: async () => {
      return SEED_BOOKINGS;
    },
  });

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    return b.status === activeTab;
  });

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>{dict.bookings.title}</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {dict.bookings.subtitle}
        </p>
      </div>

      {/* Filter Tabs — 44px touch friendly */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 pb-1">
        {[
          { key: 'all', label: dict.bookings.allTab },
          { key: 'pending', label: dict.bookings.pendingTab },
          { key: 'confirmed', label: dict.bookings.confirmedTab },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] ${
              activeTab === tab.key
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse space-y-3"
            >
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-sm w-1/3" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm w-2/3" />
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-sm w-full" />
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {dict.bookings.emptyText}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const statusConfig = BOOKING_STATUS_LABELS_BN[b.status];
            const statusLabel = dict.reference.statuses[b.status] || statusConfig.label;
            const slotLabel = dict.reference.slots[b.session_slot] || b.session_slot;
            const districtLabel = dict.reference.districts[b.district] || b.district;

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
              >
                {/* Header: Mahfil Name & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      {b.huzur?.full_name ? `${b.huzur.huzur_profile.title} ${b.huzur.full_name}` : dict.bookings.speakerSelected}
                    </span>
                    <h2 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                      {b.mahfil_name}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full border ${statusConfig.badgeClass}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>
                      {dict.bookings.dateLabel} <strong className="text-zinc-800 dark:text-zinc-200">{b.event_date}</strong> (
                      {slotLabel})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{b.venue_address}, {districtLabel}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{dict.bookings.contactLabel} {b.contact_person_name} ({b.contact_phone})</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>
                      {dict.bookings.hadyaLabel}{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {b.hadya_offered
                          ? locale === 'bn'
                            ? `${b.hadya_offered.toLocaleString('bn-BD')} ৳`
                            : `BDT ${b.hadya_offered.toLocaleString('en-US')}`
                          : dict.bookings.negotiable}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Notes (User-entered text preserved as-is) */}
                {b.notes && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{b.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
