import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataModeProvider } from './context/DataModeContext';
import { MainLayout } from './layouts/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { RiskLandscape } from './pages/RiskLandscape';
import { Assets } from './pages/Assets';
import { AssetDetail } from './pages/AssetDetail';
import { Services } from './pages/Services';
import { DataSources } from './pages/DataSources';
import { Vulnerabilities } from './pages/Vulnerabilities';
import { Controls } from './pages/Controls';
import { EvidenceCenter } from './pages/EvidenceCenter';
import { Scenarios } from './pages/Scenarios';
import { Investments } from './pages/Investments';
import { Optimization } from './pages/Optimization';
import { AIInsights } from './pages/AIInsights';
import { Compliance } from './pages/Compliance';
import { Reports } from './pages/Reports';
import { Models } from './pages/Models';
import { AuditTrail } from './pages/AuditTrail';
import { Settings } from './pages/Settings';

/**
 * Route guard that requires authentication (JWT or Firebase OAuth).
 * Redirects unauthenticated visitors to /login.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appUser, firebaseUser, loading } = useAuth();
  const token = localStorage.getItem('token');

  if (loading && !token && !appUser) {
    return (
      <div className="min-h-screen bg-[#06110B] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!appUser && !firebaseUser && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Route guard for public-only pages like /login.
 * Redirects already logged-in users directly to /dashboard.
 */
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appUser, firebaseUser, loading } = useAuth();
  const token = localStorage.getItem('token');

  if (loading && token) {
    return (
      <div className="min-h-screen bg-[#06110B] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (appUser || firebaseUser || token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataModeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Entry Point */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />

            {/* Root Entry Point: Redirects to dashboard if logged in, otherwise ProtectedRoute redirects to /login */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              }
            />

            {/* Protected Enterprise Application Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/risks" element={<RiskLandscape />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/assets/:id" element={<AssetDetail />} />
              <Route path="/services" element={<Services />} />
              <Route path="/data-sources" element={<DataSources />} />
              <Route path="/vulnerabilities" element={<Vulnerabilities />} />
              <Route path="/controls" element={<Controls />} />
              <Route path="/evidence" element={<EvidenceCenter />} />
              <Route path="/scenarios" element={<Scenarios />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/optimization" element={<Optimization />} />
              <Route path="/ai-insights" element={<AIInsights />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/models" element={<Models />} />
              <Route path="/audit" element={<AuditTrail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Fallback unknown routes */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </DataModeProvider>
    </AuthProvider>
  );
};

export default App;
