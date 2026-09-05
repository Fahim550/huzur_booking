'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, ArrowRight, ShieldCheck, LogIn, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import OtpInput from '@/components/auth/OtpInput';
import { normalizeBangladeshiPhone, requestPhoneOtp, verifyPhoneOtp } from '@/lib/auth';

function LoginContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'bn';
  const t = useTranslations('auth');

  const redirectUrl = searchParams.get('redirect');

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
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
      const res = await requestPhoneOtp(phone);
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

  const handleVerifyOtp = async (tokenToVerify?: string) => {
    const code = tokenToVerify || otp;
    if (code.length !== 6) {
      setError(locale === 'bn' ? '৬-সংখ্যার সম্পূর্ণ ওটিপি কোডটি লিখুন।' : 'Please enter the complete 6-digit OTP code.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await verifyPhoneOtp(phone, code);
      if (res.success && res.user) {
        if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          const destination = res.user.role === 'huzur'
            ? `/${locale}/dashboard/huzur`
            : `/${locale}/dashboard/organizer`;
          router.push(destination);
        }
        router.refresh();
      } else {
        setError(locale === 'bn' ? 'ভুল ওটিপি কোড। পুনরায় যাচাই করুন।' : 'Invalid OTP code. Please try again.');
      }
    } catch {
      setError(locale === 'bn' ? 'লগইন প্রক্রিয়া সম্পন্ন করা যায়নি।' : 'Login could not be completed.');
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
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-zinc-900 dark:text-zinc-100">
            {t('loginTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('loginSubtitle')}
          </p>
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

        {/* STEP 1: PHONE INPUT */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="login-phone" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                {t('phoneLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="login-phone"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 min-h-[48px]"
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
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
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

        {/* Footer Link to Register */}
        <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <Link
            href={`/${locale}/register`}
            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium transition-colors"
          >
            {t('noAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-12 text-center text-sm text-zinc-500">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
