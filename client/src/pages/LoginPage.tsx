import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const isDev = import.meta.env.DEV;
      const message =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK' ? 'Cannot reach server. Is the backend running?' : null) ||
        'Login failed. Please try again.';
      setError(isDev ? `[DEV] ${message}` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2F2F2F] px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#383838] border border-[#505050] shadow-lg mb-4">
            <span className="text-[#F5F3EE] font-bold text-xl">L</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F5F3EE]">Welcome back</h1>
          <p className="text-[#85827C] mt-1">Sign in to your LifeAdmin account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#383838] rounded-2xl p-8 shadow-elevated border border-[#505050]">
          {error && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-sm animate-scale-in">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[#85827C] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#85827C]" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] focus:outline-none focus:ring-2 focus:ring-[#505050] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[#85827C] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#85827C]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] focus:outline-none focus:ring-2 focus:ring-[#505050] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#85827C] hover:text-[#F5F3EE] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            id="login-submit"
            className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#414141] hover:bg-[#505050] text-[#F5F3EE] border border-[#505050] disabled:opacity-60 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-sm"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Sign in <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-[#85827C]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#F5F3EE] hover:underline font-medium transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
