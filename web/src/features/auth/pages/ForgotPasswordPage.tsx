import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { PasswordInput } from '../../../components/custom/PasswordInput';
import { OtpInput } from '../../../components/custom/OtpInput';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { useAuthStore } from '../../../store/auth.store';
import { cn } from '@/lib/utils';
import { useForgotPassword, useResetPassword } from '../../../hooks/useAuthMutations';

export function ForgotPasswordPage() {
  const token = useAuthStore((state) => state.token);
  const forgotPasswordMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();

  if (token) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strengthScore, setStrengthScore] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState('Weak');
  const [errorOtp, setErrorOtp] = useState(false);

  // Password strength logic
  useEffect(() => {
    let score = 0;
    if (!newPassword) {
      setStrengthScore(0);
      setStrengthLabel('Weak');
      return;
    }

    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

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
  }, [newPassword]);

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    forgotPasswordMutation.mutate(
      { email },
      {
        onSuccess: () => {
          setStep(2);
        }
      }
    );
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setErrorOtp(true);
      toast.error('Please enter a valid 6-digit code.');
      setTimeout(() => setErrorOtp(false), 500);
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    resetPasswordMutation.mutate(
      {
        email,
        otp,
        new_password: newPassword,
      },
      {
        onError: () => {
          setErrorOtp(true);
          setTimeout(() => setErrorOtp(false), 500);
        }
      }
    );
  };

  const loading = forgotPasswordMutation.isPending || resetPasswordMutation.isPending;

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

  return (
    <AuthLayout>
      <div className="text-left mb-6">
        <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-prim leading-snug">
          {step === 1 ? 'Reset password' : 'Enter code'}
        </h2>
        <p className="text-text-sec text-xs mt-1">
          {step === 1
            ? 'Enter your email and we\'ll send you a password recovery code'
            : `We sent a 6-digit password reset code to ${email}`}
        </p>
      </div>

      {step === 1 ? (
        /* STEP 1: Request Reset Form */
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-text-prim hover:bg-white hover:text-black text-bg-void font-bold text-xs rounded-lg border border-border-strong shadow-sm shadow-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-zinc-800 disabled:text-text-muted disabled:border-border-def disabled:cursor-not-allowed select-none mt-2"
          >
            {loading ? 'Sending Code...' : 'Send Reset Code'}
          </button>
        </form>
      ) : (
        /* STEP 2: Verify OTP & Input New Password Form */
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          {/* OTP Code Input */}
          <div className="flex flex-col gap-2.5 text-center my-2">
            <label className="text-text-sec text-xs font-semibold font-sans text-left">
              Verification code
            </label>
            <OtpInput value={otp} onChange={setOtp} error={errorOtp} />
          </div>

          {/* New Password */}
          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="newPassword" className="text-text-sec text-xs font-semibold font-sans">
              New password
            </label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          {/* Confirm New Password */}
          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="confirmPassword" className="text-text-sec text-xs font-semibold font-sans">
              Confirm new password
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          {/* Strength Meter */}
          {newPassword && (
            <div className="flex flex-col gap-1.5 mt-1 select-none">
              <div className="flex justify-between items-center text-[10px] font-mono uppercase font-bold tracking-wider">
                <span className="text-text-muted">Password Strength</span>
                <span className={cn("transition-colors duration-150", getStrengthColor())}>
                  {strengthLabel}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-text-prim hover:bg-white hover:text-black text-bg-void font-bold text-xs rounded-lg border border-border-strong shadow-sm shadow-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-zinc-800 disabled:text-text-muted disabled:border-border-def disabled:cursor-not-allowed select-none mt-2"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      )}

      {/* Back to Sign In */}
      <p className="text-center text-text-muted text-xs mt-6 select-none font-sans">
        Remember your password?{' '}
        <Link to="/login" className="text-text-prim hover:underline font-semibold transition-all duration-150">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;