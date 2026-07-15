import { useEffect, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/Footer';
import NavBar from '@/components/NavBar';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  particleOpacity?: number;
  particleCount?: number;
  auroraIntensity?: 'low' | 'medium' | 'high';
}

const PageLayout = ({ children, title, description, keywords, canonicalUrl }: PageLayoutProps) => {
  useEffect(() => {
    if (title) document.title = `${title} | Vibe Tech`;
  }, [title]);

  const siteTitle = title ? `${title} | Vibe Tech` : 'Vibe Tech | Creating innovative digital solutions';
  const siteDescription = description ?? 'Creating innovative digital solutions with a focus on design and functionality';
  const siteKeywords = keywords ?? 'vibe tech, web development, digital solutions, tech services';
  const currentUrl = canonicalUrl ?? window.location.href;

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Helmet>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta name="keywords" content={siteKeywords} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <link rel="canonical" href={currentUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="theme-color" content="#040711" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Helmet>
      <NavBar />
      <main className="relative px-4 sm:px-6 md:px-0">{children}</main>
      <Footer />
    </div>
  );
};

export default PageLayout;
