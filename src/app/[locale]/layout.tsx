import type { Metadata, Viewport } from 'next';
import { Hind_Siliguri, Inter } from 'next/font/google';
import '../globals.css';
import TopHeader from '@/components/navigation/TopHeader';
import BottomNav from '@/components/navigation/BottomNav';
import QueryProvider from '@/providers/QueryProvider';
import { LOCALES, Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#059669' },
    { media: '(prefers-color-scheme: dark)', color: '#064e3b' },
  ],
};

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  return {
    title: `${dict.brand.name} | ${dict.brand.tag}`,
    description: dict.hero.subtitle,
    keywords:
      locale === 'bn'
        ? ['হুজুর বুকিং', 'ওয়াজ মাহফিল', 'ইসলামিক বক্তা', 'মাহফিল শিডিউল', 'মাওলানা বুকিং']
        : ['Huzur Booking', 'Waz Mahfil', 'Islamic Speaker', 'Mahfil Schedule', 'Maulana Booking Bangladesh'],
    authors: [{ name: dict.brand.name }],
    icons: {
      icon: '/favicon.ico',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const fontClass =
    locale === 'bn'
      ? `${hindSiliguri.variable} font-sans`
      : `${inter.variable} font-sans`;

  return (
    <html
      lang={locale}
      className={`${hindSiliguri.variable} ${inter.variable} h-full antialiased`}
      dir="ltr"
    >
      <body className={`min-h-full flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 ${fontClass} selection:bg-emerald-200 dark:selection:bg-emerald-900 selection:text-emerald-900 dark:selection:text-emerald-100`}>
        <QueryProvider>
          <div className="flex flex-col min-h-screen w-full">
            {/* Sticky Top Header with Desktop Language Switcher */}
            <TopHeader locale={locale} />

            {/* Main Page Area — Mobile-First (Base 375px upwards) */}
            <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6">
              {children}
            </main>

            {/* Fixed Mobile Bottom Navigation Bar (< 768px) with 1-Tap Language Switcher */}
            <BottomNav locale={locale} />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
