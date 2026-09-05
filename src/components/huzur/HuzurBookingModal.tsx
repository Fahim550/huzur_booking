'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
  Building,
  Sparkles,
  Phone,
  User,
  Loader2,
} from 'lucide-react';
import type { Division, District, Upazila } from '@/types/database';
import { Locale } from '@/lib/i18n/config';

interface HuzurBookingModalProps {
  huzurId: string;
  huzurName: string;
  preselectedDate?: string;
  divisions: Division[];
  districts: District[];
  upazilas: Upazila[];
  locale: Locale;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function HuzurBookingModal({
  huzurId,
  huzurName,
  preselectedDate,
  divisions,
  districts,
  upazilas,
  locale,
  isOpen,
  onClose,
  onSuccess,
}: HuzurBookingModalProps) {
  const isBn = locale === 'bn';

  const [eventDate, setEventDate] = useState<string>(preselectedDate || '2026-11-16');
  const [sessionSlot, setSessionSlot] = useState<string>('after_esha');
  const [divisionId, setDivisionId] = useState<number | undefined>(divisions[0]?.id || 1);
  const [districtId, setDistrictId] = useState<number | undefined>(districts[0]?.id || 1);
  const [upazilaId, setUpazilaId] = useState<number | undefined>(upazilas[0]?.id || 1);
  const [venueAddress, setVenueAddress] = useState<string>('');
  const [mahfilName, setMahfilName] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [hadyaOffered, setHadyaOffered] = useState<string>('');
  const [eventDetails, setEventDetails] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [suggestedDates, setSuggestedDates] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Sync preselectedDate
  useMemo(() => {
    if (preselectedDate) {
      setEventDate(preselectedDate);
    }
  }, [preselectedDate]);

  // Cascading dropdowns
  const availableDistricts = useMemo(() => {
    if (!divisionId) return districts;
    return districts.filter((d) => d.division_id === Number(divisionId));
  }, [districts, divisionId]);

  const availableUpazilas = useMemo(() => {
    if (!districtId) return [];
    return upazilas.filter((u) => u.district_id === Number(districtId));
  }, [upazilas, districtId]);

  const handleDivisionChange = (newDivId: number | undefined) => {
    setDivisionId(newDivId);
    const matchingDistricts = districts.filter((d) => d.division_id === Number(newDivId));
    const firstDistrict = matchingDistricts[0]?.id;
    setDistrictId(firstDistrict);
    const matchingUpazilas = upazilas.filter((u) => u.district_id === Number(firstDistrict));
    setUpazilaId(matchingUpazilas[0]?.id);
  };

  const handleDistrictChange = (newDistId: number | undefined) => {
    setDistrictId(newDistId);
    const matchingUpazilas = upazilas.filter((u) => u.district_id === Number(newDistId));
    setUpazilaId(matchingUpazilas[0]?.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setConflictError(null);
    setGeneralError(null);
    setSuggestedDates([]);

    try {
      const payload = {
        huzur_id: huzurId,
        event_date: eventDate,
        venue_address: venueAddress,
        division_id: divisionId,
        district_id: districtId,
        upazila_id: upazilaId,
        session_slot: sessionSlot,
        mahfil_name: mahfilName,
        contact_person_name: contactName,
        contact_phone: contactPhone,
        hadya_offered: hadyaOffered ? Number(hadyaOffered) : undefined,
        event_details: eventDetails || mahfilName,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 || data.isConflict) {
        setConflictError(
          data.error ||
            (isBn
              ? 'এই তারিখে হুজুরের পূর্বনির্ধারিত মাহফিল রয়েছে। অনুগ্রহ করে প্রস্তাবিত বিকল্প তারিখ থেকে নির্বাচন করুন।'
              : 'This date is already booked. Please choose from suggested open dates below.')
        );
        if (data.suggestedDates && Array.isArray(data.suggestedDates)) {
          setSuggestedDates(data.suggestedDates);
        }
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setGeneralError(data.error || 'Failed to submit booking');
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsSuccess(true);
      setIsSubmitting(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setGeneralError(err?.message || 'Network error occurred');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-200">
              {isBn ? 'সরাসরি বুকিং আবেদন' : 'Direct Booking Request'}
            </span>
            <h2 className="text-base sm:text-lg font-bold truncate">
              {huzurName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {isSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {isBn ? 'বুকিং অনুরোধ সফলভাবে জমা হয়েছে!' : 'Booking Request Submitted!'}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                {isBn
                  ? `${eventDate} তারিখের মাহফিল আবেদনটি বক্তা ও সমন্বয়কের পর্যালোচনায় অপেক্ষমাণ রয়েছে।`
                  : `Your request for ${eventDate} has been sent for the speaker's review.`}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
              >
                {isBn ? 'ঠিক আছে' : 'Done'}
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Conflict Alert with 5 Nearest Suggested Dates */}
            {conflictError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 space-y-3">
                <div className="flex items-start gap-2 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{conflictError}</span>
                </div>

                {suggestedDates.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-rose-200/60 dark:border-rose-800/60">
                    <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                      {isBn ? '💡 নিকটবর্তী ৫টি উন্মুক্ত তারিখ:' : '💡 5 Nearest Open Dates:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedDates.map((dateStr) => (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => {
                            setEventDate(dateStr);
                            setConflictError(null);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 transition-colors shadow-2xs"
                        >
                          {dateStr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Error */}
            {generalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-200">
                {generalError}
              </div>
            )}

            {/* Date & Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'মাহফিলের তারিখ *' : 'Event Date *'}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => {
                      setEventDate(e.target.value);
                      setConflictError(null);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'অধিবেশনের সময় *' : 'Session Slot *'}
                </label>
                <select
                  value={sessionSlot}
                  onChange={(e) => setSessionSlot(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  <option value="after_esha">{isBn ? 'বাদ এশা (প্রধান বক্তা)' : 'After Esha (Chief Speaker)'}</option>
                  <option value="after_maghrib">{isBn ? 'বাদ মাগরিব' : 'After Maghrib'}</option>
                  <option value="after_asr">{isBn ? 'বাদ আসর' : 'After Asr'}</option>
                  <option value="all_night">{isBn ? 'শেষ রাত / সারা রাত' : 'All Night'}</option>
                  <option value="daytime_special">{isBn ? 'সকাল / বিশেষ অধিবেশন' : 'Daytime / Special'}</option>
                </select>
              </div>
            </div>

            {/* Cascading Location: Division -> District -> Upazila */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'বিভাগ' : 'Division'}
                </label>
                <select
                  value={divisionId ?? ''}
                  onChange={(e) => handleDivisionChange(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {isBn ? div.bn_name || div.name_bn || div.name : div.name_en || div.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'জেলা' : 'District'}
                </label>
                <select
                  value={districtId ?? ''}
                  onChange={(e) => handleDistrictChange(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  {availableDistricts.map((dst) => (
                    <option key={dst.id} value={dst.id}>
                      {isBn ? dst.bn_name || dst.name_bn || dst.name : dst.name_en || dst.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'উপজেলা' : 'Upazila'}
                </label>
                <select
                  value={upazilaId ?? ''}
                  onChange={(e) => setUpazilaId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  {availableUpazilas.map((upz) => (
                    <option key={upz.id} value={upz.id}>
                      {isBn ? upz.bn_name || upz.name_bn || upz.name : upz.name_en || upz.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Venue Address */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {isBn ? 'মাহফিলের স্থান ও বিস্তারিত ঠিকানা *' : 'Venue Address *'}
              </label>
              <textarea
                required
                rows={2}
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder={
                  isBn
                    ? 'যেমন: লাকসাম পাইলট হাই স্কুল মাঠ, লাকসাম বাজার'
                    : 'Venue address (e.g. Pilot High School Ground, Laksam)'
                }
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Mahfil Name & Hadya */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'মাহফিলের নাম' : 'Mahfil / Event Name'}
                </label>
                <input
                  type="text"
                  value={mahfilName}
                  onChange={(e) => setMahfilName(e.target.value)}
                  placeholder={isBn ? 'যেমন: বার্ষিক সীরাতুন্নবী সম্মেলন' : 'e.g. Annual Seerat Conference'}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'প্রস্তাবিত হাদিয়া (টাকা)' : 'Proposed Hadya (BDT)'}
                </label>
                <input
                  type="number"
                  value={hadyaOffered}
                  onChange={(e) => setHadyaOffered(e.target.value)}
                  placeholder="30000"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Contact Person Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'যোগাযোগকারীর নাম' : 'Contact Person'}
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={isBn ? 'যেমন: হাজী রফিকুল ইসলাম' : 'e.g. Haji Rafiqul Islam'}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'জরুরি মোবাইল নম্বর *' : 'Emergency Phone *'}
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="01712345678"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-900/20 disabled:opacity-50 min-h-[48px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isBn ? 'আবেদন যাচাই ও জমা হচ্ছে...' : 'Validating & Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isBn ? 'বুকিং আবেদন জমা দিন' : 'Submit Booking Request'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
