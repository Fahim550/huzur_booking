import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  MapPin,
  ChevronLeft,
  ShieldCheck,
  Building,
  Sparkles,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { fetchHuzurById } from '@/lib/queries/huzurs';
import { fetchConfirmedBookingsForConflictCheck } from '@/lib/queries/bookings';
import { fetchDivisions, fetchDistricts, fetchUpazilas } from '@/lib/queries/locations';
import { createPublicClient } from '@/lib/supabase/public';
import { FALLBACK_SEARCH_HUZURS } from '@/lib/queries/searchHuzurs';
import { SEED_HUZURS } from '@/lib/data/mockData';
import HuzurProfileClient from '@/components/huzur/HuzurProfileClient';

// Next.js ISR: Revalidate cached profile pages every 300 seconds (5 minutes)
export const revalidate = 300;

interface HuzurProfilePageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export async function generateStaticParams() {
  const seedIds = [
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333',
    'a4444444-4444-4444-4444-444444444444',
    'a5555555-5555-5555-5555-555555555555',
    'a6666666-6666-6666-6666-666666666666',
  ];

  const params: { locale: string; id: string }[] = [];
  for (const locale of ['bn', 'en']) {
    for (const id of seedIds) {
      params.push({ locale, id });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: HuzurProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const fallback =
    FALLBACK_SEARCH_HUZURS.find((h) => h.id === id) ||
    SEED_HUZURS.find((h) => h.id === id);

  const speakerName = fallback ? ('name' in fallback ? fallback.name : (fallback as any).full_name) : 'Islamic Speaker';

  return {
    title: `${speakerName} — মাহফিল শিডিউল ও বুকিং | হুজুর বুকিং`,
    description: fallback?.bio || 'বক্তার মাহফিল শিডিউল দেখুন ও সরাসরি বুকিং অনুরোধ পাঠান।',
  };
}

export default async function HuzurProfilePage({ params }: HuzurProfilePageProps) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const isBn = locale === 'bn';

  const supabase = createPublicClient();

  // 1. Fetch Huzur details
  let huzur = await fetchHuzurById(supabase, id);

  // Fallback to in-memory seed records if Supabase returns null
  if (!huzur) {
    const fallback =
      FALLBACK_SEARCH_HUZURS.find((h) => h.id === id) ||
      SEED_HUZURS.find((h) => h.id === id);

    if (fallback) {
      const isSeedShape = 'full_name' in fallback;
      huzur = {
        id: fallback.id,
        user_id: null,
        name: isSeedShape ? (fallback as any).full_name : fallback.name,
        photo_url: isSeedShape ? (fallback as any).avatar_url : fallback.photo_url,
        institution: isSeedShape
          ? (fallback as any).huzur_profile?.madrasa_or_institution
          : fallback.institution,
        bio: isSeedShape ? (fallback as any).bio : fallback.bio,
        specialties: isSeedShape
          ? (fallback as any).huzur_profile?.topics || []
          : fallback.specialties || [],
        phone: fallback.phone,
        home_district_id: isSeedShape ? 1 : fallback.home_district_id,
        is_verified: true,
        created_at: ('created_at' in fallback && fallback.created_at) || new Date().toISOString(),
        updated_at: ('updated_at' in fallback && fallback.updated_at) || new Date().toISOString(),
        home_district: isSeedShape
          ? { id: 1, name: 'Dhaka', bn_name: 'ঢাকা', division_id: 1 }
          : (fallback as any).home_district,
      } as any;
    }
  }

  if (!huzur) {
    notFound();
  }

  // 2. Fetch booked dates for conflict display on 3-month calendar
  const bookedDates = await fetchConfirmedBookingsForConflictCheck(supabase, id);

  // 3. Fetch location data for booking form
  const [divisions, districts, upazilas] = await Promise.all([
    fetchDivisions(supabase),
    fetchDistricts(supabase),
    fetchUpazilas(supabase),
  ]);

  const districtDisplay =
    isBn
      ? huzur.home_district?.bn_name || huzur.home_district?.name || 'ঢাকা'
      : huzur.home_district?.name || 'Dhaka';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Back to Search Link */}
      <Link
        href={`/${locale}/search`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100 p-1 min-h-[44px]"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{isBn ? 'বক্তা অনুসন্ধানে ফিরে যান' : 'Back to Speakers'}</span>
      </Link>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950 shrink-0 border-3 border-emerald-500/30 shadow-md">
            <Image
              src={
                huzur.photo_url ||
                'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80'
              }
              alt={huzur.name}
              fill
              sizes="(max-width: 640px) 96px, 112px"
              priority
              className="object-cover"
            />
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {huzur.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{isBn ? 'যাচাইকৃত বক্তা' : 'Verified Speaker'}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>{districtDisplay}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {huzur.name}
            </h1>

            {huzur.institution && (
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium flex items-center gap-1.5">
                <Building className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>{huzur.institution}</span>
              </p>
            )}
          </div>
        </div>

        {/* Short Bio */}
        {huzur.bio && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {huzur.bio}
          </div>
        )}

        {/* Specialties */}
        {huzur.specialties && huzur.specialties.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {isBn ? 'আলোচনার বিষয় ও বিশেষত্ব' : 'Topics of Discussion'}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {huzur.specialties.map((topic, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3-Month Read-only Calendar Widget + Direct Booking Modal Component */}
      <HuzurProfileClient
        huzurId={huzur.id}
        huzurName={huzur.name}
        bookedDates={bookedDates}
        divisions={divisions}
        districts={districts}
        upazilas={upazilas}
        locale={locale}
      />

      {/* Booking Assurance Guidelines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{isBn ? 'মাহফিল বুকিং নির্দেশিকা' : 'Booking Guidelines'}</span>
          </h3>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>{isBn ? 'আবেদনের পর বক্তা বা সমন্বয়ক ফোনে যোগাযোগ করে নিশ্চিত করবেন।' : 'Speaker coordinator will follow up by phone to confirm.'}</li>
            <li>{isBn ? 'স্থানীয় প্রশাসনের অনুমতি ও সার্বিক শৃঙ্খলা আয়োজক নিশ্চিত করবেন।' : 'Local administration clearance is organized by the host committee.'}</li>
            <li>{isBn ? 'যাতায়াত ও নিরাপত্তা বিষয়ে কোনো বিশেষ শর্ত থাকলে তা অগ্রিম জানাতে হবে।' : 'Travel and security requirements should be specified.'}</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? 'দ্বৈত বুকিং প্রতিরোধ নিশ্চয়তা' : 'Double Booking Prevention'}</span>
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {isBn
              ? 'প্ল্যাটফর্মে ডাটাবেজ লেভেলে Postgres EXCLUDE constraint কার্যকর রয়েছে। একই তারিখে দুটি অনুমোদিত বা অপেক্ষমাণ মাহফিল গ্রহণ করা সম্পূর্ণ অসম্ভব।'
              : 'Postgres EXCLUDE constraint operates at the database engine level to guarantee no double bookings occur on the same date.'}
          </p>
        </div>
      </div>
    </div>
  );
}
