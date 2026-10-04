import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Shield, DollarSign, Database, 
  RotateCcw, Server, Activity, Sliders, Check, AlertTriangle,
  User as UserIcon, Save, Camera, Sparkles, Lock, KeyRound,
  Building, CheckCircle2, RefreshCw, Layers, ShieldCheck, Eye, EyeOff
} from 'lucide-react';
import { demoApi, authApi, healthApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { dataMode, refreshAll } = useDataMode();
  const { appUser, firebaseUser, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'organization' | 'calibration' | 'maintenance'>('profile');

  // Status banners
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // ── Tab 1: Profile & Identity State ───────────────────────────────────────
  const [fullName, setFullName] = useState(appUser?.full_name || firebaseUser?.displayName || 'Rajesh Sharma');
  const [role, setRole] = useState(appUser?.role || 'ciso');
  const [photoUrl, setPhotoUrl] = useState(appUser?.photo_url || firebaseUser?.photoURL || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar presets
  const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  ];

  useEffect(() => {
    if (appUser) {
      setFullName(appUser.full_name || appUser.display_name || '');
      setRole(appUser.role || 'ciso');
      setPhotoUrl(appUser.photo_url || '');
    } else if (firebaseUser) {
      setFullName(firebaseUser.displayName || '');
      setPhotoUrl(firebaseUser.photoURL || '');
    }
  }, [appUser, firebaseUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: fullName,
        role: role,
        photo_url: photoUrl,
      });
      showSuccess('Profile details successfully updated and persisted to database.');
    } catch (err: any) {
      showError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Tab 2: Security & Password State ──────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Password successfully updated and securely hashed in database.');
    } catch (err: any) {
      showError(err.response?.data?.detail || err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Tab 3: Organization Settings State ────────────────────────────────────
  const [orgName, setOrgName] = useState('Demo Financial Services Ltd.');
  const [orgIndustry, setOrgIndustry] = useState('Banking & Financial Services (RBI CSF / SEBI CSCRF)');
  const [orgCurrency, setOrgCurrency] = useState('INR');
  const [orgCurrencySymbol, setOrgCurrencySymbol] = useState('₹');
  const [orgBudget, setOrgBudget] = useState(5000000);
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    authApi.getOrganization().then((res) => {
      if (res.data) {
        setOrgName(res.data.name || 'Demo Financial Services Ltd.');
        setOrgIndustry(res.data.industry || 'Banking & Financial Services');
        setOrgCurrency(res.data.currency || 'INR');
        setOrgCurrencySymbol(res.data.currency_symbol || '₹');
        setOrgBudget(res.data.default_budget || 5000000);
      }
    }).catch(() => {});
  }, []);

  const handleCurrencyChange = (curr: string) => {
    setOrgCurrency(curr);
    if (curr === 'INR') setOrgCurrencySymbol('₹');
    else if (curr === 'USD') setOrgCurrencySymbol('$');
    else if (curr === 'EUR') setOrgCurrencySymbol('€');
  };

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      await authApi.updateOrganization({
        name: orgName,
        industry: orgIndustry,
        currency: orgCurrency,
        currency_symbol: orgCurrencySymbol,
        default_budget: Number(orgBudget),
      });
      showSuccess('Organization configuration saved and active across portfolio.');
      await refreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to update organization settings.');
    } finally {
      setSavingOrg(false);
    }
  };

  // ── Tab 4: Formula Calibration State ──────────────────────────────────────
  const [exposureWeight, setExposureWeight] = useState(0.35);
  const [criticalityWeight, setCriticalityWeight] = useState(0.40);
  const [controlDiscount, setControlDiscount] = useState(0.25);
  const [savingWeights, setSavingWeights] = useState(false);

  useEffect(() => {
    authApi.getCalibration().then((res) => {
      if (res.data?.weights) {
        setExposureWeight(res.data.weights.exposure_weight ?? 0.35);
        setCriticalityWeight(res.data.weights.criticality_weight ?? 0.40);
        setControlDiscount(res.data.weights.control_discount ?? 0.25);
      }
    }).catch(() => {});
  }, []);

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWeights(true);
    try {
      await authApi.updateCalibration({
        exposure_weight: exposureWeight,
        criticality_weight: criticalityWeight,
        control_discount: controlDiscount,
      });
      showSuccess('Mathematical formula weights updated and persisted to database.');
      await refreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to update risk calibration.');
    } finally {
      setSavingWeights(false);
    }
  };

  // ── Tab 5: Maintenance & Telemetry State ──────────────────────────────────
  const [resetting, setResetting] = useState(false);
  const [dbHealth, setDbHealth] = useState<'OK' | 'CHECKING' | 'ERROR'>('CHECKING');

  useEffect(() => {
    healthApi.check().then(() => setDbHealth('OK')).catch(() => setDbHealth('ERROR'));
  }, []);

  const handleResetDemo = async () => {
    if (!confirm('Reset all synthetic demo data back to clean baseline state (risk score 61.0)?')) return;
    setResetting(true);
    try {
      await demoApi.resetBaseline();
      showSuccess('Demo environment successfully reset to 61.0 baseline state.');
      await refreshAll();
    } catch (e: any) {
      showError('Error resetting demo state: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[rgba(74,222,128,0.12)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
              <SettingsIcon className="w-5 h-5 text-[#4ADE80]" />
              SYSTEM CONFIGURATION &amp; USER PROFILE
            </h1>
            <DataModeBadge mode={dataMode} />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            User Account Settings • Database Auth &amp; Password • Mathematical Multipliers • Organization Calibration
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#4ADE80] font-mono flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-[#22C55E] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-mono flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-[rgba(74,222,128,0.12)] pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-[#22C55E] text-[#06110B] shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-[#0D1B12] text-slate-300 hover:text-white border border-[rgba(74,222,128,0.1)]'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          User Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'security'
              ? 'bg-[#22C55E] text-[#06110B] shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-[#0D1B12] text-slate-300 hover:text-white border border-[rgba(74,222,128,0.1)]'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Security &amp; Password
        </button>
        <button
          onClick={() => setActiveTab('organization')}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'organization'
              ? 'bg-[#22C55E] text-[#06110B] shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-[#0D1B12] text-slate-300 hover:text-white border border-[rgba(74,222,128,0.1)]'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          Organization
        </button>
        <button
          onClick={() => setActiveTab('calibration')}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'calibration'
              ? 'bg-[#22C55E] text-[#06110B] shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-[#0D1B12] text-slate-300 hover:text-white border border-[rgba(74,222,128,0.1)]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Formula Calibration
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'maintenance'
              ? 'bg-[#22C55E] text-[#06110B] shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-[#0D1B12] text-slate-300 hover:text-white border border-[rgba(74,222,128,0.1)]'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Maintenance &amp; Health
        </button>
      </div>

      {/* TAB 1: User Profile Settings */}
      {activeTab === 'profile' && (
        <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(74,222,128,0.1)]">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
                <UserIcon className="w-4 h-4 text-[#4ADE80]" />
                Personal Profile &amp; Role Identity
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Identity details stored in Neon PostgreSQL / SQLite database
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 uppercase">
              Provider: {appUser?.provider || (firebaseUser ? 'Google OAuth' : 'Database Password')}
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Avatar Selection */}
            <div className="p-4 rounded-xl bg-[#102417] border border-[rgba(74,222,128,0.1)] space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={fullName}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-[#22C55E]/40 shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-[#06110B] font-extrabold text-xl shadow-lg">
                      {fullName ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'CISO'}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <div className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                    <span>{fullName || 'User'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 uppercase">
                      {role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    {appUser?.email || firebaseUser?.email || 'ciso@demofinancial.com'}
                  </p>
                  <p className="text-[11px] text-emerald-400/80 font-mono">
                    Account ID: <code className="text-slate-300">{appUser?.id || 'demo-user-ciso'}</code>
                  </p>
                </div>
              </div>

              {/* Avatar Presets */}
              <div className="pt-3 border-t border-[rgba(74,222,128,0.08)]">
                <div className="text-[11px] font-mono text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4ADE80]" />
                  Quick Avatar Presets:
                </div>
                <div className="flex items-center gap-3">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoUrl(preset)}
                      className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                        photoUrl === preset ? 'border-[#22C55E] scale-105 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="px-2.5 py-1 text-[10px] font-mono rounded bg-cyber-panel border border-cyber-border text-slate-300 hover:text-white"
                  >
                    Clear Photo
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Full Display Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Platform Role &amp; Decision Authority</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="ciso">CISO (Chief Information Security Officer)</option>
                  <option value="analyst">Cyber Risk Analyst</option>
                  <option value="auditor">Compliance &amp; Governance Auditor</option>
                  <option value="admin">System Security Administrator</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Custom Avatar Image URL (HTTPS)</label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[rgba(74,222,128,0.1)]">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-black font-bold font-mono text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {savingProfile ? 'Saving Details...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Security & Password Management */}
      {activeTab === 'security' && (
        <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(74,222,128,0.1)]">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
                <Lock className="w-4 h-4 text-[#4ADE80]" />
                Security &amp; Password Management
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Update account password stored securely with PBKDF2/SHA256 password hashing
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-mono text-[11px]">Current Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password (e.g. DemoPassword2026!)"
                  className="w-full p-2.5 pr-10 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)] text-[11px] text-slate-400 font-mono space-y-1">
              <div className="font-semibold text-emerald-300">Security Best Practices:</div>
              <div>• Use at least 8 alphanumeric characters with mixed casing.</div>
              <div>• Passwords are salted and cryptographically hashed before storing in the database.</div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[rgba(74,222,128,0.1)]">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-black font-bold font-mono text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {savingPassword ? 'Updating Password...' : 'Update & Hash Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Organization Settings */}
      {activeTab === 'organization' && (
        <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(74,222,128,0.1)]">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
                <Building className="w-4 h-4 text-[#4ADE80]" />
                Organization &amp; Financial Scope
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure corporate legal name, industry regulatory domain, currency formatting, and budget limits
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveOrganization} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Organization Legal Entity</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  placeholder="e.g. Demo Financial Services Ltd."
                  className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Industry Sector &amp; Regulatory Framework</label>
                <input
                  type="text"
                  value={orgIndustry}
                  onChange={(e) => setOrgIndustry(e.target.value)}
                  required
                  placeholder="e.g. Banking & Financial Services (RBI CSF / SEBI CSCRF)"
                  className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Active Financial Currency</label>
                <select
                  value={orgCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="INR">Indian Rupee (INR ₹ / Lakh / Crore)</option>
                  <option value="USD">US Dollar (USD $ / Millions)</option>
                  <option value="EUR">Euro (EUR € / Millions)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono text-[11px]">Default Optimization Budget Ceiling ({orgCurrencySymbol})</label>
                <input
                  type="number"
                  value={orgBudget}
                  onChange={(e) => setOrgBudget(Number(e.target.value))}
                  min={100000}
                  step={100000}
                  required
                  className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[rgba(74,222,128,0.1)]">
              <button
                type="submit"
                disabled={savingOrg}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-black font-bold font-mono text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {savingOrg ? 'Saving Settings...' : 'Save Organization Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Formula Calibration */}
      {activeTab === 'calibration' && (
        <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(74,222,128,0.1)]">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
                <Sliders className="w-4 h-4 text-[#4ADE80]" />
                Continuous Risk Mathematical Calibration
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Formula: <code className="text-emerald-400 font-mono">Risk = (Likelihood × Impact) / 100 × (1 + Exposure × W_exp) × (1 - Mitigation × W_ctrl)</code>
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveWeights} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2 p-4 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)]">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] text-slate-200 font-bold">External Exposure Weight</label>
                  <span className="font-mono text-emerald-400 font-bold">{exposureWeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.05"
                  value={exposureWeight}
                  onChange={(e) => setExposureWeight(parseFloat(e.target.value))}
                  className="w-full accent-[#22C55E]"
                />
                <span className="text-[10px] text-slate-400 block font-mono">Internet perimeter exposure multiplier</span>
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)]">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] text-slate-200 font-bold">Asset Criticality Weight</label>
                  <span className="font-mono text-emerald-400 font-bold">{criticalityWeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.05"
                  value={criticalityWeight}
                  onChange={(e) => setCriticalityWeight(parseFloat(e.target.value))}
                  className="w-full accent-[#22C55E]"
                />
                <span className="text-[10px] text-slate-400 block font-mono">Tier 1 critical infrastructure weighting</span>
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)]">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] text-slate-200 font-bold">Control Mitigation Floor</label>
                  <span className="font-mono text-emerald-400 font-bold">{controlDiscount.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.50"
                  step="0.05"
                  value={controlDiscount}
                  onChange={(e) => setControlDiscount(parseFloat(e.target.value))}
                  className="w-full accent-[#22C55E]"
                />
                <span className="text-[10px] text-slate-400 block font-mono">Residual defense dampening floor</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[rgba(74,222,128,0.1)]">
              <button
                type="submit"
                disabled={savingWeights}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-black font-bold font-mono text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                {savingWeights ? 'Updating Calibration...' : 'Save Calibration Weights'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: Maintenance & Health Diagnostics */}
      {activeTab === 'maintenance' && (
        <div className="space-y-5">
          {/* Health Diagnostics */}
          <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-[#4ADE80]" />
              Database &amp; Real-Time Telemetry Health
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)]">
                <div className="text-slate-400 text-[10px]">Backend Database</div>
                <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  {dbHealth === 'OK' ? 'Connected & Healthy' : 'Checking...'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)]">
                <div className="text-slate-400 text-[10px]">Real-Time WebSockets</div>
                <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  Active / Streaming
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)]">
                <div className="text-slate-400 text-[10px]">Decision Optimizer</div>
                <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  Google OR-Tools MIP
                </div>
              </div>
            </div>
          </div>

          {/* Reset Baseline */}
          <div className="rounded-xl p-6 bg-[#0D1B12] border border-amber-500/30 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              Demo Environment Reset &amp; Recalibration
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Restore Payment Gateway Switch, vulnerabilities, and global risk score back to original 61.0 baseline.
              Use this before evaluation sessions to reset live telemetry injects.
            </p>

            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="px-5 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {resetting ? 'Resetting Baseline State...' : 'Reset Demo to Baseline State (61.0)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
