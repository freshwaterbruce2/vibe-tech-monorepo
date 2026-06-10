// eslint-disable-next-line @nx/enforce-module-boundaries -- same-app import via the '@/' alias; the rule misreads it as cross-app
import { Footer } from '@/components/layout/footer';
// eslint-disable-next-line @nx/enforce-module-boundaries -- same-app import via the '@/' alias; the rule misreads it as cross-app
import { WebMCPProvider } from '@/components/providers/WebMCPProvider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

// eslint-disable-next-line react-refresh/only-export-components -- Next.js App Router requires the metadata export alongside the layout component
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
        <WebMCPProvider />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

