import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ChatInterface from './pages/ChatInterface';
import ContextGuide from './pages/ContextGuide';
import Copilot from './pages/Copilot';
import DocumentAnalysis from './pages/DocumentAnalysis';
import FuturisticDemo from './pages/FuturisticDemo';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import NovaDashboard from './pages/NovaDashboard';
import NovaDashboard2026 from './pages/NovaDashboard2026';
import Settings from './pages/Settings';
import VibeDashboard from './pages/VibeDashboard';

import AdminPage from '@/components/admin/AdminPage';
import { FeatureFlaggedRoute } from '@/components/routes/FeatureFlaggedRoute';
import { ProtectedRoute } from '@/components/routes/ProtectedRoute';
import CalendarPage from '@/pages/CalendarPage';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main App Layout Routes */}
          <Route element={<MainLayout />}>
            {/* Dashboard Route with Feature Flag */}
            <Route
              path="/dashboard"
              element={
                <FeatureFlaggedRoute
                  flag="nova.ui.new-dashboard"
                  enabledComponent={<NovaDashboard2026 />}
                  disabledComponent={<NovaDashboard />}
                />
              }
            />
            {/* Direct access routes for testing */}
            <Route path="/dashboard-new" element={<NovaDashboard2026 />} />
            <Route path="/dashboard-legacy" element={<NovaDashboard />} />
            <Route path="/" element={<NovaDashboard2026 />} />{' '}
            {/* Default to new for now, or use wrapper if needed */}
            <Route path="/chat" element={<ChatInterface />} />
            <Route path="/copilot" element={<Copilot />} />
            <Route path="/context-guide" element={<ContextGuide />} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/document-analysis" element={<DocumentAnalysis />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Standalone Routes */}
          <Route path="/landing" element={<Index />} />
          <Route path="/vibe-dashboard" element={<VibeDashboard />} />
          <Route path="/demo" element={<FuturisticDemo />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
