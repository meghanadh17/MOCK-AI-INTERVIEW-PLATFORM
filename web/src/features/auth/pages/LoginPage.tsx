import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { PasswordInput } from '../../../components/custom/PasswordInput';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { useAuthStore } from '../../../store/auth.store';
import { useLogin } from '../../../hooks/useAuthMutations';

export function LoginPage() {
  const token = useAuthStore((state) => state.token);
  const loginMutation = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (token) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    loginMutation.mutate({ email, password });
  };

  const loading = loginMutation.isPending;

  return (
    <AuthLayout>
      <div className="text-left mb-6">
        <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-prim leading-snug">Welcome back</h2>
        <p className="text-text-sec text-xs mt-1">Sign in to your account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email Address */}
        <div className="flex flex-col gap-1.5 text-left">
          <label htmlFor="email" className="text-text-sec text-xs font-semibold font-sans">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            disabled={loading}
            className="w-full h-10 bg-bg-base border border-border-def text-text-prim placeholder-[#52525B] rounded-lg px-3.5 text-sm font-sans transition-all duration-150 outline-none focus:border-border-strong focus:ring-[3px] focus:ring-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5 text-left relative">
          <div className="flex justify-between items-center w-full">
            <label htmlFor="password" className="text-text-sec text-xs font-semibold font-sans">
              Password
            </label>
            <Link
              to="/forgot"
              className="text-text-sec hover:text-text-prim text-xs font-semibold hover:underline font-sans cursor-pointer transition-colors duration-150"
            >
              Forgot?
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-9 bg-text-prim hover:bg-white hover:text-black text-bg-void font-bold text-xs rounded-lg border border-border-strong shadow-sm shadow-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-zinc-800 disabled:text-text-muted disabled:border-border-def disabled:cursor-not-allowed select-none mt-2"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      {/* Create Account Link */}
      <p className="text-center text-text-muted text-xs mt-6 select-none font-sans">
        Don't have an account?{' '}
        <Link to="/register" className="text-text-prim hover:underline font-semibold transition-all duration-150">
          Sign up →
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;