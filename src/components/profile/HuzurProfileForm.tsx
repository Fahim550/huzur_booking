'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  User,
  Camera,
  Building,
  MapPin,
  Tag,
  BookOpen,
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { compressImage, formatBytes } from '@/lib/utils/imageCompression';
import { upsertHuzurProfile, uploadSpeakerPhoto, HuzurFormData } from '@/lib/queries/profiles';
import { normalizeBangladeshiPhone } from '@/lib/auth';

interface DistrictOption {
  id: number;
  name: string;
  bn_name: string;
}

const DEFAULT_DISTRICTS: DistrictOption[] = [
  { id: 1, name: 'Dhaka', bn_name: 'ঢাকা' },
  { id: 2, name: 'Chattogram', bn_name: 'চট্টগ্রাম' },
  { id: 3, name: 'Sylhet', bn_name: 'সিলেট' },
  { id: 4, name: 'Rajshahi', bn_name: 'রাজশাহী' },
  { id: 5, name: 'Khulna', bn_name: 'খুলনা' },
  { id: 6, name: 'Barishal', bn_name: 'বরিশাল' },
  { id: 7, name: 'Rangpur', bn_name: 'রংপুর' },
  { id: 8, name: 'Mymensingh', bn_name: 'ময়মনসিংহ' },
  { id: 9, name: 'Cumilla', bn_name: 'কুমিল্লা' },
  { id: 10, name: 'Brahmanbaria', bn_name: 'ব্রাহ্মণবাড়িয়া' },
  { id: 11, name: 'Noakhali', bn_name: 'নোয়াখালী' },
  { id: 12, name: 'Bogura', bn_name: 'বগুড়া' },
  { id: 13, name: 'Gazipur', bn_name: 'গাজীপুর' },
  { id: 14, name: 'Narayanganj', bn_name: 'নারায়ণগঞ্জ' },
  { id: 15, name: 'Tangail', bn_name: 'টাঙ্গাইল' },
];

const AVAILABLE_SPECIALTIES = [
  { id: 'seerat', name_bn: 'সিরাতুন্নবী (সা.)', name_en: 'Seerat-un-Nabi (PBUH)' },
  { id: 'tafseer', name_bn: 'তাফসীরুল কুরআন', name_en: 'Quranic Tafseer' },
  { id: 'youth', name_bn: 'যুব সমাজ ও চরিত্র গঠন', name_en: 'Youth & Character Building' },
  { id: 'modern', name_bn: 'সমকালীন ফিতনা ও সমাধান', name_en: 'Modern Challenges & Solutions' },
  { id: 'family', name_bn: 'পরিবার ও দাম্পত্য জীবন', name_en: 'Family & Marriage' },
  { id: 'aqeedah', name_bn: 'তাওহীদ ও ইসলামী আকীদা', name_en: 'Tawheed & Islamic Aqeedah' },
  { id: 'dawah', name_bn: 'দাওয়াত ও তাবলীগ', name_en: 'Dawah & Outreach' },
  { id: 'reform', name_bn: 'সমাজ সংস্কার ও আত্মশুদ্ধি', name_en: 'Social Reform & Tazkiyah' },
];

const TITLES = [
  'মাওলানা',
  'শায়খ',
  'মুফতি',
  'আল্লামা',
  'হাফেজ',
  'ড.',
];

interface HuzurProfileFormProps {
  userId: string;
  initialData?: Partial<HuzurFormData>;
  locale?: string;
  onSuccess?: () => void;
}

export default function HuzurProfileForm({
  userId,
  initialData,
  locale = 'bn',
  onSuccess,
}: HuzurProfileFormProps) {
  const t = useTranslations('profile');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const [title, setTitle] = useState(initialData?.title || 'মাওলানা');
  const [name, setName] = useState(initialData?.name || '');
  const [photoUrl, setPhotoUrl] = useState(initialData?.photo_url || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(initialData?.photo_url || '');
  const [compressionStats, setCompressionStats] = useState<{ orig: number; comp: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [institution, setInstitution] = useState(initialData?.institution || '');
  const [homeDistrictId, setHomeDistrictId] = useState<number | null>(initialData?.home_district_id || 1);
  const [specialties, setSpecialties] = useState<string[]>(initialData?.specialties || ['সিরাতুন্নবী (সা.)']);
  const [bio, setBio] = useState(initialData?.bio || '');
  const [phone, setPhone] = useState(initialData?.phone || '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Clean preview blob URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Handle Photo selection and client-side canvas compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setErrors((prev) => ({ ...prev, photo: '' }));

    try {
      // Client-side canvas resize to max 800x800 & 80% JPEG compression
      const result = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
      });

      setPhotoFile(result.file);
      setPhotoPreview(result.previewUrl);
      setCompressionStats({
        orig: result.originalSize,
        comp: result.compressedSize,
      });
    } catch (err) {
      console.error('Image compression error:', err);
      setErrors((prev) => ({
        ...prev,
        photo: locale === 'bn' ? 'ছবি প্রক্রিয়াকরণে ত্রুটি হয়েছে।' : 'Failed to process image.',
      }));
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoUrl('');
    setCompressionStats(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSpecialty = (item: string) => {
    setSpecialties((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  // Step Validation
  const validateStep = (stepNumber: number): boolean => {
    const stepErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!name.trim()) {
        stepErrors.name =
          locale === 'bn' ? 'বক্তার পূর্ণ নাম আবশ্যক।' : 'Full name is required.';
      }
    } else if (stepNumber === 2) {
      // Photo is optional, but if compressing wait
      if (isCompressing) {
        stepErrors.photo =
          locale === 'bn' ? 'ছবি কম্প্রেস হওয়া পর্যন্ত অপেক্ষা করুন।' : 'Please wait for image compression.';
      }
    } else if (stepNumber === 3) {
      if (!homeDistrictId) {
        stepErrors.district =
          locale === 'bn' ? 'নিজ জেলা নির্বাচন করুন।' : 'Please select your home district.';
      }
    } else if (stepNumber === 4) {
      if (specialties.length === 0) {
        stepErrors.specialties =
          locale === 'bn' ? 'কমপক্ষে একটি আলোচনার বিষয় নির্বাচন করুন।' : 'Please select at least one specialty.';
      }
    } else if (stepNumber === 5) {
      if (phone.trim()) {
        const { isValid } = normalizeBangladeshiPhone(phone);
        if (!isValid) {
          stepErrors.phone =
            locale === 'bn'
              ? 'সঠিক ১১ সংখ্যার বাংলাদেশী ফোন নম্বর লিখুন (যেমন: ০১৭১১-০০০০০১)।'
              : 'Please enter a valid 11-digit Bangladeshi phone number.';
        }
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Submit
  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    setSaveSuccess(false);

    try {
      let finalPhotoUrl = photoUrl;

      // If new compressed file exists, upload to Supabase Storage
      if (photoFile) {
        finalPhotoUrl = await uploadSpeakerPhoto(photoFile, userId);
      }

      await upsertHuzurProfile(userId, {
        name: `${title} ${name}`.trim(),
        title,
        photo_url: finalPhotoUrl,
        institution,
        bio,
        specialties,
        phone,
        home_district_id: homeDistrictId,
      });

      setSaveSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Save profile error:', err);
      setErrors({
        submit:
          locale === 'bn'
            ? 'প্রোফাইল সংরক্ষণে ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।'
            : 'Failed to save profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    t('step1Title'),
    t('step2Title'),
    t('step3Title'),
    t('step4Title'),
    t('step5Title'),
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-5 sm:p-8 max-w-xl mx-auto">
      {/* Header & Step Counter */}
      <div className="border-b border-zinc-100 dark:border-zinc-800 pb-5 mb-6">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
            {t('step')} {currentStep} {t('stepOf')} {totalSteps}
          </span>
          <span className="text-xs font-medium text-zinc-500">
            {stepTitles[currentStep - 1]}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{t('saveSuccess')}</span>
        </div>
      )}

      {/* Global Submit Error */}
      {errors.submit && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-800 dark:text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      {/* SECTION 1: TITLE & FULL NAME */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              <span>{t('step1Title')}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {locale === 'bn'
                ? 'বক্তার সম্মানসূচক উপাধি ও পরিচিত নাম নির্ধারণ করুন'
                : 'Enter your honorific title and official name'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t('titleLabel')}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TITLES.map((tit) => (
                <button
                  key={tit}
                  type="button"
                  onClick={() => setTitle(tit)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all min-h-[44px] ${
                    title === tit
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs ring-2 ring-emerald-600/20'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tit}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="huzur-name" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t('fullNameLabel')} <span className="text-rose-500">*</span>
            </label>
            <input
              id="huzur-name"
              type="text"
              required
              placeholder={t('fullNamePlaceholder')}
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
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: PHOTO UPLOAD WITH CANVAS COMPRESSION */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>{t('step2Title')}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t('photoUploadHint')}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/50">
            {photoPreview ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-emerald-600 shadow-md">
                  <Image
                    src={photoPreview}
                    alt="Speaker Profile"
                    fill
                    className="object-cover"
                    unoptimized={photoPreview.startsWith('blob:')}
                  />
                </div>

                {compressionStats && (
                  <div className="text-center bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl">
                    <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      {formatBytes(compressionStats.orig)} → {formatBytes(compressionStats.comp)} (
                      {Math.round(
                        ((compressionStats.orig - compressionStats.comp) / compressionStats.orig) * 100
                      )}
                      % {locale === 'bn' ? 'কম্প্রেসড' : 'compressed'})
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 transition-colors shadow-xs"
                  >
                    {t('changePhoto')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    {t('removePhoto')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 inline-flex items-center gap-2 min-h-[48px]"
                  >
                    {isCompressing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('compressing')}</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>{t('photoUploadLabel')}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {locale === 'bn'
                    ? 'JPG, PNG বা WEBP (স্বয়ংক্রিয় সর্বোচ্চ ৮০০×৮০০ পিক্সেলে অপ্টিমাইজড)'
                    : 'JPG, PNG or WEBP (automatically optimized to max 800x800px)'}
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          {errors.photo && (
            <p className="text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.photo}</span>
            </p>
          )}
        </div>
      )}

      {/* SECTION 3: INSTITUTION & HOME DISTRICT */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              <span>{t('step3Title')}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {locale === 'bn'
                ? 'আপনার মাদরাসা, জামিয়া অথবা খতিব হিসেবে দায়িত্ব পালনকৃত প্রতিষ্ঠান'
                : 'Your madrasa, university or affiliated organization'}
            </p>
          </div>

          <div>
            <label htmlFor="huzur-institution" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t('institutionLabel')}
            </label>
            <input
              id="huzur-institution"
              type="text"
              placeholder={t('institutionPlaceholder')}
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-4 py-3.5 text-base font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="huzur-district" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('homeDistrictLabel')}</span>
                <span className="text-rose-500">*</span>
              </div>
            </label>
            <select
              id="huzur-district"
              value={homeDistrictId || ''}
              onChange={(e) => {
                setHomeDistrictId(Number(e.target.value) || null);
                if (errors.district) setErrors((prev) => ({ ...prev, district: '' }));
              }}
              className="w-full px-4 py-3.5 text-base font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all"
            >
              <option value="">{t('selectDistrict')}</option>
              {DEFAULT_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {locale === 'bn' ? d.bn_name : d.name}
                </option>
              ))}
            </select>
            {errors.district && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.district}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: DISCUSSION SPECIALTIES (MULTI-SELECT) */}
      {currentStep === 4 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-600" />
              <span>{t('step4Title')}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t('specialtiesLabel')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AVAILABLE_SPECIALTIES.map((spec) => {
              const label = locale === 'bn' ? spec.name_bn : spec.name_en;
              const isSelected = specialties.includes(spec.name_bn) || specialties.includes(spec.name_en);

              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => toggleSpecialty(spec.name_bn)}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all min-h-[52px] ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold shadow-xs ring-2 ring-emerald-600/10'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{label}</span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'border border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {errors.specialties && (
            <p className="text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.specialties}</span>
            </p>
          )}
        </div>
      )}

      {/* SECTION 5: BIO & CONTACT PHONE */}
      {currentStep === 5 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span>{t('step5Title')}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {locale === 'bn'
                ? 'মাহফিল আয়োজকদের জন্য আপনার সংক্ষিপ্ত পরিচয় ও যোগাযোগের নম্বর'
                : 'Summary of your da\'wah background and contact phone'}
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="huzur-bio" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {t('bioLabel')}
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                {bio.length} / 500
              </span>
            </div>
            <textarea
              id="huzur-bio"
              rows={4}
              maxLength={500}
              placeholder={t('bioPlaceholder')}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all resize-none"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="huzur-phone" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              <div className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('phoneLabel')}</span>
              </div>
            </label>
            <input
              id="huzur-phone"
              type="tel"
              inputMode="tel"
              placeholder={t('phonePlaceholder')}
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
        </div>
      )}

      {/* Navigation Controls: Prev / Next / Submit */}
      <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            disabled={isSubmitting}
            className="py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 min-h-[48px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('prevStep')}</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={nextStep}
            className="py-3 px-5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center gap-2 min-h-[48px]"
          >
            <span>{t('nextStep')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="py-3 px-6 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center gap-2 min-h-[48px]"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t('saving')}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{t('saveProfile')}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
