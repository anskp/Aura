import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/user/LoginPage';
import RegisterPage from './pages/user/RegisterPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserDashboard from './pages/user/UserDashboard';
import AssetDashboard from './pages/user/AssetDashboard';
import AssetOnboardingPage from './pages/user/AssetOnboardingPage';
import Marketplace from './pages/user/Marketplace';
import PortfolioWallet from './pages/user/PortfolioWallet';
import Discover from './pages/user/Discover';
import AssetDetailsPage from './pages/user/AssetDetailsPage';
import P2PMarket from './pages/user/P2PMarket';
import AccountSettings from './pages/user/AccountSettings';
import Sidebar from './components/Sidebar';
import AgentChatModal from './components/AgentChatModal';
import './index.css';

const Header = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="h-24 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md flex items-center justify-between px-12 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold tracking-tight mb-0 bg-none text-slate-900 dark:text-white bg-clip-border text-fill-current">{title}</h2>
      </div>
      <div className="flex items-center gap-10">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          <input
            className="pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm w-72 focus:ring-2 focus:ring-primary/50 transition-all mb-0"
            placeholder="Search assets or pools..."
            type="text"
          />
        </div>

        {user && (
          <button
            type="button"
            onClick={() => window.location.href = '/settings'}
            className="p-0 m-0 bg-transparent border-none cursor-pointer text-primary hover:text-emerald-600 transition-colors w-auto"
            aria-label="Identity settings"
          >
            <span className="material-symbols-outlined text-2xl">fingerprint</span>
          </button>
        )}

        <button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all w-auto bg-transparent border-none cursor-pointer">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-background-dark"></span>
        </button>
      </div>
    </header>
  );
};

const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  const getTitle = (path) => {
    if (path === '/dashboard') return 'Overview';
    if (path === '/portfolio') return 'Portfolio & Wallet';
    if (path === '/marketplace') return 'Marketplace';
    if (path === '/p2p') return 'P2P Market';
    if (path === '/discover') return 'Discover';
    if (path.startsWith('/asset/')) return 'Asset Details';
    if (path === '/assets') return 'Asset Management';
    if (path === '/assets/onboard') return 'Onboard Asset';
    if (path === '/settings') return 'Settings';
    if (path === '/admin') return 'Admin Dashboard';
    return 'Dashboard';
  };

  if (!user) return children;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto bg-background-light dark:bg-background-dark">
        <Header title={getTitle(location.pathname)} />
        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
      <button
        type="button"
        onClick={() => setIsAgentOpen(true)}
        className="fixed right-6 bottom-6 z-[60] h-14 w-14 rounded-full bg-primary text-white border-none shadow-xl shadow-primary/30 cursor-pointer flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open Aura Agent"
      >
        <SmartToyIcon fontSize="medium" />
      </button>
      <AgentChatModal isOpen={isAgentOpen} onClose={() => setIsAgentOpen(false)} />
    </div>
  );
};

const ProtectedRoute = ({ children, adminOnly = false, userOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen font-bold text-primary">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/dashboard" />;
  if (userOnly && user.role === 'ADMIN') return <Navigate to="/admin" />;

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminOrUserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portfolio"
        element={
          <ProtectedRoute userOnly={true}>
            <PortfolioWallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AccountSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc"
        element={<Navigate to="/dashboard" />}
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute userOnly={true}>
            <AssetDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/onboard"
        element={
          <ProtectedRoute userOnly={true}>
            <AssetOnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute userOnly={true}>
            <Discover />
          </ProtectedRoute>
        }
      />
      <Route
        path="/asset/:assetId"
        element={
          <ProtectedRoute userOnly={true}>
            <AssetDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketplace"
        element={
          <ProtectedRoute userOnly={true}>
            <Marketplace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/p2p"
        element={
          <ProtectedRoute userOnly={true}>
            <P2PMarket />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

const AdminOrUserDashboard = () => {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <Navigate to="/admin" />;
  return <UserDashboard />;
};

export default App;
