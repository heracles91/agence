import { Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileGate } from '@/components/MobileGate';
import { Login } from '@/pages/Login';
import { Prelaunch } from '@/pages/Prelaunch';
import { Dashboard } from '@/pages/Dashboard';
import { ClientProfile } from '@/pages/ClientProfile';
import { History } from '@/pages/History';
import { GameOver } from '@/pages/GameOver';
import { Admin } from '@/pages/Admin';
import { GamePhase } from 'agence-shared';

function PhaseRouter() {
  const { user } = useAuth();
  const { phase, loading } = useGame();

  if (user?.isAdmin) return <Navigate to="/admin" replace />;
  if (loading) return null;

  if (phase === GamePhase.PLAYING) return <Navigate to="/dashboard" replace />;
  if (phase === GamePhase.VICTORY || phase === GamePhase.DEFEAT) return <Navigate to="/gameover" replace />;
  return <Navigate to="/prelaunch" replace />;
}

// Guard : redirige vers /login si non authentifié
function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-agence-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Guard : redirige si non admin
function AdminGuard() {
  const { user } = useAuth();
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Wrapper qui applique MobileGate sur les pages nécessitant le desktop
function DesktopRequired({ children }: { children: React.ReactNode }) {
  return <MobileGate>{children}</MobileGate>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<AuthGuard />}>
        <Route path="/" element={<PhaseRouter />} />

        {/* Pages nécessitant un desktop */}
        <Route
          path="/prelaunch"
          element={<DesktopRequired><Prelaunch /></DesktopRequired>}
        />
        <Route
          path="/dashboard"
          element={<DesktopRequired><Dashboard /></DesktopRequired>}
        />

        {/* Pages lisibles sur mobile */}
        <Route path="/client" element={<ClientProfile />} />
        <Route path="/history" element={<History />} />
        <Route path="/gameover" element={<GameOver />} />

        {/* Admin */}
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

