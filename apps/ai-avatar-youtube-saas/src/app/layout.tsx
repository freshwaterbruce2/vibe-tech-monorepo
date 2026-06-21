import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

// Next.js root layouts legitimately export metadata alongside the component.
// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'VibeTech AI Avatar Studio',
  description:
    'Create, preview, and publish AI avatar videos for YouTube from any device.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4 text-sm font-medium">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <Link href="/upload" className="hover:text-primary">
              Capture
            </Link>
            <Link href="/script" className="hover:text-primary">
              Script
            </Link>
            <Link href="/preview" className="hover:text-primary">
              Preview
            </Link>
            <Link href="/avatar" className="hover:text-primary">
              Avatar
            </Link>
            <Link href="/publish" className="hover:text-primary">
              Publish
            </Link>
            <Link href="/dashboard/billing" className="hover:text-primary">
              Billing
            </Link>
          </nav>
        </header>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
