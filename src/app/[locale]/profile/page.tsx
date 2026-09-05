'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Users,
  Settings,
  LogOut,
  Globe,
  ShieldCheck,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import LanguageSwitcher from '@/components/navigation/LanguageSwitcher';
import HuzurProfileForm from '@/components/profile/HuzurProfileForm';
import OrganizerProfileForm from '@/components/profile/OrganizerProfileForm';
import ManagerDelegation from '@/components/profile/ManagerDelegation';
import { getClientUser, signOutUser, AuthSessionUser } from '@/lib/auth';

function ProfileContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawLocale = params?.locale as string;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = useTranslations('profile');

  const roleParam = searchParams.get('role');
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [userRole, setUserRole] = useState<'organizer' | 'huzur'>('huzur');
  const [activeTab, setActiveTab] = useState<'profile' | 'delegates'>('profile');

  useEffect(() => {
    async function loadUser() {
      const u = await getClientUser();
      if (u) {
        setCurrentUser(u);
        if (roleParam === 'organizer' || roleParam === 'huzur') {
          setUserRole(roleParam);
        } else if (u.role === 'huzur' || u.role === 'organizer') {
          setUserRole(u.role);
        }
      } else if (roleParam === 'organizer' || roleParam === 'huzur') {
        setUserRole(roleParam);
      }
    }
    loadUser();
  }, [roleParam]);

  const handleLogout = async () => {
    if (confirm(locale === 'bn' ? 'আপনি কি নিশ্চিতভাবে লগআউট করতে চান?' : 'Are you sure you want to log out?')) {
      await signOutUser();
      router.push(`/${locale}/login`);
      router.refresh();
    }
  };

  const userId = currentUser?.id || 'demo-user-1';
  const huzurId = 'a1111111-1111-1111-1111-111111111111'; // primary seed huzur
  const huzurName = currentUser?.name || 'মাওলানা শায়খ আহমাদুল্লাহ';

  return (
    <div className="space-y-6 pb-20">
      {/* Page Title & User Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>{t('title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t('subtitle')}
          </p>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900 rounded-xl transition-colors min-h-[44px]"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logout')}</span>
        </button>
      </div>

      {/* Language Switcher Banner */}
      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
          <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>
            {locale === 'bn' ? 'ভাষা / Language Preference:' : 'Language / ভাষা নির্বাচন:'}
          </span>
        </div>
        <LanguageSwitcher currentLocale={locale} variant="header" />
      </div>

      {/* Role Switcher */}
      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
            {t('modeToggleTitle')}
          </span>
          <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
            {userRole === 'huzur' ? t('speakerMode') : t('organizerMode')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setUserRole('huzur')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
              userRole === 'huzur'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-emerald-200 dark:border-zinc-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('speakerMode')}</span>
          </button>
          <button
            type="button"
            onClick={() => setUserRole('organizer')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
              userRole === 'organizer'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-amber-200 dark:border-zinc-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('organizerMode')}</span>
          </button>
        </div>
      </div>

      {/* Huzur Role: Navigation Tabs (Profile vs Delegates) */}
      {userRole === 'huzur' && (
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t('huzurFormTitle')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delegates')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'delegates'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{locale === 'bn' ? 'প্রতিনিধি ব্যবস্থাপনা' : 'Manage Delegates'}</span>
          </button>
        </div>
      )}

      {/* RENDER FORMS */}
      {userRole === 'huzur' ? (
        activeTab === 'profile' ? (
          <HuzurProfileForm
            userId={userId}
            initialData={{
              name: 'শায়খ আহমাদুল্লাহ',
              title: 'শায়খ',
              photo_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
              institution: 'আস-সুন্নাহ ফাউন্ডেশন',
              home_district_id: 1,
              specialties: ['সিরাতুন্নবী (সা.)', 'যুব সমাজ ও চরিত্র গঠন'],
              bio: 'বিশিষ্ট ইসলামী চিন্তাবিদ, খতিব এবং সমাজসেবক। আস-সুন্নাহ ফাউন্ডেশনের চেয়ারম্যান।',
              phone: currentUser?.phone || '০১৭১১-০০০০০১',
            }}
            locale={locale}
          />
        ) : (
          <ManagerDelegation
            huzurId={huzurId}
            huzurName={huzurName}
            locale={locale}
          />
        )
      ) : (
        <OrganizerProfileForm
          userId={userId}
          initialData={{
            name: currentUser?.name || 'হাজী মো: রফিকুল ইসলাম',
            phone: currentUser?.phone || '০১৭১১-০০০০০২',
            institution_name: 'বায়তুস সালাম জামে মসজিদ পরিচালনা কমিটি',
          }}
          locale={locale}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
