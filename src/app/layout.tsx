import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider, ThemeScript } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'WikiGov | Democracy Distributed',
  description: 'Where the money comes from — and where it goes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        {/* Tailwind CDN — for ItemRecord prototype route only; remove before production build */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.tailwindcss.com" />
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
