import { Toaster } from '@/components/ui/toaster';
import { SiteBackground } from '@/components/layout/SiteBackground';
import About from '@/pages/About';
import Blog from '@/pages/Blog';
import BlogEditor from '@/pages/BlogEditor';
import BlogPostPage from '@/pages/public/BlogPostPage';
import Contact from '@/pages/Contact';
import Dashboard from '@/pages/Dashboard';
import FuturisticDemo from '@/pages/FuturisticDemo';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import PalettePreview from '@/pages/PalettePreview';
import Portfolio from '@/pages/Portfolio';
import Pricing from '@/pages/Pricing';
import Privacy from '@/pages/Privacy';
import ProjectDetail from '@/pages/ProjectDetail';
import Resources from '@/pages/Resources';
import Services from '@/pages/Services';
import Terms from '@/pages/Terms';
import Tools from '@/pages/Tools';
import Webmcp from '@/pages/Webmcp';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="relative isolate min-h-screen bg-[#040711]">
        <SiteBackground />
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/portfolio/:id" element={<ProjectDetail />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/category/:categoryName" element={<Blog />} />
            <Route path="/blog/tag/:tagName" element={<Blog />} />
            <Route path="/blog/:postId" element={<BlogPostPage />} />
            <Route path="/blog-editor" element={<BlogEditor />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/webmcp" element={<Webmcp />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/palette-preview" element={<PalettePreview />} />
            <Route path="/futuristic-demo" element={<FuturisticDemo />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
