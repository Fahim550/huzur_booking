import { Metadata } from 'next';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { fetchDivisions, fetchDistricts, fetchUpazilas } from '@/lib/queries/locations';
import { createClient } from '@/lib/supabase/server';
import HuzurDashboardCalendar from '@/components/dashboard/HuzurDashboardCalendar';

export const metadata: Metadata = {
  title: 'মাহফিল সময়সূচি ও ক্যালেন্ডার | হুজুর ড্যাশবোর্ড',
  description: 'বক্তার মাহফিল শিডিউল ও সরাসরি বুকিং আবেদন সমন্বয় ড্যাশবোর্ড',
};

interface CalendarPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CalendarDashboardPage({ params }: CalendarPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const supabase = await createClient();

  // Determine current active huzur id
  // Default to primary seed huzur (শায়খ আহমাদুল্লাহ) for local demo/development
  let activeHuzurId = 'a1111111-1111-1111-1111-111111111111';

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: huzurData } = await supabase
        .from('huzurs')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (huzurData) {
        activeHuzurId = (huzurData as any).id;
      }
    }
  } catch (err) {
    console.warn('Dashboard calendar user check:', err);
  }

  const [divisions, districts, upazilas] = await Promise.all([
    fetchDivisions(supabase),
    fetchDistricts(supabase),
    fetchUpazilas(supabase),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <HuzurDashboardCalendar
        huzurId={activeHuzurId}
        divisions={divisions}
        districts={districts}
        upazilas={upazilas}
        locale={locale}
      />
    </div>
  );
}
