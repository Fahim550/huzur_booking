'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { CalendarDays, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { SEED_HUZURS, SEED_BOOKINGS, SEED_AVAILABILITY_BLOCKS } from '@/lib/data/mockData';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

export default function AvailabilityPage() {
  const params = useParams();
  const rawLocale = params?.locale as string;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const [selectedHuzurId, setSelectedHuzurId] = useState<string>(SEED_HUZURS[0].id);

  const selectedHuzur = SEED_HUZURS.find((h) => h.id === selectedHuzurId) || SEED_HUZURS[0];

  // Selected Huzur's bookings & blocks
  const huzurBookings = SEED_BOOKINGS.filter((b) => b.huzur_id === selectedHuzurId);
  const huzurBlocks = SEED_AVAILABILITY_BLOCKS.filter((b) => b.huzur_id === selectedHuzurId);

  // November 2026 dates (Mahfil peak season preview)
  const daysInMonth = Array.from({ length: 30 }, (_, i) => {
    const day = (i + 1).toString().padStart(2, '0');
    return `2026-11-${day}`;
  });

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>{dict.availability.title}</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {dict.availability.subtitle}
        </p>
      </div>

      {/* Speaker Selector — 44px min touch target */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
        <label htmlFor="speaker-select" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {dict.availability.selectSpeaker}
        </label>
        <select
          id="speaker-select"
          value={selectedHuzurId}
          onChange={(e) => setSelectedHuzurId(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
        >
          {SEED_HUZURS.map((h) => (
            <option key={h.id} value={h.id}>
              {h.huzur_profile.title} {h.full_name} ({dict.reference.districts[h.district] || h.district})
            </option>
          ))}
        </select>
      </div>

      {/* Selected Speaker Details Card */}
      <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
            {selectedHuzur.huzur_profile.title} {selectedHuzur.full_name}
          </h2>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
            {selectedHuzur.huzur_profile.designation} • {selectedHuzur.huzur_profile.base_hadya_range}
          </p>
        </div>
        <div className="shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
          {dict.availability.monthName}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>{dict.availability.available}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>{dict.availability.confirmed}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>{dict.availability.pending}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
          <span>{dict.availability.blocked}</span>
        </div>
      </div>

      {/* Calendar Days Grid — Mobile 375px optimized */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
          {dict.availability.scheduleMonth}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {daysInMonth.map((dateStr, idx) => {
            const dayNum = idx + 1;
            const booking = huzurBookings.find((b) => b.event_date === dateStr);
            const block = huzurBlocks.find((blk) => blk.blocked_date === dateStr);

            let status = 'available';
            let label = dict.availability.available.split(' ')[0];
            let colorClasses =
              'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300';

            if (block) {
              status = 'blocked';
              label = dict.availability.blocked;
              colorClasses =
                'bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400';
            } else if (booking) {
              if (booking.status === 'confirmed') {
                status = 'confirmed';
                label = dict.availability.confirmed;
                colorClasses =
                  'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300';
              } else if (booking.status === 'pending') {
                status = 'pending';
                label = dict.availability.pending;
                colorClasses =
                  'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300';
              }
            }

            const dayDisplay = locale === 'bn' ? `${dayNum} নভেম্বর` : `Nov ${dayNum}`;
            const districtStr = booking?.district ? (typeof booking.district === 'string' ? booking.district : booking.district.name) : '';
            const districtDisplay = districtStr ? (dict.reference.districts as Record<string, string>)[districtStr] || districtStr : '';

            return (
              <div
                key={dateStr}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-colors min-h-[56px] ${colorClasses}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{dayDisplay}</span>
                  {status === 'available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {status === 'confirmed' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                  {status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                  {status === 'blocked' && <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />}
                </div>
                <div className="text-[11px] font-medium truncate mt-1">
                  {booking ? `${districtDisplay} (${label})` : block ? block.reason || label : label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
