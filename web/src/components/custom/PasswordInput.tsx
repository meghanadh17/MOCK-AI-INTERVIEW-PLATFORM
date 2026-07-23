import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative w-full flex items-center">
        <input
          type={showPassword ? 'text' : 'password'}
          className={cn(
            "w-full h-10 bg-bg-base border border-border-def text-text-prim placeholder-[#52525B] rounded-lg px-3.5 pr-10 text-sm font-sans transition-all duration-150 outline-none focus:border-border-strong focus:ring-[3px] focus:ring-white/5 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 p-1 rounded-md text-text-muted hover:text-text-prim hover:bg-bg-elevated/40 transition-colors cursor-pointer select-none"
        >
          {showPassword ? (
            <EyeOff className="size-4 shrink-0" />
          ) : (
            <Eye className="size-4 shrink-0" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
export default PasswordInput;