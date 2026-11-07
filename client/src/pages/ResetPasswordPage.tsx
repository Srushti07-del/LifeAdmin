import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No reset token provided. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, {
        password,
        confirmPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        'Failed to reset password. The link may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-force-light min-h-screen flex items-center justify-center bg-app px-4 relative overflow-hidden py-8">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md animate-fade-in relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-white font-bold text-xl shadow-elevated mb-4">
              <CheckCircle2 size={24} />
            </div>
            <h1 className="text-3xl font-bold font-editorial text-surface-900 tracking-tight">
              Password reset
            </h1>
            <p className="text-sm text-surface-600 mt-1.5 max-w-xs mx-auto">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-card border border-surface-200 text-center">
            <p className="text-xs text-surface-600 mb-6 leading-relaxed">
              Your reset token has been invalidated and cannot be reused.
            </p>

            <div className="space-y-3">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-primary-300 bg-primary-50 hover:bg-primary-100 text-primary-800 font-semibold text-xs transition-all duration-150 cursor-pointer"
              >
                <ArrowRight size={15} /> Go to Sign In
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center flex items-center justify-center gap-1.5 text-[11px] text-surface-500">
            <Sparkles size={12} className="text-primary-600" />
            <span>100% Free · Editorial Workspace · Privacy-focused</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-force-light min-h-screen flex items-center justify-center bg-app px-4 relative overflow-hidden py-8">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white font-bold text-xl shadow-elevated mb-4">
            <Lock size={20} />
          </div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 tracking-tight">
            Set new password
          </h1>
          <p className="text-sm text-surface-600 mt-1.5 max-w-xs mx-auto">
            Choose a new password for your LifeAdmin account.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-card border border-surface-200">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs animate-scale-in">
              {error}
              {!token && (
                <div className="mt-2">
                  <Link
                    to="/forgot-password"
                    className="font-semibold text-rose-900 underline hover:text-rose-950"
                  >
                    Request a new reset link
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reset-password"
                className="block text-xs font-semibold text-surface-800 mb-1.5"
              >
                New password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-surface-500 hover:text-surface-700 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-surface-500 mt-1">Must be at least 8 characters.</p>
            </div>

            <div>
              <label
                htmlFor="reset-confirm-password"
                className="block text-xs font-semibold text-surface-800 mb-1.5"
              >
                Confirm new password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Repeat your new password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-surface-500 hover:text-surface-700 transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition-all duration-150 shadow-sm cursor-pointer"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Reset password <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-xs text-surface-600">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-primary-700 hover:underline font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center flex items-center justify-center gap-1.5 text-[11px] text-surface-500">
          <Sparkles size={12} className="text-primary-600" />
          <span>100% Free · Editorial Workspace · Privacy-focused</span>
        </div>
      </div>
    </div>
  );
}
