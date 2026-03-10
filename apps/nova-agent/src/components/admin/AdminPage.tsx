import { useAdmin } from '@/context/AdminContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Settings, Shield, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLogin from './AdminLogin';

/**
 * Admin page that shows login when unauthenticated,
 * or an admin dashboard with quick actions when authenticated.
 */
const AdminPage = () => {
  const { isAdmin, logout } = useAdmin();
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AdminLogin />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-[color:var(--c-cyan)]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-gray-400">Manage Nova Agent settings and configuration</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          className="glass-card border-[rgba(185,51,255,0.2)] cursor-pointer hover:border-[rgba(185,51,255,0.4)] transition-colors"
          onClick={async () => navigate('/settings')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Settings className="h-5 w-5 text-[#b026ff]" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">Configure API keys, model selection, and application preferences</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-[rgba(185,51,255,0.2)] cursor-pointer hover:border-[rgba(185,51,255,0.4)] transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Key className="h-5 w-5 text-[#22d3ee]" />
              API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">Manage LLM provider credentials stored in Windows Credential Manager</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
