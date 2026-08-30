import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Archon — Codebase Architecture Intelligence',
  description: 'Understand the architecture. Trace the dependency. Simulate the change. Ship with confidence.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon', type: 'image/png' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-slate-100 font-sans antialiased min-h-screen selection:bg-sky-500/20 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
