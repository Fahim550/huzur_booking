'use client';

import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Locale } from '@/lib/i18n/config';

interface BookedDateItem {
  event_date: string;
  status: string;
}

interface HuzurScheduleCalendarProps {
  bookedDates: BookedDateItem[];
  huzurName: string;
  locale: Locale;
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string;
}

export default function HuzurScheduleCalendar({
  bookedDates,
  huzurName,
  locale,
  onSelectDate,
  selectedDate,
}: HuzurScheduleCalendarProps) {
  const isBn = locale === 'bn';

  // Map of booked dates for O(1) lookup
  const bookedMap = useMemo(() => {
    const map = new Map<string, string>();
    bookedDates.forEach((b) => {
      map.set(b.event_date, b.status);
    });
    return map;
  }, [bookedDates]);

  // Generate 3 consecutive months: default November, December, January for peak Mahfil season
  // Anchor to November 2026 for consistent demonstration and seed dates
  const months = useMemo(() => {
    return [
      { year: 2026, month: 10, nameBn: 'নভেম্বর ২০২৬', nameEn: 'November 2026' }, // 0-indexed: 10 = Nov
      { year: 2026, month: 11, nameBn: 'ডিসেম্বর ২০২৬', nameEn: 'December 2026' }, // 11 = Dec
      { year: 2027, month: 0, nameBn: 'জানুয়ারি ২০২৭', nameEn: 'January 2027' },   // 0 = Jan
    ];
  }, []);

  const [activeMonthIndex, setActiveMonthIndex] = useState(0);
  const activeMonth = months[activeMonthIndex];

  // Calculate days in the active month
  const monthDays = useMemo(() => {
    const { year, month } = activeMonth;
    const date = new Date(year, month, 1);
    const days: { dateStr: string; dayNum: number; dayOfWeek: number }[] = [];

    while (date.getMonth() === month) {
      const dayNum = date.getDate();
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      days.push({
        dateStr,
        dayNum,
        dayOfWeek: date.getDay(),
      });

      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [activeMonth]);

  // Weekday headers
  const weekdays = isBn
    ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Pad first day offset
  const firstDayOffset = monthDays[0]?.dayOfWeek || 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 shadow-xs space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{isBn ? 'মাহফিল প্রাপ্যতা ক্যালেন্ডার (৩ মাস)' : '3-Month Availability Calendar'}</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {isBn
              ? 'উন্মুক্ত তারিখে ক্লিক করে সরাসরি বুকিং আবেদন জমা দিন'
              : 'Click on any highlighted open date to request a booking directly'}
          </p>
        </div>

        {/* Month Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
          {months.map((m, idx) => (
            <button
              key={idx}
              onClick={() => setActiveMonthIndex(idx)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] ${
                activeMonthIndex === idx
                  ? 'bg-white dark:bg-zinc-900 text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {isBn ? m.nameBn.split(' ')[0] : m.nameEn.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Month Title & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
          {isBn ? activeMonth.nameBn : activeMonth.nameEn}
        </span>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-md bg-emerald-50 border border-emerald-300 dark:bg-emerald-950 dark:border-emerald-700" />
            <span>{isBn ? 'উন্মুক্ত (Available)' : 'Open'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-md bg-zinc-200 border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700" />
            <span>{isBn ? 'বুকড / অপেক্ষমাণ' : 'Booked'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-md bg-emerald-700 text-white" />
            <span>{isBn ? 'নির্বাচিত' : 'Selected'}</span>
          </div>
        </div>
      </div>

      {/* Days Grid */}
      <div>
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-1">
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

        {/* Days of Month */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {/* Offset for first day */}
          {Array.from({ length: firstDayOffset }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-12 sm:h-14 rounded-xl opacity-0" />
          ))}

          {/* Actual days */}
          {monthDays.map(({ dateStr, dayNum }) => {
            const bookingStatus = bookedMap.get(dateStr);
            const isBooked = Boolean(bookingStatus);
            const isSelected = selectedDate === dateStr;

            let buttonClasses = '';
            let statusLabel = isBn ? 'উন্মুক্ত' : 'Open';

            if (isSelected) {
              buttonClasses =
                'bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-500/50';
            } else if (isBooked) {
              buttonClasses =
                'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-500 dark:border-zinc-800 cursor-not-allowed';
              statusLabel =
                bookingStatus === 'confirmed'
                  ? isBn
                    ? 'বুকড'
                    : 'Confirmed'
                  : isBn
                  ? 'অপেক্ষমাণ'
                  : 'Pending';
            } else {
              buttonClasses =
                'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-200 cursor-pointer';
            }

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isBooked}
                onClick={() => !isBooked && onSelectDate && onSelectDate(dateStr)}
                className={`h-12 sm:h-14 p-1 sm:p-1.5 rounded-xl border flex flex-col justify-between items-center transition-all ${buttonClasses}`}
              >
                <div className="flex items-center justify-between w-full px-0.5">
                  <span className="font-bold text-xs sm:text-sm">{dayNum}</span>
                  {isBooked ? (
                    <XCircle className="w-3 h-3 text-rose-500/70" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none truncate w-full text-center">
                  {statusLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
