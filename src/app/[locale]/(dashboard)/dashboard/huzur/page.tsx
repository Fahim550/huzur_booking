import Link from 'next/link';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Users, ArrowLeft } from 'lucide-react';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

interface HuzurDashboardProps {
  params: Promise<{ locale: string }>;
}

export default async function HuzurDashboard({ params }: HuzurDashboardProps) {
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
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-lg mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-700/60 text-emerald-200 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
                {locale === 'bn' ? 'হুজুর / ম্যানেজার ড্যাশবোর্ড' : 'Huzur / Manager Dashboard'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif">
                {locale === 'bn' ? 'মাহফিল সময়সূচি ও বুকিং সমন্বয়' : 'Mahfil Schedule & Booking Coordination'}
              </h1>
              <p className="text-emerald-100/80 text-sm mt-1">
                {locale === 'bn'
                  ? 'আপনার বা প্রতিনিধি কর্তৃক গৃহীত ও অপেক্ষমাণ মাহফিলের তালিকা'
                  : 'Manage upcoming and requested speaking invitations'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/dashboard/calendar`}
                className="px-4 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                <span>{locale === 'bn' ? 'ক্যালেন্ডার ভিউ' : 'Calendar View'}</span>
              </Link>
              <Link
                href={`/${locale}/dashboard/calendar`}
                className="px-4 py-2.5 bg-white text-emerald-900 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-colors shadow-sm"
              >
                {locale === 'bn' ? 'তারিখ উন্মুক্ত করুন' : 'Post Availability'}
              </Link>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium">{locale === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">১</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium">{locale === 'bn' ? 'নিশ্চিতকৃত' : 'Confirmed'}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">২</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium">{locale === 'bn' ? 'আসন্ন মাহফিল' : 'Upcoming'}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">২</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium">{locale === 'bn' ? 'প্রতিনিধি ম্যানেজার' : 'Managers'}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">২ জন</p>
          </div>
        </div>

        {/* Instructions Alert */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-900 dark:text-emerald-200 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {locale === 'bn' ? 'দ্বৈত বুকিং প্রতিরোধ সক্রিয়' : 'Double Booking Prevention Active'}
            </p>
            <p className="text-emerald-800/80 dark:text-emerald-300/80 text-xs mt-0.5">
              {locale === 'bn'
                ? 'ডাটাবেজে Postgres EXCLUDE constraint কার্যকর রয়েছে। একই তারিখে দুটি অনুমোদিত বা অপেক্ষমাণ আবেদন গ্রহণ করা হবে না।'
                : 'Postgres EXCLUDE constraint protects your schedule from concurrent conflicts.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
