import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataModeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Main Application with Sidebar & Header Layout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
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

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </DataModeProvider>
    </AuthProvider>
  );
};

export default App;
