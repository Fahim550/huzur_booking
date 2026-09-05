'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { User, Phone, MapPin, ShieldCheck, Settings, LogOut, FileText, Bell, Globe } from 'lucide-react';
import { SEED_HUZURS } from '@/lib/data/mockData';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import LanguageSwitcher from '@/components/navigation/LanguageSwitcher';

export default function ProfilePage() {
  const params = useParams();
  const rawLocale = params?.locale as string;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const [userRole, setUserRole] = useState<'organizer' | 'huzur'>('organizer');

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>{dict.profile.title}</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {dict.profile.subtitle}
        </p>
      </div>

      {/* Language Switcher Banner in Profile */}
      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
          <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>
            {locale === 'bn' ? 'ভাষা / Language Preference:' : 'Language / ভাষা নির্বাচন:'}
          </span>
        </div>
        <LanguageSwitcher currentLocale={locale} variant="header" />
      </div>

      {/* Role Switcher for Development / Demo */}
      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
        <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
          {dict.profile.modeToggleTitle}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setUserRole('organizer')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[44px] ${
              userRole === 'organizer'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-amber-200 dark:border-zinc-700'
            }`}
          >
            {dict.profile.organizerMode}
          </button>
          <button
            onClick={() => setUserRole('huzur')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[44px] ${
              userRole === 'huzur'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-emerald-200 dark:border-zinc-700'
            }`}
          >
            {dict.profile.speakerMode}
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-xl font-bold border-2 border-emerald-500/20 shrink-0">
            {userRole === 'organizer' ? (locale === 'bn' ? 'আ' : 'O') : (locale === 'bn' ? 'হ' : 'H')}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 truncate">
                {userRole === 'organizer'
                  ? 'হাজী মো: রফিকুল ইসলাম'
                  : `${SEED_HUZURS[0].huzur_profile.title} ${SEED_HUZURS[0].full_name}`}
              </h2>
              <span className="inline-flex items-center text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 mr-0.5" />
                {dict.brand.verified}
              </span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {userRole === 'organizer'
                ? 'সভাপতি, বায়তুস সালাম জামে মসজিদ কমিটি'
                : SEED_HUZURS[0].huzur_profile.designation}
            </p>

            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>+880 1711 000001</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {userRole === 'organizer'
                    ? dict.reference.districts['কুমিল্লা'] || 'কুমিল্লা'
                    : dict.reference.districts['ঢাকা'] || 'ঢাকা'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Profile Settings Options */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors text-left text-xs font-semibold text-zinc-800 dark:text-zinc-200 min-h-[44px]">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>{dict.profile.editBio}</span>
            </div>
            <span className="text-zinc-400 text-base">›</span>
          </button>

          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors text-left text-xs font-semibold text-zinc-800 dark:text-zinc-200 min-h-[44px]">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span>{dict.profile.notifications}</span>
            </div>
            <span className="text-zinc-400 text-base">›</span>
          </button>

          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors text-left text-xs font-semibold text-zinc-800 dark:text-zinc-200 min-h-[44px]">
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>{dict.profile.security}</span>
            </div>
            <span className="text-zinc-400 text-base">›</span>
          </button>

          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left text-xs font-semibold text-rose-700 dark:text-rose-400 min-h-[44px]">
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4" />
              <span>{dict.profile.logout}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
