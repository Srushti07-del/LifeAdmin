import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again or create an account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setGuestLoading(true);
    try {
      await loginAsGuest();
      navigate('/dashboard');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' ? 'Cannot reach server. Please check your connection.' : null) ||
        'Failed to start guest demo session.';
      setError(message);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="login-force-light min-h-screen flex items-center justify-center bg-app px-4 relative overflow-hidden">
      {/* Soft Ambient Radial Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white font-bold text-xl shadow-elevated mb-4">
            L
          </div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-surface-600 mt-1.5 max-w-xs mx-auto">
            Your life, organised. Your mind, uncluttered.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-card border border-surface-200">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs animate-scale-in">
              {error === 'Invalid email or password. Please try again or create an account.' ? (
                <>
                  Invalid email or password. Please try again or{' '}
                  <Link
                    to="/register"
                    className="text-rose-700 hover:underline font-medium"
                  >
                    create an account
                  </Link>
                  .
                </>
              ) : (
                error
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-surface-800 mb-1.5"
              >
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-surface-800"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-primary-700 hover:text-primary-800 hover:underline font-semibold"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-surface-500 hover:text-surface-700 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              id="login-submit"
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition-all duration-150 shadow-sm"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white px-3 text-surface-500">or explore first</span>
            </div>
          </div>

          {/* Explore as Guest Button */}
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading || guestLoading}
            id="explore-guest-btn"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-primary-300 bg-primary-50 hover:bg-primary-100 text-primary-800 font-semibold text-xs transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed group hover:shadow-card cursor-pointer"
          >
            {guestLoading ? (
              <Loader2 size={15} className="animate-spin text-primary-700" />
            ) : (
              <>
                <Sparkles size={15} className="text-primary-600 group-hover:scale-110 transition-transform duration-150" />
                <span>Explore LifeAdmin as Guest</span>
                <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200">
                  Instant Access
                </span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-surface-600">
          Don&apos;t have an account yet?{' '}
          <Link
            to="/register"
            className="text-primary-700 hover:underline font-semibold"
          >
            Create free account
          </Link>
        </p>

        {/* Brand Assurance */}
        <div className="mt-8 text-center flex items-center justify-center gap-1.5 text-[11px] text-surface-500">
          <Sparkles size={12} className="text-primary-600" />
          <span>100% Free · Editorial Workspace · Privacy-focused</span>
        </div>
      </div>
    </div>
  );
}
