import Link from 'next/link';
import { Plus, ArrowLeft, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

interface OrganizerDashboardProps {
  params: Promise<{ locale: string }>;
}

export default async function OrganizerDashboard({ params }: OrganizerDashboardProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 pt-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Link */}
        <Link
          href={`/${locale}/my-bookings`}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{locale === 'bn' ? 'ফিরে যান' : 'Back'}</span>
        </Link>

        {/* Dashboard Header */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl p-6 text-white shadow-lg mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
                {locale === 'bn' ? 'আয়োজক ড্যাশবোর্ড' : 'Organizer Dashboard'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif">
                {locale === 'bn' ? 'আমার মাহফিল বুকিং ও আবেদনসমূহ' : 'My Mahfil Bookings & Requests'}
              </h1>
              <p className="text-zinc-300 text-sm mt-1">
                {locale === 'bn'
                  ? 'বিভিন্ন বক্তার কাছে প্রেরিত বুকিং আবেদন এবং সেগুলোর হালনাগাদ স্থিতি'
                  : 'Track and manage your submitted speaking invitations'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/dashboard/my-requests`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm min-h-[44px]"
              >
                <Clock className="w-4 h-4" />
                <span>{locale === 'bn' ? 'আবেদন তালিকা দেখুন' : 'View My Requests'}</span>
              </Link>
              <Link
                href={`/${locale}/search`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl text-sm font-semibold transition-colors shadow-sm min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>{locale === 'bn' ? 'বক্তা খুঁজুন' : 'Find Speakers'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium">{locale === 'bn' ? 'অনুমোদনের অপেক্ষায়' : 'Awaiting Approval'}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">১</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium">{locale === 'bn' ? 'অনুমোদিত / নিশ্চিত' : 'Confirmed'}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">২</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium">{locale === 'bn' ? 'মোট মাহফিল আবেদন' : 'Total Requests'}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">৩</p>
          </div>
        </div>

        {/* Privacy Assurance Card */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-900 dark:text-blue-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {locale === 'bn' ? 'গোপনীয়তা ও নিরাপত্তা নীতি' : 'Privacy & Security Policy'}
            </p>
            <p className="text-blue-800/80 dark:text-blue-300/80 text-xs mt-0.5">
              {locale === 'bn'
                ? 'Row Level Security (RLS) এর মাধ্যমে আপনার যোগাযোগের নম্বর ও ব্যক্তিগত তথ্য শুধুমাত্র সংশ্লিষ্ট হুজুর ও তাঁর অনুমোদিত ম্যানেজার দেখতে পারবেন। জনসাধারণের জন্য তা সুরক্ষিত থাকবে।'
                : 'RLS ensures your organizer contact details remain private between you and the invited speaker.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
