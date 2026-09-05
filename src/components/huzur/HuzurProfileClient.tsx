'use client';

import { useState } from 'react';
import { Calendar, Clock, Sparkles, FileCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import HuzurScheduleCalendar from './HuzurScheduleCalendar';

const HuzurBookingModal = dynamic(() => import('./HuzurBookingModal'), {
  ssr: false,
});
import type { Division, District, Upazila } from '@/types/database';
import { Locale } from '@/lib/i18n/config';

interface HuzurProfileClientProps {
  huzurId: string;
  huzurName: string;
  bookedDates: { event_date: string; status: string }[];
  divisions: Division[];
  districts: District[];
  upazilas: Upazila[];
  locale: Locale;
}

export default function HuzurProfileClient({
  huzurId,
  huzurName,
  bookedDates,
  divisions,
  districts,
  upazilas,
  locale,
}: HuzurProfileClientProps) {
  const isBn = locale === 'bn';
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 3-Month Availability Calendar */}
      <HuzurScheduleCalendar
        bookedDates={bookedDates}
        huzurName={huzurName}
        locale={locale}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
      />

      {/* Primary Action Button Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
            {isBn ? 'মাহফিলের জন্য বক্তা নির্ধারণ করতে চান?' : 'Ready to invite this speaker for your Mahfil?'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {isBn
              ? 'দ্বৈত বুকিং প্রতিরোধ ও সরাসরি সমন্বয় সুবিধাসহ আবেদন পাঠান'
              : 'Submit a conflict-checked booking request with date safety guarantees'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-900/20 min-h-[48px]"
          >
            <Calendar className="w-4 h-4" />
            <span>{isBn ? 'বুকিং অনুরোধ পাঠান' : 'Request Booking'}</span>
          </button>

          <a
            href="tel:+8801700000000"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm transition-colors min-h-[48px]"
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? 'সমন্বয়ক হটলাইন' : 'Coordinator'}</span>
          </a>
        </div>
      </div>

      {/* Booking Modal */}
      <HuzurBookingModal
        huzurId={huzurId}
        huzurName={huzurName}
        preselectedDate={selectedDate}
        divisions={divisions}
        districts={districts}
        upazilas={upazilas}
        locale={locale}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Calendar will revalidate via ISR & mutation
        }}
      />
    </div>
  );
}
