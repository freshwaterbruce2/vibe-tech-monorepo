import { Footer } from '@/components/layout/footer';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Vibe-shop - Automating Trends',
  description:
    'Find the hottest trending products with the best deals. Updated daily with AI-powered product discovery.',
  keywords: ['trending products', 'deals', 'shopping', 'best sellers'],
  openGraph: {
    title: 'Vibe-shop - Automating Trends',
    description: 'Find the hottest trending products with the best deals.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
