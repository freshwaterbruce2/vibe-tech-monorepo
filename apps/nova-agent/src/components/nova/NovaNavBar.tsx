import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/context/AdminContext';
import { useNovaData } from '@/hooks/useNovaData';
import { ChevronRight, LogOut, Settings, Shield, Sparkles, Zap } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const NovaNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { agentStatus } = useNovaData();
  const { isAdmin, logout } = useAdmin();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/chat', label: 'Chat' },
    { path: '/copilot', label: 'Copilot' },
    { path: '/context-guide', label: 'Context' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/admin', label: isAdmin ? 'Admin' : 'Login' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed w-full z-50">
      {/* 2026 Neon Glassmorphism Navbar */}
      <div 
        style={{
          background: 'linear-gradient(180deg, rgba(10, 8, 20, 0.95) 0%, rgba(15, 12, 28, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(176, 38, 255, 0.15)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(176, 38, 255, 0.05)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Nova Agent Logo - Neon Style */}
            <Link to="/" className="flex items-center gap-3 group">
              <div 
                style={{
                  padding: '10px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(176, 38, 255, 0.2), rgba(255, 45, 149, 0.1))',
                  border: '1px solid rgba(176, 38, 255, 0.3)',
                  boxShadow: '0 0 20px rgba(176, 38, 255, 0.2)',
                  transition: 'all 0.3s ease',
                }}
              >
                <Sparkles style={{ width: '18px', height: '18px', color: '#b026ff' }} />
              </div>
              <span 
                style={{
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  background: 'linear-gradient(135deg, #00ffff, #b026ff, #ff2d95)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(176, 38, 255, 0.5)',
                }}
              >
                NOVA
              </span>
            </Link>

            {/* Main Navigation - Neon Pill Style */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {navItems.map((item) => (
                <button
                  key={item.path}
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    ...(isActive(item.path)
                      ? {
                          background: 'linear-gradient(135deg, #b026ff, #ff2d95)',
                          color: 'white',
                          boxShadow: '0 0 20px rgba(176, 38, 255, 0.4), 0 0 40px rgba(255, 45, 149, 0.2)',
                        }
                      : {
                          background: 'transparent',
                          color: 'rgba(255, 255, 255, 0.6)',
                        }),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.background = 'rgba(176, 38, 255, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                  onClick={async () => navigate(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right side actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isAdmin && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    fontSize: '0.75rem',
                    color: '#22c55e',
                    fontWeight: 600,
                  }}
                >
                  <Shield style={{ width: '12px', height: '12px' }} />
                  Admin
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: '12px',
                  width: '40px',
                  height: '40px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  background: 'rgba(255, 255, 255, 0.03)',
                }}
                onClick={async () => navigate('/settings')}
              >
                <Settings style={{ width: '18px', height: '18px' }} />
              </Button>

              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px',
                    width: '40px',
                    height: '40px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                  onClick={async () => { await logout(); navigate('/'); }}
                  title="Logout"
                >
                  <LogOut style={{ width: '18px', height: '18px' }} />
                </Button>
              )}

              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Sub-header with system status - Neon accents */}
        <div 
          style={{ 
            padding: '10px 24px',
            borderTop: '1px solid rgba(176, 38, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div className="max-w-7xl mx-auto" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '0.75rem' }}>
              {/* Model Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: agentStatus?.ipc_connected ? '#22c55e' : '#eab308',
                  boxShadow: `0 0 10px ${agentStatus?.ipc_connected ? 'rgba(34, 197, 94, 0.6)' : 'rgba(234, 179, 8, 0.6)'}`,
                }} />
                <span style={{ color: '#b026ff', fontWeight: 600 }}>Model:</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{agentStatus?.active_model ?? 'Connecting...'}</span>
              </div>
              
              {/* Memory */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap style={{ width: '12px', height: '12px', color: '#22d3ee', opacity: 0.8 }} />
                <span style={{ color: '#22d3ee', fontWeight: 600 }}>Memory:</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{agentStatus?.memory_count ?? 0} entries</span>
              </div>
              
              {/* Context */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronRight style={{ width: '12px', height: '12px', color: '#ff2d95', opacity: 0.8 }} />
                <span style={{ color: '#ff2d95', fontWeight: 600 }}>Context:</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{agentStatus?.active_model?.includes('llama') ? '32K' : '128K'} tokens</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
              <span style={{ 
                padding: '4px 10px', 
                borderRadius: '8px', 
                background: 'rgba(176, 38, 255, 0.1)', 
                border: '1px solid rgba(176, 38, 255, 0.2)',
                color: '#b026ff',
                fontWeight: 500,
              }}>
                v1.1.0
              </span>
              <span>© 2026 Nova</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NovaNavBar;
