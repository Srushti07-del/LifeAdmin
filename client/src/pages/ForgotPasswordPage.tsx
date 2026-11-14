import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import api from '../lib/api';

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds client-side timeout

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setLoading(true);

    // Create an AbortController for guaranteed client-side timeout cancellation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      await api.post(
        '/auth/forgot-password',
        { email: trimmedEmail },
        {
          signal: controller.signal,
          timeout: REQUEST_TIMEOUT_MS,
        }
      );
      setStep('sent');
    } catch (err: any) {
      if (
        err?.name === 'CanceledError' ||
        err?.code === 'ECONNABORTED' ||
        err?.message?.toLowerCase().includes('timeout')
      ) {
        setError(
          'The request timed out. The server took too long to respond. Please check your internet connection and try again.'
        );
      } else if (err?.response?.status === 503) {
        setError(
          err?.response?.data?.message ||
          'Email service is temporarily unavailable. Please try again in a few moments.'
        );
      } else if (err?.response?.status === 504 || err?.response?.status === 502) {
        setError(
          'The email delivery server took too long to respond. Please try again in a few moments.'
        );
      } else if (err?.response?.status === 429) {
        setError(
          err?.response?.data?.message ||
          'Too many password reset requests. Please wait a few minutes before trying again.'
        );
      } else if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to process password reset request. Please check your connection and try again.');
      }
    } finally {
      clearTimeout(timeoutTimer);
      abortControllerRef.current = null;
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

              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setError('');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-surface-600 hover:text-surface-900 text-xs font-medium hover:bg-surface-50 transition-colors"
              >
                <RefreshCw size={13} /> Try another email address
              </button>
            </div>
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
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:bg-surface-50 disabled:text-surface-500 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition-all duration-150 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <>
                  <span>Send reset link</span> <ArrowRight size={15} />
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
      </div>
    </div>
  );
}
