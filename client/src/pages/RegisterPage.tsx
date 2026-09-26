import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      // Surface detailed errors for debugging; keep production clean
      const isDev = import.meta.env.DEV;
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.stack ||
        (err?.code === 'ERR_NETWORK' ? 'Cannot reach server. Is the backend running?' : null) ||
        'Registration failed. Please try again.';
      setError(isDev ? `[DEV] ${message}` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-primary-50/30 to-surface-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg mb-4">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Create your account</h1>
          <p className="text-surface-500 mt-1">Start managing your life responsibilities</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-900 rounded-2xl p-8 shadow-elevated border border-surface-200 dark:border-surface-800">
          {error && (
            <div className="mb-4 p-3 bg-danger-400/10 border border-danger-400/20 rounded-xl text-danger-600 dark:text-danger-400 text-sm animate-scale-in">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Full name
              </label>
              <div className="relative">
                <UserPlus size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            id="register-submit"
            className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Create account <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-surface-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
