'use client';

import { useState, useMemo } from 'react';
import { Calendar, MapPin, Send, AlertCircle, CheckCircle2, X, Sparkles, Loader2 } from 'lucide-react';
import type { Division, District, Upazila } from '@/types/database';
import { Locale } from '@/lib/i18n/config';

interface AvailabilityPostFormProps {
  huzurId: string;
  divisions: Division[];
  districts: District[];
  upazilas: Upazila[];
  locale: Locale;
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export default function AvailabilityPostForm({
  huzurId,
  divisions,
  districts,
  upazilas,
  locale,
  isOpen,
  onClose,
  onPostCreated,
}: AvailabilityPostFormProps) {
  const isBn = locale === 'bn';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [divisionId, setDivisionId] = useState<number | undefined>(divisions[0]?.id || 1);
  const [districtId, setDistrictId] = useState<number | undefined>(districts[0]?.id || 1);
  const [upazilaId, setUpazilaId] = useState<number | undefined>(undefined);
  const [note, setNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    setUpazilaId(undefined);
  };

  const handleDistrictChange = (newDistId: number | undefined) => {
    setDistrictId(newDistId);
    setUpazilaId(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError(isBn ? 'শুরু ও সমাপ্তির তারিখ নির্বাচন করুন।' : 'Please select start and end dates.');
      return;
    }

    if (startDate > endDate) {
      setError(
        isBn
          ? 'শুরুর তারিখ সমাপ্তির তারিখের সমান বা পূর্ববর্তী হতে হবে।'
          : 'Start date must be before or equal to end date.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/availability-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          huzur_id: huzurId,
          start_date: startDate,
          end_date: endDate,
          division_id: divisionId,
          district_id: districtId,
          upazila_id: upazilaId,
          note: note || (isBn ? 'এই অঞ্চলে মাহফিলের জন্য উন্মুক্ত সময়সূচি।' : 'Open availability for speaking invitations.'),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create availability post');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setIsSubmitting(false);
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-800 to-emerald-900 text-white">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-200">
              {isBn ? 'প্রাপ্যতা উন্মুক্ত করুন' : 'Broadcast Availability'}
            </span>
            <h2 className="text-base font-bold">
              {isBn ? 'নতুন প্রাপ্যতা পোস্ট তৈরি' : 'New Availability Post'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {success ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isBn ? 'প্রাপ্যতা সফলভাবে উন্মুক্ত করা হয়েছে!' : 'Availability Broadcast Created!'}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {isBn
                  ? 'এই এলাকার আয়োজকগণ অনুসন্ধানের সময় আপনার উন্মুক্ত সময়সূচি দেখতে পাবেন।'
                  : 'Organizers searching this area will see your open schedule highlighted in search results.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
            >
              {isBn ? 'সমাপ্ত' : 'Done'}
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 font-medium">
                {error}
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'শুরুর তারিখ *' : 'Start Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBn ? 'সমাপ্তির তারিখ *' : 'End Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
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
                  {isBn ? 'উপজেলা (ঐচ্ছিক)' : 'Upazila'}
                </label>
                <select
                  value={upazilaId ?? ''}
                  onChange={(e) => setUpazilaId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  <option value="">{isBn ? 'সমগ্র জেলা' : 'Entire District'}</option>
                  {availableUpazilas.map((upz) => (
                    <option key={upz.id} value={upz.id}>
                      {isBn ? upz.bn_name || upz.name_bn || upz.name : upz.name_en || upz.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {isBn ? 'সফর বা প্রাপ্যতা সংক্রান্ত বার্তা *' : 'Travel Note / Details *'}
              </label>
              <textarea
                required
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  isBn
                    ? 'যেমন: বৃহত্তর কুমিল্লা ও নোয়াখালী অঞ্চলে মাহফিলের জন্য উন্মুক্ত সময়সূচি।'
                    : 'e.g. Open for speaking invitations during North Bengal travel tour.'
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-900/20 disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isBn ? 'পোস্ট তৈরি হচ্ছে...' : 'Broadcasting...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isBn ? 'প্রাপ্যতা উন্মুক্ত করুন' : 'Broadcast Availability'}</span>
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
