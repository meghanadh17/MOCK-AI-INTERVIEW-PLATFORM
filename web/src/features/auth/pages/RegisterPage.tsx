import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { PasswordInput } from '../../../components/custom/PasswordInput';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { useAuthStore } from '../../../store/auth.store';
import { cn } from '@/lib/utils';
import { useRegister } from '../../../hooks/useAuthMutations';

type RoleType = 'Student' | 'Professional' | 'Career Changer';

export function RegisterPage() {
  const token = useAuthStore((state) => state.token);
  const registerMutation = useRegister();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleType>('Student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strengthScore, setStrengthScore] = useState(0);

  if (token) {
    return <Navigate to="/app/dashboard" replace />;
  }
  const [strengthLabel, setStrengthLabel] = useState('Weak');
  const loading = registerMutation.isPending;

  // Password Strength Meter logic
  useEffect(() => {
    let score = 0;
    if (!password) {
      setStrengthScore(0);
      setStrengthLabel('Weak');
      return;
    }

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    setStrengthScore(score);

    switch (score) {
      case 0:
      case 1:
        setStrengthLabel('Weak');
        break;
      case 2:
        setStrengthLabel('Fair');
        break;
      case 3:
        setStrengthLabel('Good');
        break;
      case 4:
        setStrengthLabel('Strong');
        break;
      default:
        setStrengthLabel('Weak');
    }
  }, [password]);

  const getStrengthColor = () => {
    switch (strengthLabel) {
      case 'Weak':
        return 'text-rose-500';
      case 'Fair':
        return 'text-amber-500';
      case 'Good':
        return 'text-blue-500';
      case 'Strong':
        return 'text-emerald-500';
      default:
        return 'text-rose-500';
    }
  };

  const getStrengthBgColor = (index: number) => {
    if (index >= strengthScore) return 'bg-bg-muted';
    switch (strengthLabel) {
      case 'Weak':
        return 'bg-rose-500';
      case 'Fair':
        return 'bg-amber-500';
      case 'Good':
        return 'bg-blue-500';
      case 'Strong':
        return 'bg-emerald-500';
      default:
        return 'bg-rose-500';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    registerMutation.mutate({
      email,
      password,
      full_name: fullName,
      role,
    });
  };

  return (
    <AuthLayout>
      <div className="text-left mb-4">
        <h2 className="text-lg sm:text-xl font-heading font-bold text-text-prim leading-snug">Create account</h2>
        <p className="text-text-sec text-[11px] mt-0.5">Start practicing with adaptive AI</p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Full Name */}
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="fullName" className="text-text-sec text-[11px] font-semibold font-sans">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Kim"
            disabled={loading}
            className="w-full h-9 bg-bg-base border border-border-def text-text-prim placeholder-[#52525B] rounded-lg px-3.5 text-xs font-sans transition-all duration-150 outline-none focus:border-border-strong focus:ring-[3px] focus:ring-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </div>

        {/* Email Address */}
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="email" className="text-text-sec text-[11px] font-semibold font-sans">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            disabled={loading}
            className="w-full h-9 bg-bg-base border border-border-def text-text-prim placeholder-[#52525B] rounded-lg px-3.5 text-xs font-sans transition-all duration-150 outline-none focus:border-border-strong focus:ring-[3px] focus:ring-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </div>

        {/* Role Selector */}
        <div className="flex flex-col gap-1 text-left select-none">
          <label className="text-text-sec text-[11px] font-semibold font-sans">
            I am registering as a
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Student', 'Professional', 'Career Changer'] as RoleType[]).map((r) => {
              const isActive = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  disabled={loading}
                  className={cn(
                    "h-8 px-1 text-[10px] font-semibold rounded-lg border transition-all text-center cursor-pointer select-none",
                    isActive
                      ? "bg-white/10 border-text-prim text-text-prim shadow-[0_0_12px_rgba(255,255,255,0.04)]"
                      : "bg-[#18181B] border-border-strong text-text-muted hover:text-text-sec hover:bg-bg-elevated/60"
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="password" className="text-text-sec text-[11px] font-semibold font-sans">
            Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="h-9 rounded-lg"
            required
          />
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="confirmPassword" className="text-text-sec text-[11px] font-semibold font-sans">
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="h-9 rounded-lg"
            required
          />
        </div>

        {/* Password Strength Meter */}
        {password && (
          <div className="flex flex-col gap-1 mt-0.5 select-none">
            <div className="flex justify-between items-center text-[9px] font-mono uppercase font-bold tracking-wider">
              <span className="text-text-muted">Strength</span>
              <span className={cn("transition-colors duration-150", getStrengthColor())}>
                {strengthLabel}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1 rounded-sm transition-all duration-300",
                    getStrengthBgColor(index)
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sign Up Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-9 bg-text-prim hover:bg-white hover:text-black text-bg-void font-bold text-xs rounded-lg border border-border-strong shadow-sm shadow-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-zinc-800 disabled:text-text-muted disabled:border-border-def disabled:cursor-not-allowed select-none mt-1"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>


      {/* Sign In Link */}
      <p className="text-center text-text-muted text-[11px] mt-4 select-none font-sans">
        Already have an account?{' '}
        <Link to="/login" className="text-text-prim hover:underline font-semibold transition-all duration-150">
          Sign in →
        </Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterPage;