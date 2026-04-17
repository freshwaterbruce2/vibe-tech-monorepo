import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Badges from './app/routes/Badges';
import Dashboard from './app/routes/Dashboard';
import History from './app/routes/History';
import Login from './app/routes/Login';
import Quests from './app/routes/Quests';
import Shop from './app/routes/Shop';
import Award from './app/routes/admin/Award';
import AdminDashboard from './app/routes/admin/Dashboard';
import QuestsAdmin from './app/routes/admin/QuestsAdmin';
import Reports from './app/routes/admin/Reports';
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateUser = async () => {
      const token = window.electronAPI.store.get('token');
      if (token) {
        try {
          // Validate token and fetch user data
          const response = await fetch('http://localhost:3003/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            // Invalid token, clear it
            window.electronAPI.store.delete('token');
          }
        } catch (error) {
          console.error('Auth validation error:', error);
          window.electronAPI.store.delete('token');
        }
      }
      setLoading(false);
    };

    validateUser();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-dark">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎮</div>
          <h1 className="text-2xl font-bold text-blue-primary">VibeBlox</h1>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route
            path="/"
            element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/quests"
            element={user ? <Quests user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/shop"
            element={user ? <Shop user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/badges"
            element={user ? <Badges user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/history"
            element={user ? <History user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin"
            element={
              user?.role === 'parent' ? <AdminDashboard user={user} /> : <Navigate to="/" replace />
            }
          />
          <Route
            path="/admin/award"
            element={
              user?.role === 'parent' ? <Award user={user} /> : <Navigate to="/" replace />
            }
          />
          <Route
            path="/admin/quests"
            element={
              user?.role === 'parent' ? <QuestsAdmin user={user} /> : <Navigate to="/" replace />
            }
          />
          <Route
            path="/admin/reports"
            element={
              user?.role === 'parent' ? <Reports user={user} /> : <Navigate to="/" replace />
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
