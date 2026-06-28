import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider, ThemeScript } from '@/context/ThemeContext';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Democracy Distributed',
    template: '%s | Democracy Distributed',
  },
  description: 'Follow the money from vote to invoice. Democracy Distributed maps every dollar your city spends — open, crowdsourced, fully traceable.',
  openGraph: {
    type: 'website',
    siteName: 'Democracy Distributed',
    title: 'Democracy Distributed',
    description: 'Follow the money from vote to invoice.',
    url: SITE_URL,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Democracy Distributed — Follow the Money' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Democracy Distributed',
    description: 'Follow the money from vote to invoice.',
    images: ['/og-default.png'],
  },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
