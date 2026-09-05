'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCheck, CalendarCheck, Phone, ArrowRight, ShieldCheck, Check, Sparkles, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import OtpInput from '@/components/auth/OtpInput';
import { normalizeBangladeshiPhone, requestPhoneOtp, verifyPhoneOtp, UserRole } from '@/lib/auth';

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'bn';
  const t = useTranslations('auth');

  // Registration step: 'role' -> 'phone' -> 'otp'
  const [step, setStep] = useState<'role' | 'phone' | 'otp'>('role');
  const [role, setRole] = useState<UserRole>('huzur');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Handle phone submission
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const { isValid } = normalizeBangladeshiPhone(phone);
    if (!isValid) {
      setError(
        locale === 'bn'
          ? 'অনুগ্রহ করে সঠিক ১১ সংখ্যার বাংলাদেশী মোবাইল নম্বর লিখুন (যেমন: ০১৭১২-৩৪৫৬৭৮)'
          : 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712-345678)'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPhoneOtp(phone, role);
      if (res.success) {
        setStep('otp');
        setCountdown(60);
        setCanResend(false);
        if (res.isDemoSimulation) {
          setDemoNotice(t('demoCodeNotice'));
        }
      } else {
        setError(locale === 'bn' ? 'ওটিপি পাঠাতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।' : 'Failed to send OTP. Please try again.');
      }
    } catch {
      setError(locale === 'bn' ? 'সার্ভার যোগাযোগে ত্রুটি ঘটেছে।' : 'Server communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (tokenToVerify?: string) => {
    const code = tokenToVerify || otp;
    if (code.length !== 6) {
      setError(locale === 'bn' ? '৬-সংখ্যার সম্পূর্ণ ওটিপি কোডটি লিখুন।' : 'Please enter the complete 6-digit OTP code.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await verifyPhoneOtp(phone, code, role);
      if (res.success) {
        // Redirect to profile setup wizard
        router.push(`/${locale}/profile?onboarding=true&role=${role}`);
        router.refresh();
      } else {
        setError(locale === 'bn' ? 'ভুল ওটিপি কোড। পুনরায় যাচাই করুন।' : 'Invalid OTP code. Please try again.');
      }
    } catch {
      setError(locale === 'bn' ? 'যাচাইকরণ প্রক্রিয়া সম্পন্ন করা যায়নি।' : 'Verification could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 mb-3 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-zinc-900 dark:text-zinc-100">
            {t('registerTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('registerSubtitle')}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === 'role'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              ১
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {locale === 'bn' ? 'ভূমিকা' : 'Role'}
            </span>
          </div>
          <div className="h-0.5 flex-1 mx-2 bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === 'phone'
                  ? 'bg-emerald-700 text-white'
                  : step === 'otp'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              ২
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {locale === 'bn' ? 'মোবাইল' : 'Phone'}
            </span>
          </div>
          <div className="h-0.5 flex-1 mx-2 bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === 'otp'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              ৩
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {locale === 'bn' ? 'ওটিপি' : 'OTP'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs sm:text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Demo Notice */}
        {demoNotice && (
          <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{demoNotice}</span>
          </div>
        )}

        {/* STEP 1: ROLE SELECTION */}
        {step === 'role' && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {t('selectRolePrompt')}
            </p>

            {/* Huzur / Speaker Option */}
            <button
              type="button"
              onClick={() => setRole('huzur')}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 min-h-[56px] ${
                role === 'huzur'
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-sm ring-2 ring-emerald-600/10'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  role === 'huzur'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {t('roleHuzur')}
                  </h3>
                  {role === 'huzur' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t('roleHuzurDesc')}
                </p>
              </div>
            </button>

            {/* Organizer Option */}
            <button
              type="button"
              onClick={() => setRole('organizer')}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 min-h-[56px] ${
                role === 'organizer'
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-sm ring-2 ring-emerald-600/10'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  role === 'organizer'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {t('roleOrganizer')}
                  </h3>
                  {role === 'organizer' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t('roleOrganizerDesc')}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full mt-6 py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>{locale === 'bn' ? 'পরবর্তী ধাপ' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: PHONE NUMBER ENTRY */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                {t('phoneLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="reg-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder={t('phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-base sm:text-lg font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                {t('phoneInputHelp')}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep('role')}
                className="py-3 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors min-h-[48px]"
              >
                {locale === 'bn' ? 'পেছনে' : 'Back'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 min-h-[48px]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('sendingOtp')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('sendOtp')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: OTP VERIFICATION */}
        {step === 'otp' && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t('otpSentTo')}
              </p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-mono">
                  {normalizeBangladeshiPhone(phone).formatted}
                </span>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                >
                  {t('changePhone')}
                </button>
              </div>
            </div>

            <div className="py-2">
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={isSubmitting || otp.length !== 6}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 min-h-[48px]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t('verifying')}</span>
                </>
              ) : (
                <span>{t('verifyOtp')}</span>
              )}
            </button>

            {/* Resend Countdown */}
            <div className="text-center pt-2">
              {canResend ? (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={isSubmitting}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {t('resendNow')}
                </button>
              ) : (
                <p className="text-xs text-zinc-400">
                  {t('resendIn', { seconds: countdown })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer Link to Login */}
        <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <Link
            href={`/${locale}/login`}
            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium transition-colors"
          >
            {t('haveAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}
