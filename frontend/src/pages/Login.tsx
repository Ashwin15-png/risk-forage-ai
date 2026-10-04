import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, ArrowRight, ShieldCheck, Zap, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('ciso@demofinancial.com');
  const [password, setPassword] = useState('DemoPassword2026!');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('analyst');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { loginWithCredentials, registerWithCredentials, signInWithGoogle, loading: googleLoading } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'login') {
        await loginWithCredentials(email, password);
      } else {
        await registerWithCredentials({
          email,
          password,
          full_name: fullName,
          role,
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  const handleDemoMode = async (demoRole: string) => {
    const demoEmail = `${demoRole}@demofinancial.com`;
    setEmail(demoEmail);
    setPassword('DemoPassword2026!');
    setLoading(true);
    setError('');
    try {
      await loginWithCredentials(demoEmail, 'DemoPassword2026!');
      navigate('/dashboard');
    } catch (err: any) {
      setError('Demo login error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06110B] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient glow - cyber green */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-green-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 text-black shadow-[0_0_30px_rgba(34,197,94,0.35)] mb-3">
            <ShieldAlert className="w-8 h-8 text-[#06110B]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
            RISKFORGE AI
          </h1>
          <p className="text-xs text-emerald-400/80 mt-1 font-mono">
            Continuous Cyber Risk Intelligence &amp; Investment Optimization
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-[#0D1B12]/90 border border-emerald-500/20 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          {/* Tabs: Sign In / Create Account */}
          <div className="flex border-b border-emerald-950/80 mb-5">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(''); }}
              className={`flex-1 pb-3 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'login'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setError(''); }}
              className={`flex-1 pb-3 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'register'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full mb-4 py-2.5 px-4 bg-white hover:bg-emerald-50 text-gray-800 font-semibold rounded-lg text-xs transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 border border-emerald-500/30 hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Signing in...' : 'Continue with Google OAuth'}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-emerald-950" />
            <span className="text-[10px] text-emerald-400/60 font-mono uppercase">
              {activeTab === 'login' ? 'or use database credentials' : 'or enter user details'}
            </span>
            <div className="flex-1 h-px bg-emerald-950" />
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            {activeTab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-emerald-200/80 mb-1 font-mono">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-emerald-500/60 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#06110B] border border-emerald-900/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono"
                      placeholder="e.g. Rajesh Sharma"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-emerald-200/80 mb-1 font-mono">
                    Platform Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-[#06110B] border border-emerald-900/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  >
                    <option value="analyst">Cyber Risk Analyst</option>
                    <option value="ciso">CISO (Chief Information Security Officer)</option>
                    <option value="auditor">Compliance & Governance Auditor</option>
                    <option value="admin">Security Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-emerald-200/80 mb-1 font-mono">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-emerald-500/60 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#06110B] border border-emerald-900/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono"
                  placeholder="name@demofinancial.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-200/80 mb-1 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-emerald-500/60 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#06110B] border border-emerald-900/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-xs transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 font-mono"
            >
              {loading
                ? 'Processing...'
                : activeTab === 'login'
                ? 'Sign In to RISKFORGE AI'
                : 'Create Platform Account'}
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </form>

          {/* Demo Mode Quick Access */}
          <div className="mt-5 pt-4 border-t border-emerald-950/80">
            <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              1-Click Evaluation Access:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoMode('ciso')}
                className="p-2 rounded-lg bg-[#06110B] hover:bg-[#132B1B] border border-emerald-900/60 text-xs text-left transition-all hover:border-emerald-500/50"
              >
                <div className="font-semibold text-emerald-100 font-mono text-[11px]">Enter as CISO</div>
                <div className="text-[9px] text-emerald-400/70 font-mono">Executive role</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoMode('analyst')}
                className="p-2 rounded-lg bg-[#06110B] hover:bg-[#132B1B] border border-emerald-900/60 text-xs text-left transition-all hover:border-emerald-500/50"
              >
                <div className="font-semibold text-emerald-100 font-mono text-[11px]">Enter as Analyst</div>
                <div className="text-[9px] text-emerald-400/70 font-mono">SecOps role</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-5 text-[11px] text-slate-500 font-mono">
          Demo Financial Services Ltd. • SIH 26105 Production Sandbox
        </div>
      </div>
    </div>
  );
};
