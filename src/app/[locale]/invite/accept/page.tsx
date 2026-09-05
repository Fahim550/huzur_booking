'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  Check,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getManagerInvite, acceptManagerInvite, ManagerInviteData } from '@/lib/queries/profiles';
import { getClientUser, AuthSessionUser, requestPhoneOtp, verifyPhoneOtp, normalizeBangladeshiPhone } from '@/lib/auth';
import OtpInput from '@/components/auth/OtpInput';

function AcceptInviteContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'bn';
  const t = useTranslations('delegate');

  const codeFromUrl = searchParams.get('code') || '';
  const [code, setCode] = useState(codeFromUrl);
  const [invite, setInvite] = useState<ManagerInviteData | null>(null);
  const [loading, setLoading] = useState(Boolean(codeFromUrl));
  const [error, setError] = useState<string | null>(null);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Quick Inline Auth state (if not logged in)
  const [authStep, setAuthStep] = useState<'phone' | 'otp'>('phone');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check auth user on mount
  useEffect(() => {
    async function checkAuth() {
      const u = await getClientUser();
      setCurrentUser(u);
      if (u?.name) setManagerName(u.name);
      if (u?.phone) setManagerPhone(u.phone);
    }
    checkAuth();
  }, []);

  // Fetch invite on load or code change
  useEffect(() => {
    async function loadInvite() {
      if (!code.trim()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const inv = await getManagerInvite(code.trim());
        if (inv) {
          setInvite(inv);
          if (inv.manager_name && !managerName) setManagerName(inv.manager_name);
          if (inv.phone && !managerPhone) setManagerPhone(inv.phone);
        } else {
          setError(t('invalidCode'));
        }
      } catch (err) {
        setError(t('invalidCode'));
      } finally {
        setLoading(false);
      }
    }

    if (codeFromUrl) {
      loadInvite();
    }
  }, [codeFromUrl, t]);

  const handleManualCodeLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const inv = await getManagerInvite(code.trim());
      if (inv) {
        setInvite(inv);
      } else {
        setError(t('invalidCode'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick Phone OTP Login
  const handleQuickSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { isValid } = normalizeBangladeshiPhone(loginPhone);
    if (!isValid) {
      setAuthError(locale === 'bn' ? 'সঠিক ১১ সংখ্যার মোবাইল নম্বর লিখুন' : 'Enter a valid 11-digit mobile number');
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await requestPhoneOtp(loginPhone, 'manager');
      if (res.success) {
        setAuthStep('otp');
      } else {
        setAuthError(locale === 'bn' ? 'ওটিপি পাঠাতে ব্যর্থ হয়েছে' : 'Failed to send OTP');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleQuickVerifyOtp = async (token?: string) => {
    const codeToVerify = token || loginOtp;
    if (codeToVerify.length !== 6) return;
    setAuthError(null);
    setIsVerifyingOtp(true);
    try {
      const res = await verifyPhoneOtp(loginPhone, codeToVerify, 'manager');
      if (res.success && res.user) {
        setCurrentUser(res.user);
        if (!managerName) setManagerName(res.user.name || '');
        if (!managerPhone) setManagerPhone(res.user.phone);
      } else {
        setAuthError(locale === 'bn' ? 'ভুল ওটিপি কোড' : 'Invalid OTP code');
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Accept the invite
  const handleAccept = async () => {
    if (!invite || !currentUser) return;
    if (!managerName.trim()) {
      setError(locale === 'bn' ? 'আপনার নাম লিখুন' : 'Please enter your name');
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      const res = await acceptManagerInvite(
        invite.invite_code,
        currentUser.id,
        managerName.trim(),
        managerPhone.trim() || currentUser.phone
      );

      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push(`/${locale}/dashboard/huzur`);
          router.refresh();
        }, 1500);
      } else {
        setError(locale === 'bn' ? 'আমন্ত্রণ গ্রহণ করা সম্ভব হয়নি' : 'Could not accept invite');
      }
    } catch {
      setError(locale === 'bn' ? 'সার্ভার যোগাযোগে ত্রুটি' : 'Server communication error');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-6 sm:py-10">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Header Icon */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-zinc-900 dark:text-zinc-100">
            {t('acceptTitle')}
          </h1>
        </div>

        {/* Success Banner */}
        {isSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">{t('acceptSuccess')}</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                {locale === 'bn' ? 'ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...' : 'Redirecting to speaker dashboard...'}
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-700 dark:text-rose-200 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center text-zinc-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs">
              {locale === 'bn' ? 'আমন্ত্রণ তথ্য যাচাই করা হচ্ছে...' : 'Verifying invite details...'}
            </span>
          </div>
        )}

        {/* No Code Provided: Lookup Form */}
        {!loading && !invite && !isSuccess && (
          <form onSubmit={handleManualCodeLookup} className="space-y-4">
            <p className="text-xs text-zinc-500 text-center">
              {locale === 'bn'
                ? 'বক্তার কাছ থেকে প্রাপ্ত ৬-সংখ্যার আমন্ত্রণ কোডটি নিচে লিখুন:'
                : 'Enter the invite code received from the speaker:'}
            </p>
            <div>
              <input
                type="text"
                required
                placeholder="HZ-892415"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3.5 text-center text-lg font-mono font-bold tracking-widest rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 text-xs sm:text-sm min-h-[44px]"
            >
              {locale === 'bn' ? 'যাচাই করুন' : 'Verify Code'}
            </button>
          </form>
        )}

        {/* Valid Invite Details */}
        {!loading && invite && !isSuccess && (
          <div className="space-y-6">
            {/* Invitation Greeting */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center">
              <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                {t('acceptPrompt', { huzurName: invite.huzur_name || 'সম্মানিত বক্তা' })}
              </p>
            </div>

            {/* Scoped Permissions Explained */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                {t('permissionsListTitle')}
              </span>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('perm1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('perm2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('perm3')}</span>
                </li>
              </ul>
            </div>

            {/* Check Authentication */}
            {!currentUser ? (
              /* Inline Login Prompt */
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>{t('loginToAccept')}</span>
                </div>

                {authError && (
                  <p className="text-xs text-rose-600">{authError}</p>
                )}

                {authStep === 'phone' ? (
                  <form onSubmit={handleQuickSendOtp} className="space-y-3">
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      placeholder="০১৭১১-০০০০০১"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600"
                    />
                    <button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all min-h-[44px]"
                    >
                      {isSendingOtp ? 'পাঠানো হচ্ছে...' : 'ওটিপি কোড পাঠান'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500">
                      {loginPhone} নম্বরে প্রেরিত ৬-সংখ্যার কোডটি লিখুন:
                    </p>
                    <OtpInput
                      value={loginOtp}
                      onChange={setLoginOtp}
                      onComplete={handleQuickVerifyOtp}
                      disabled={isVerifyingOtp}
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickVerifyOtp()}
                      disabled={isVerifyingOtp || loginOtp.length !== 6}
                      className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all min-h-[44px]"
                    >
                      {isVerifyingOtp ? 'যাচাই করা হচ্ছে...' : 'লগইন সম্পন্ন করুন'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Accept Button and Confirmation */
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {locale === 'bn' ? 'আপনার নাম' : 'Your Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="মাওলানা হাফিজুর রহমান"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full py-3.5 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {isAccepting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t('accepting')}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t('acceptBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto py-12 text-center text-sm text-zinc-500">Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
