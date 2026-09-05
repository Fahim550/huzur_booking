import { Metadata } from 'next';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { searchHuzurs } from '@/lib/queries/searchHuzurs';
import { fetchDivisions, fetchDistricts, fetchUpazilas } from '@/lib/queries/locations';
import { fetchSpecialties } from '@/lib/queries/specialties';
import { createPublicClient } from '@/lib/supabase/public';
import SearchClient from '@/components/search/SearchClient';

// Next.js ISR: 60-second revalidation for public search listings
export const revalidate = 60;

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    divisionId?: string;
    districtId?: string;
    upazilaId?: string;
    startDate?: string;
    endDate?: string;
    specialty?: string;
    q?: string;
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const isBn = rawLocale === 'bn';

  return {
    title: isBn
      ? 'বক্তা অনুসন্ধান ও মাহফিল শিডিউল | হুজুর বুকিং'
      : 'Find Islamic Speakers & Mahfil Schedule | Huzur Booking',
    description: isBn
      ? 'বাংলাদেশের প্রখ্যাত ইসলামী আলোচক ও আলেমদের জেলাভিত্তিক মাহফিল শিডিউল অনুসন্ধান ও বুকিং করুন।'
      : 'Search verified Islamic speakers, view Mahfil availability by district, and request direct bookings.',
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const sp = await searchParams;
  const divisionId = sp.divisionId ? Number(sp.divisionId) : undefined;
  const districtId = sp.districtId ? Number(sp.districtId) : undefined;
  const upazilaId = sp.upazilaId ? Number(sp.upazilaId) : undefined;
  const startDate = sp.startDate;
  const endDate = sp.endDate;
  const specialty = sp.specialty;
  const q = sp.q;
  const page = sp.page ? Number(sp.page) : 1;

  const supabase = createPublicClient();

  // Initial SSR data fetching directly via lib/queries
  const [searchResponse, divisions, districts, upazilas, specialties] = await Promise.all([
    searchHuzurs(
      {
        divisionId,
        districtId,
        upazilaId,
        startDate,
        endDate,
        specialty,
        q,
        page,
        limit: 12,
      },
      supabase
    ),
    fetchDivisions(supabase),
    fetchDistricts(supabase),
    fetchUpazilas(supabase),
    fetchSpecialties(supabase),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <SearchClient
        initialHuzurs={searchResponse.huzurs}
        initialTotal={searchResponse.total}
        initialFilters={{
          divisionId,
          districtId,
          upazilaId,
          startDate,
          endDate,
          specialty,
          q,
          page,
          limit: 12,
        }}
        divisions={divisions}
        districts={districts}
        upazilas={upazilas}
        specialties={specialties}
        locale={locale}
      />
    </div>
  );
}
