import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Hind_Siliguri, Inter } from 'next/font/google';
import '../globals.css';
import TopHeader from '@/components/navigation/TopHeader';
import BottomNav from '@/components/navigation/BottomNav';
import QueryProvider from '@/providers/QueryProvider';
import { routing, Locale } from '@/i18n/routing';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { getDictionary } from '@/lib/i18n/getDictionary';

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '600'],
  variable: '--font-hind-siliguri',
  display: 'swap',
  preload: false,
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
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
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  if (!routing.locales.includes(rawLocale as Locale)) {
    return {};
  }
  const locale = rawLocale as Locale;
  const dict = getDictionary(locale);

  return {
    title: `${dict.brand.name} | ${dict.brand.tag}`,
    description: dict.hero.subtitle,
    keywords:
      locale === 'bn'
        ? ['হুজুর বুকিং', 'ওয়াজ মাহফিল', 'ইসলামিক বক্তা', 'মাহফিল শিডিউল', 'মাওলানা বুকিং']
        : ['Huzur Booking', 'Waz Mahfil', 'Islamic Speaker', 'Mahfil Schedule', 'Maulana Booking Bangladesh'],
    authors: [{ name: dict.brand.name }],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        bn: '/bn',
        en: '/en',
      },
    },
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

  // Validate locale
  if (!routing.locales.includes(rawLocale as Locale)) {
    notFound();
  }

  const locale = rawLocale as Locale;

  // Enable static rendering
  setRequestLocale(locale);

  // Retrieve messages for next-intl
  const messages = await getMessages();

  const fontClass =
    locale === 'bn'
      ? `${hindSiliguri.variable} font-sans`
      : `${inter.variable} font-sans`;

  return (
    <html
      lang={locale}
      dir="ltr"
      className={`${hindSiliguri.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className={`min-h-full flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 ${fontClass} selection:bg-emerald-200 dark:selection:bg-emerald-900 selection:text-emerald-900 dark:selection:text-emerald-100`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
