import React from 'react';
import { motion } from 'framer-motion';
import { Logo } from '../custom/Logo';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="h-screen w-full bg-bg-void text-text-prim flex flex-col md:flex-row relative select-none font-sans overflow-hidden">
      
      {/* Animating background glows */}
      <motion.div 
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -40, 50, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed pointer-events-none rounded-full blur-[120px] opacity-[0.08] z-0"
        style={{
          top: '-200px',
          right: '-200px',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, var(--color-auth) 0%, transparent 70%)'
        }}
      />
      <motion.div 
        animate={{
          x: [0, -80, 50, 0],
          y: [0, 60, -30, 0],
          scale: [1, 0.9, 1.12, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed pointer-events-none rounded-full blur-[100px] opacity-[0.04] z-0"
        style={{
          top: '30%',
          left: '-200px',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, var(--color-video) 0%, transparent 70%)'
        }}
      />

      {/* Left Column: Details (hidden on mobile, visible on md+) */}
      <div className="hidden md:flex md:w-1/2 h-full flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-[#0c0d12] via-[#040508] to-[#010204] border-r border-border-def relative overflow-hidden shrink-0 z-10 select-none">
        
        {/* Animated ambient glowing spots restricted inside the left panel */}
        <motion.div 
          animate={{
            x: [-40, 80, -60, -40],
            y: [-60, 40, -20, -60],
            scale: [1, 1.2, 0.9, 1]
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-12 -left-12 w-96 h-96 rounded-full blur-[110px] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 pointer-events-none z-0"
        />
        <motion.div 
          animate={{
            x: [60, -40, 40, 60],
            y: [40, -80, 20, 40],
            scale: [1, 0.95, 1.15, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-16 -right-16 w-[450px] h-[450px] rounded-full blur-[130px] bg-gradient-to-br from-blue-500/8 to-teal-500/8 pointer-events-none z-0"
        />

        {/* Graph-paper coordinate grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-80 z-0" />
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 relative z-10">
          <Logo size={28} className="text-text-prim shrink-0 transition-transform duration-300 hover:scale-105" />
          <span className="font-mono text-sm font-bold tracking-tight text-text-prim">MockAI</span>
        </div>

        {/* Content stack */}
        <div className="my-auto py-6 relative z-10 flex flex-col gap-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-heading font-extrabold tracking-tight leading-tight text-text-prim">
              Shatter your tech interviews with adaptive AI.
            </h1>
            <p className="text-text-sec text-xs sm:text-sm max-w-md mt-3.5 leading-relaxed font-sans">
              Analyze your resume for ATS compatibility, practice in low-latency voice environments, and receive instant camera posture, gaze, and WPM analytics on a clean monochrome workspace.
            </p>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-text-muted text-[10px] font-mono flex items-center justify-between relative z-10 border-t border-border-def/50 pt-4">
          <span>&copy; {new Date().getFullYear()} MockAI.</span>
          <span>Surgical Assessment Platform v1.0</span>
        </div>

      </div>

      {/* Right Column: Form Container (centered card style) */}
      <div className="w-full md:w-1/2 h-full flex items-center justify-center p-4 sm:p-8 relative z-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-[440px] bg-bg-surface border border-border-def rounded-2xl p-6 sm:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.7)] my-auto flex flex-col relative"
        >
          {children}
        </motion.div>
      </div>

    </div>
  );
}