'use client';

import { useState } from 'react';
import { User, Phone, Building2, Check, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { upsertOrganizerProfile, OrganizerFormData } from '@/lib/queries/profiles';
import { normalizeBangladeshiPhone } from '@/lib/auth';

interface OrganizerProfileFormProps {
  userId: string;
  initialData?: Partial<OrganizerFormData>;
  locale?: string;
  onSuccess?: () => void;
}

export default function OrganizerProfileForm({
  userId,
  initialData,
  locale = 'bn',
  onSuccess,
}: OrganizerProfileFormProps) {
  const t = useTranslations('profile');

  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [institutionName, setInstitutionName] = useState(initialData?.institution_name || '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name =
        locale === 'bn' ? 'আয়োজকের নাম আবশ্যক।' : 'Organizer name is required.';
    }

    if (!phone.trim()) {
      newErrors.phone =
        locale === 'bn' ? 'মোবাইল নম্বর আবশ্যক।' : 'Phone number is required.';
    } else {
      const { isValid } = normalizeBangladeshiPhone(phone);
      if (!isValid) {
        newErrors.phone =
          locale === 'bn'
            ? 'সঠিক ১১ সংখ্যার বাংলাদেশী ফোন নম্বর লিখুন (যেমন: ০১৭১১-০০০০০১)।'
            : 'Please enter a valid 11-digit Bangladeshi phone number.';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    setSaveSuccess(false);

    try {
      await upsertOrganizerProfile(userId, {
        name: name.trim(),
        phone: phone.trim(),
        institution_name: institutionName.trim() || null,
      });

      setSaveSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Organizer profile update error:', err);
      setErrors({
        submit:
          locale === 'bn'
            ? 'তথ্য সংরক্ষণে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।'
            : 'Failed to update organizer profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-5 sm:p-8 max-w-xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <span>{t('organizerFormTitle')}</span>
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          {t('organizerFormSubtitle')}
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{t('saveSuccess')}</span>
        </div>
      )}

      {errors.submit && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-800 dark:text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      {/* Organizer Name */}
      <div>
        <label htmlFor="org-name" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('organizerNameLabel')}</span>
            <span className="text-rose-500">*</span>
          </div>
        </label>
        <input
          id="org-name"
          type="text"
          required
          placeholder={t('organizerNamePlaceholder')}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
          }}
          className={`w-full px-4 py-3.5 text-base font-medium rounded-xl border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none transition-all ${
            errors.name
              ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-500/10'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15'
          }`}
        />
        {errors.name && (
          <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errors.name}</span>
          </p>
        )}
      </div>

      {/* Organizer Phone */}
      <div>
        <label htmlFor="org-phone" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
          <div className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('organizerPhoneLabel')}</span>
            <span className="text-rose-500">*</span>
          </div>
        </label>
        <input
          id="org-phone"
          type="tel"
          inputMode="tel"
          required
          placeholder="০১৭১১-০০০০০১"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
          }}
          className={`w-full px-4 py-3.5 text-base font-medium rounded-xl border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none transition-all ${
            errors.phone
              ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-500/10'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15'
          }`}
        />
        {errors.phone && (
          <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errors.phone}</span>
          </p>
        )}
      </div>

      {/* Institution / Mosque Committee */}
      <div>
        <label htmlFor="org-inst" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
          <div className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('organizerInstLabel')}</span>
          </div>
        </label>
        <input
          id="org-inst"
          type="text"
          placeholder={t('organizerInstPlaceholder')}
          value={institutionName}
          onChange={(e) => setInstitutionName(e.target.value)}
          className="w-full px-4 py-3.5 text-base font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-6 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 min-h-[48px]"
      >
        {isSubmitting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{t('saving')}</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>{t('organizerSave')}</span>
          </>
        )}
      </button>
    </form>
  );
}
