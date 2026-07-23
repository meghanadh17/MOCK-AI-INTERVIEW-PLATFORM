import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { OtpInput } from '../../../components/custom/OtpInput';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { authApi } from '../../../api/auth.api';
import { useAuthStore } from '../../../store/auth.store';
import { useVerifyOtp } from '../../../hooks/useAuthMutations';

export function OtpVerificationPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const verifyOtpMutation = useVerifyOtp();

  if (token) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);
  const [errorOtp, setErrorOtp] = useState(false);
  
  // Timer settings
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!email) {
      toast.error('No email specified for verification. Redirecting...');
      navigate('/register');
    }
  }, [email, navigate]);

  // Resend Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    setCanResend(false);
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (otp.length !== 6) {
      setErrorOtp(true);
      toast.error('Please enter a valid 6-digit verification code.');
      setTimeout(() => setErrorOtp(false), 500);
      return;
    }

    verifyOtpMutation.mutate(
      { email, otp },
      {
        onError: () => {
          setErrorOtp(true);
          setTimeout(() => setErrorOtp(false), 500);
        }
      }
    );
  };

  // Auto trigger verification when 6 digits are typed
  useEffect(() => {
    if (otp.length === 6) {
      handleVerify();
    }
  }, [otp]);

  const handleResend = async () => {
    if (!canResend) return;

    setResending(true);
    try {
      await authApi.resendVerification({ email });
      toast.success('A new verification code has been sent.');
      setTimeLeft(60);
      setOtp('');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Resend failed. Try again later.';
      toast.error(errMsg);
    } finally {
      setResending(false);
    }
  };

  const loading = verifyOtpMutation.isPending || resending;

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <AuthLayout>
      <div className="text-left mb-6">
        <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-prim leading-snug">Check your email</h2>
        <p className="text-text-sec text-xs mt-1">
          We sent a 6-digit code to <strong className="text-text-prim">{email}</strong>
        </p>
      </div>

      {/* OTP Code Entry Form */}
      <form onSubmit={handleVerify} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <OtpInput value={otp} onChange={setOtp} error={errorOtp} />
        </div>

        {/* Verify CTA */}
        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full h-9 bg-text-prim hover:bg-white hover:text-black text-bg-void font-bold text-xs rounded-lg border border-border-strong shadow-sm shadow-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-zinc-800 disabled:text-text-muted disabled:border-border-def disabled:cursor-not-allowed select-none"
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>

      {/* Resend Code row */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-xs mt-6 select-none font-sans gap-2 w-full">
        <span className="text-text-muted">Didn't receive it?</span>
        {canResend ? (
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-text-prim font-semibold hover:underline cursor-pointer bg-transparent border-none outline-none p-0 transition-all duration-150"
          >
            Resend code
          </button>
        ) : (
          <span className="text-text-muted font-mono">
            Resend in <strong className="text-text-sec font-semibold">{formatTime(timeLeft)}</strong>
          </span>
        )}
      </div>

      {/* Back link */}
      <p className="text-center text-text-muted text-xs mt-6 select-none font-sans">
        Made a mistake?{' '}
        <Link to="/register" className="text-text-prim hover:underline font-semibold transition-all duration-150">
          Go back
        </Link>
      </p>
    </AuthLayout>
  );
}

export default OtpVerificationPage;