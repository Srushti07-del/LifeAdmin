import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import api from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep('sent');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        'Failed to process password reset request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (step === 'sent') {
    return (
      <div className="login-force-light min-h-screen flex items-center justify-center bg-app px-4 relative overflow-hidden py-8">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md animate-fade-in relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-white font-bold text-xl shadow-elevated mb-4">
              <Sparkles size={20} />
            </div>
            <h1 className="text-3xl font-bold font-editorial text-surface-900 tracking-tight">
              Reset email sent
            </h1>
            <p className="text-sm text-surface-600 mt-1.5 max-w-xs mx-auto">
              If an account exists for this email, you’ll receive a password reset link shortly.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-card border border-surface-200 text-center">
            <p className="text-xs text-surface-600 mb-6 leading-relaxed">
              Check your inbox (and spam folder) for the reset link. It expires in 30 minutes.
            </p>

            <div className="space-y-3">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-primary-300 bg-primary-50 hover:bg-primary-100 text-primary-800 font-semibold text-xs transition-all duration-150 cursor-pointer"
              >
                <ArrowRight size={15} /> Back to Sign In
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
            <Mail size={20} />
          </div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 tracking-tight">
            Forgot password
          </h1>
          <p className="text-sm text-surface-600 mt-1.5 max-w-xs mx-auto">
            Enter your email address and we’ll send you a link to reset your password.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-card border border-surface-200">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs animate-scale-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-xs font-semibold text-surface-800 mb-1.5"
              >
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition-all duration-150 shadow-sm"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Send reset link <ArrowRight size={15} />
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
