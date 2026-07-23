import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function OtpInput({ value, onChange, error }: OtpInputProps) {
  const inputsRef = useRef<HTMLInputElement[]>([]);
  const [otpArray, setOtpArray] = useState<string[]>(Array(6).fill(''));

  // Sync state if value changes externally
  useEffect(() => {
    const valString = value || '';
    const newOtp = Array(6).fill('');
    for (let i = 0; i < Math.min(6, valString.length); i++) {
      newOtp[i] = valString[i] || '';
    }
    setOtpArray(newOtp);
  }, [value]);

  const handleChange = (val: string, index: number) => {
    // Only accept numeric inputs
    if (val && !/^\d$/.test(val)) return;

    const newOtp = [...otpArray];
    newOtp[index] = val;
    setOtpArray(newOtp);
    const combinedVal = newOtp.join('');
    onChange(combinedVal);

    // Auto-focus next field
    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpArray[index] && index > 0) {
        // Focus previous input if current is empty and backspace pressed
        inputsRef.current[index - 1]?.focus();
        
        const newOtp = [...otpArray];
        newOtp[index - 1] = '';
        setOtpArray(newOtp);
        onChange(newOtp.join(''));
      } else {
        const newOtp = [...otpArray];
        newOtp[index] = '';
        setOtpArray(newOtp);
        onChange(newOtp.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pasteData)) return;

    const newOtp = [...otpArray];
    const pasteChars = pasteData.slice(0, 6).split('');
    for (let i = 0; i < 6; i++) {
      if (pasteChars[i]) {
        newOtp[i] = pasteChars[i];
      }
    }
    setOtpArray(newOtp);
    onChange(newOtp.join(''));

    // Focus last filled slot or the 6th slot
    const focusIndex = Math.min(5, pasteChars.length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="relative flex flex-col items-center">
      <style>{`
        @keyframes otp-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .otp-shake-anim {
          animation: otp-shake 0.4s ease-in-out;
        }
      `}</style>
      
      <div className={cn(
        "flex items-center justify-center gap-2.5",
        error && "otp-shake-anim"
      )}>
        {otpArray.map((digit, idx) => (
          <React.Fragment key={idx}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onPaste={handlePaste}
              ref={(el) => {
                if (el) inputsRef.current[idx] = el;
              }}
              className={cn(
                "w-12 h-14 bg-bg-base text-text-prim border text-center font-mono text-xl font-bold rounded-lg transition-all duration-150 outline-none",
                error 
                  ? "border-rose-500 ring-[3px] ring-rose-500/15 text-rose-400"
                  : "border-border-def focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              )}
            />
            {idx === 2 && (
              <span className="text-text-muted font-bold text-lg select-none px-1">·</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default OtpInput;