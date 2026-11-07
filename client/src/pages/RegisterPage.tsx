import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      await register(name.trim(), email.trim(), password);
      // Trigger onboarding for new user
      localStorage.setItem('lifeadmin_show_onboarding', 'true');
      navigate('/dashboard');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' ? 'Cannot reach server. Please try again.' : null) ||
        'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isDuplicateEmail = error.toLowerCase().includes('already exists');

  return (
    <div className="login-force-light min-h-screen flex items-center justify-center bg-app px-4 relative overflow-hidden py-8">
      {/* Soft Ambient Radial Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-500 text-white font-bold text-xl shadow-elevated mb-4">
            L
          </div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 tracking-tight">
            Create your workspace
          </h1>
          <p className="text-xs text-surface-600 mt-1.5 max-w-xs mx-auto">
            Organize bills, deadlines, appointments and files in one calm place.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-card border border-surface-200">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs animate-scale-in">
              {isDuplicateEmail ? (
                <div>
                  <p className="font-medium text-surface-900 mb-2 leading-relaxed">
                    An account with this email already exists. Please sign in or reset your password.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800 underline"
                    >
                      Sign In &rarr;
                    </Link>
                    <span className="text-surface-400">·</span>
                    <Link
                      to="/forgot-password"
                      className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800 underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                </div>
              ) : (
                error
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-semibold text-surface-800 mb-1.5"
              >
                Full name
              </label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Maya Chen"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold text-surface-800 mb-1.5"
              >
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                <input
                  id="register-email"
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
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold text-surface-800 mb-1.5"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                <input
                  id="register-password"
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
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-xs font-semibold text-surface-800 mb-1.5"
              >
                Confirm password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Repeat your password"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              id="register-submit"
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition-all duration-150 shadow-sm cursor-pointer"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-surface-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-primary-700 hover:underline font-semibold"
          >
            Sign in
          </Link>
        </p>

        {/* Brand Assurance */}
        <div className="mt-8 text-center flex items-center justify-center gap-1.5 text-[11px] text-surface-500">
          <Sparkles size={12} className="text-primary-600" />
          <span>No credit card required · Free forever · Private</span>
        </div>
      </div>
    </div>
  );
}
