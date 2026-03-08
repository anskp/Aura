import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/user/LoginPage';
import RegisterPage from './pages/user/RegisterPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import UserDashboard from './pages/user/UserDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AssetDashboard from './pages/user/AssetDashboard';
import AssetOnboardingPage from './pages/user/AssetOnboardingPage';
import Marketplace from './pages/user/Marketplace';
import PortfolioWallet from './pages/user/PortfolioWallet';
import AccountSettings from './pages/user/AccountSettings';
import Sidebar from './components/Sidebar';
import './index.css';

const Header = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold tracking-tight mb-0 bg-none text-slate-900 dark:text-white bg-clip-border text-fill-current">{title}</h2>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          <input
            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/50 transition-all mb-0"
            placeholder="Search assets or pools..."
            type="text"
          />
        </div>

        {/* Identity Status Badge */}
        {user && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            onClick={() => window.location.href = '/settings'}>
            <span className="material-symbols-outlined text-[18px] text-slate-500">fingerprint</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${user?.kycStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
              {user?.kycStatus === 'APPROVED' ? 'VERIFIED' : (user?.kycStatus || 'PENDING')}
            </span>
          </div>
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

  const getTitle = (path) => {
    if (path === '/dashboard') return 'Overview';
    if (path === '/portfolio') return 'Portfolio & Wallet';
    if (path === '/marketplace') return 'Marketplace';
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
    </div>
  );
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen font-bold text-primary">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/dashboard" />;

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
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portfolio"
        element={
          <ProtectedRoute>
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
          <ProtectedRoute>
            <AssetDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/onboard"
        element={
          <ProtectedRoute>
            <AssetOnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketplace"
        element={
          <ProtectedRoute>
            <Marketplace />
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

export default App;
