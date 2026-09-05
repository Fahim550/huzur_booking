import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Specialty } from '@/types/database';
import { isRealSupabaseConfigured } from '@/lib/auth';

export const FALLBACK_SPECIALTIES: Specialty[] = [
  {
    id: 1,
    slug: 'tafsir',
    name_en: 'Tafseer & Quranic Exegesis',
    name_bn: 'তাফসীরুল কুরআন',
    description_en: 'Quranic exegesis and linguistic commentary',
    description_bn: 'পবিত্র কুরআনের আয়াতভিত্তিক বিশ্লেষণ ও তাফসীর',
    display_order: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    slug: 'hadith',
    name_en: 'Hadith & Sunnah',
    name_bn: 'হাদীস ও সুন্নাহ',
    description_en: 'Prophetic traditions and authentic sunnah',
    description_bn: 'রাসূলুল্লাহ (সা.)-এর সুন্নাহ ও সহীহ হাদীসের দিকনির্দেশনা',
    display_order: 2,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    slug: 'seerat',
    name_en: 'Seerat-un-Nabi (PBUH)',
    name_bn: 'সীরাতুন্নবী (সা.)',
    description_en: 'Life and character of the Prophet Muhammad (PBUH)',
    description_bn: 'প্রিয় নবী হযরত মুহাম্মদ (সা.)-এর পবিত্র জীবনী ও আদর্শ',
    display_order: 3,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 4,
    slug: 'waz',
    name_en: 'Waz & Naseehat',
    name_bn: 'ওয়াজ ও নসীহত',
    description_en: 'Public Islamic lectures and spiritual admonition',
    description_bn: 'সাধারণের হেদায়েতমূলক দ্বীনি আলোচনা ও আধ্যাত্মিক নসীহত',
    display_order: 4,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 5,
    slug: 'fiqh',
    name_en: 'Fiqh & Islamic Law',
    name_bn: 'ফিকহ ও ফতোয়া',
    description_en: 'Islamic jurisprudence and contemporary ruling',
    description_bn: 'দৈনন্দিন মাসআলা-মাসায়েল ও সমসাময়িক ফিকহি সমাধান',
    display_order: 5,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 6,
    slug: 'aqeedah',
    name_en: 'Islamic Aqeedah',
    name_bn: 'ইসলামী আকীদা',
    description_en: 'Islamic creed and theological fundamentals',
    description_bn: 'বিশুদ্ধ ইসলামী বিশ্বাস ও আকীদাগত সুরক্ষা',
    display_order: 6,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 7,
    slug: 'youth_family',
    name_en: 'Youth & Family Guidance',
    name_bn: 'যুবসমাজ ও পারিবারিক জীবন',
    description_en: 'Islamic guidance for contemporary youth and parenting',
    description_bn: 'তরুণ সমাজের চরিত্র গঠন ও ইসলামী পরিবার গঠন',
    display_order: 7,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 8,
    slug: 'qiraat',
    name_en: 'Qira\'at & Tajweed',
    name_bn: 'শবে ক্বিরাআত ও তাজবীদ',
    description_en: 'Quran recitation and phonetics',
    description_bn: 'বিশুদ্ধ তিলাওয়াত ও তাজবীদের বিশেষ মাহফিল',
    display_order: 8,
    created_at: '2026-01-01T00:00:00Z',
  },
];

export async function fetchSpecialties(client: SupabaseClient<Database>): Promise<Specialty[]> {
  if (isRealSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('specialties')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('fetchSpecialties remote warning:', err);
    }
  }

  return FALLBACK_SPECIALTIES;
}
