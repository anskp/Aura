import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/user/LoginPage';
import RegisterPage from './pages/user/RegisterPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import UserDashboard from './pages/user/UserDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AssetDashboard from './pages/user/AssetDashboard';
import AssetOnboardingPage from './pages/user/AssetOnboardingPage';
import Marketplace from './pages/user/Marketplace';
import Navbar from './components/Navbar';
import './index.css';

const ProtectedRoute = ({ children, adminOnly = false, kycRequired = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/dashboard" />;

  if (kycRequired && user.kycStatus !== 'APPROVED') {
    // We can't easily show an alert here during render, so we'll just redirect
    // In a real app, we might use a toast or a query param
    return <Navigate to="/kyc" state={{ message: 'KYC required to access marketplace' }} />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
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
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
