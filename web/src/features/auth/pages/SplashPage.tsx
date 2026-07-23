import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Terminal, 
  Video, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  ChevronDown, 
  ArrowRight, 
  ArrowUpRight,
  Flame,
  Sparkles,
  Check,
  X 
} from 'lucide-react';
import { Logo } from '../../../components/custom/Logo';
import { useAuthStore } from '../../../store/auth.store';

export function SplashPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);

  // Sandbox simulation states
  const [activeSandboxRole, setActiveSandboxRole] = useState<'frontend' | 'backend' | 'ai'>('frontend');
  const [sandboxProgress, setSandboxProgress] = useState(0);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultScore, setResultScore] = useState(0);

  // Quiz simulation states
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // FAQ Accordion active indices
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // ATS simulation parameters
  const roleSpecs = {
    frontend: {
      title: 'Senior Frontend Engineer',
      target: 'Vercel',
      score: 94,
      skills: ['React 19', 'TypeScript 5.x', 'Tailwind CSS v4', 'Next.js App Router'],
      missing: ['Redux Toolkit', 'CSS Container Queries']
    },
    backend: {
      title: 'Backend Architect',
      target: 'Linear',
      score: 88,
      skills: ['PostgreSQL', 'Go / Golang', 'gRPC / Protobuf', 'Redis Caching'],
      missing: ['Kubernetes Operators', 'Apache Kafka']
    },
    ai: {
      title: 'AI / RAG Engineer',
      target: 'OpenAI',
      score: 81,
      skills: ['Vector Databases (Chroma)', 'Python / FastAPI', 'LangChain', 'OpenAI API'],
      missing: ['PyTorch Model Tuning', 'CUDA Kernel Optimization']
    }
  };

  const handleScroll = (e: MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const offset = 64;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const startSandboxAnalysis = () => {
    setSandboxRunning(true);
    setSandboxProgress(0);
    setShowResult(false);
    
    const duration = 1200;
    const intervalTime = 30;
    const step = 100 / (duration / intervalTime);
    
    const timer = setInterval(() => {
      setSandboxProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setSandboxRunning(false);
          setShowResult(true);
          
          let currentScore = 0;
          const targetScore = roleSpecs[activeSandboxRole].score;
          const scoreTimer = setInterval(() => {
            currentScore += 2;
            if (currentScore >= targetScore) {
              setResultScore(targetScore);
              clearInterval(scoreTimer);
            } else {
              setResultScore(currentScore);
            }
          }, 15);
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);
  };

  const handleQuizAnswer = (index: number) => {
    setSelectedAnswer(index);
    if (index === 1) {
      setQuizScore(100);
    } else {
      setQuizScore(0);
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // Companies logo wall marquee items
  const companies = [
    'OpenAI', 'Stripe', 'Linear', 'Vercel', 'Apple', 'GitHub', 'Slack',
    'OpenAI', 'Stripe', 'Linear', 'Vercel', 'Apple', 'GitHub', 'Slack'
  ];

  return (
    <div className="min-h-screen bg-bg-void text-text-prim flex flex-col relative select-none font-sans overflow-x-hidden">
      
      {/* 1. STICKY NAVBAR */}
      <nav className="h-16 border-b border-border-subtle bg-bg-base/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3">
          <Logo size={32} className="shrink-0 transition-transform duration-300 hover:scale-105" />
          <span className="font-heading font-bold text-lg text-text-prim tracking-tight">MockAI</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-text-sec">
          <a href="#features" onClick={(e) => handleScroll(e, 'features')} className="hover:text-text-prim transition-colors">Features</a>
          <a href="#sandbox" onClick={(e) => handleScroll(e, 'sandbox')} className="hover:text-text-prim transition-colors">Sandbox Simulator</a>
          <a href="#tech" onClick={(e) => handleScroll(e, 'tech')} className="hover:text-text-prim transition-colors">Architecture</a>
          <a href="#pricing" onClick={(e) => handleScroll(e, 'pricing')} className="hover:text-text-prim transition-colors">Pricing</a>
          <a href="#faq" onClick={(e) => handleScroll(e, 'faq')} className="hover:text-text-prim transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-4">
          {!token && (
            <Link 
              to="/login" 
              className="text-xs font-semibold text-text-sec hover:text-text-prim transition-colors cursor-pointer select-none"
            >
              Sign In
            </Link>
          )}
          <button 
            onClick={() => navigate(token ? '/app/dashboard' : '/register')}
            className="px-4 py-2 bg-text-prim hover:bg-white hover:text-black hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] text-bg-void text-xs font-bold rounded-lg border border-border-strong transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-white/5 select-none"
          >
            {token ? 'Launch Platform' : 'Get Started'} <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-16 px-6 max-w-5xl mx-auto flex flex-col items-center text-center space-y-8 z-10">
        
        {/* Subtle Spotlight Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-white/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Geometric Angular Mesh Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none" style={{ height: '700px' }}>
          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] w-[1400px] h-[900px]" viewBox="0 0 1400 900" fill="none">
            {/* Primary radiating lines from top center */}
            <line x1="700" y1="0" x2="300" y2="450" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <line x1="700" y1="0" x2="1100" y2="450" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <line x1="700" y1="0" x2="150" y2="650" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="700" y1="0" x2="1250" y2="650" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="700" y1="50" x2="450" y2="380" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="700" y1="50" x2="950" y2="380" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            
            {/* Left edge network */}
            <line x1="0" y1="80" x2="350" y2="300" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="0" y1="280" x2="400" y2="420" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="80" y1="0" x2="250" y2="500" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <line x1="0" y1="420" x2="300" y2="300" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="200" y1="0" x2="350" y2="300" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="0" y1="580" x2="250" y2="500" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            
            {/* Right edge network */}
            <line x1="1400" y1="80" x2="1050" y2="300" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="1400" y1="280" x2="1000" y2="420" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="1320" y1="0" x2="1150" y2="500" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <line x1="1400" y1="420" x2="1100" y2="300" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="1200" y1="0" x2="1050" y2="300" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="1400" y1="580" x2="1150" y2="500" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            
            {/* Cross connections forming mesh */}
            <line x1="350" y1="300" x2="700" y2="220" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="700" y1="220" x2="1050" y2="300" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="400" y1="420" x2="700" y2="370" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="700" y1="370" x2="1000" y2="420" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="300" y1="450" x2="450" y2="380" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="1100" y1="450" x2="950" y2="380" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="250" y1="500" x2="450" y2="600" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
            <line x1="1150" y1="500" x2="950" y2="600" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
            
            {/* Secondary detail lines */}
            <line x1="180" y1="150" x2="500" y2="220" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <line x1="1220" y1="150" x2="900" y2="220" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <line x1="500" y1="220" x2="700" y2="130" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="900" y1="220" x2="700" y2="130" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="350" y1="300" x2="150" y2="650" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <line x1="1050" y1="300" x2="1250" y2="650" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <line x1="450" y1="600" x2="700" y2="700" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
            <line x1="950" y1="600" x2="700" y2="700" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
            
            {/* Intersection node dots */}
            <circle cx="700" cy="220" r="2" fill="rgba(255,255,255,0.08)" />
            <circle cx="350" cy="300" r="1.5" fill="rgba(255,255,255,0.06)" />
            <circle cx="1050" cy="300" r="1.5" fill="rgba(255,255,255,0.06)" />
            <circle cx="400" cy="420" r="1.5" fill="rgba(255,255,255,0.05)" />
            <circle cx="1000" cy="420" r="1.5" fill="rgba(255,255,255,0.05)" />
            <circle cx="700" cy="370" r="1.5" fill="rgba(255,255,255,0.04)" />
            <circle cx="450" cy="380" r="1" fill="rgba(255,255,255,0.04)" />
            <circle cx="950" cy="380" r="1" fill="rgba(255,255,255,0.04)" />
            <circle cx="500" cy="220" r="1" fill="rgba(255,255,255,0.04)" />
            <circle cx="900" cy="220" r="1" fill="rgba(255,255,255,0.04)" />
            <circle cx="250" cy="500" r="1" fill="rgba(255,255,255,0.03)" />
            <circle cx="1150" cy="500" r="1" fill="rgba(255,255,255,0.03)" />
            <circle cx="700" cy="130" r="1" fill="rgba(255,255,255,0.05)" />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-3.5 py-1.5 bg-bg-surface border border-border-strong text-text-sec font-mono text-[10px] uppercase font-bold tracking-widest rounded-full flex items-center gap-1.5"
        >
          <Sparkles className="size-3 text-text-sec shrink-0" />
          Surgical Mock Assessment Platform v1.0
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-heading font-extrabold tracking-tight leading-none text-text-prim"
        >
          Shatter your tech interviews<br />
          with adaptive AI metrics.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-text-sec text-sm sm:text-base max-w-2xl leading-relaxed"
        >
          Analyze your PDF resume for keyword compatibility, practice in a low-latency voice environment, and get instant face-tracking posture, gaze direction, and WPM analytics on a clean monochrome interface.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto"
        >
          <button 
            onClick={() => navigate(token ? '/app/dashboard' : '/login')}
            className="w-full sm:w-auto px-6 py-3 bg-text-prim hover:bg-white hover:text-black hover:shadow-[0_0_18px_rgba(255,255,255,0.12)] text-bg-void font-semibold text-sm rounded-lg border border-border-strong transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-white/5"
          >
            Get Started Free <ArrowRight className="size-4" />
          </button>
          <a 
            href="#sandbox"
            onClick={(e) => handleScroll(e, 'sandbox')}
            className="w-full sm:w-auto px-6 py-3 bg-bg-surface border border-border-def hover:border-border-strong hover:bg-zinc-900 hover:text-text-prim font-semibold text-sm rounded-lg transition-all duration-200 text-center"
          >
            Run Sandbox Demo
          </a>
        </motion.div>

        {/* Dynamic Monochrome UI Preview Mockup */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full pt-10 select-none"
        >
          <div className="bg-bg-surface border border-border-def rounded-2xl shadow-2xl p-4 flex flex-col text-left gap-4 relative overflow-hidden">
            {/* Browser chrome bar */}
            <div className="flex items-center border-b border-border-subtle pb-3">
              <div className="flex gap-1.5 items-center">
                <div className="size-2.5 rounded-full bg-border-strong"></div>
                <div className="size-2.5 rounded-full bg-border-strong"></div>
                <div className="size-2.5 rounded-full bg-border-strong"></div>
              </div>
              <div className="flex items-center gap-1.5 ml-3">
                <span className="text-text-muted text-[10px]">▷</span>
                <span className="text-[10px] text-text-muted font-mono">mockai-sandbox-environment://localhost:3000</span>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-text-sec font-mono">Connected</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Voice Interview HUD */}
              <div className="border border-border-def bg-bg-base p-4 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">VOICE INTERVIEW HUD</span>
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-mono text-text-sec">Live</span>
                  </div>
                </div>
                <div className="flex items-end justify-center gap-[3px] h-16 px-1">
                  {[20,65,35,80,25,55,40,90,30,70,45,85,20,60,35,75,50,40,65,30,80,45,55,25,70,40,85,35,60,20].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ scaleY: [1, 0.3 + Math.random() * 0.7, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6 + i * 0.02, ease: "easeInOut" }}
                      className="w-[3px] bg-text-prim/90 rounded-full origin-bottom"
                      style={{ height: h + "%" }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center border-t border-border-subtle pt-2">
                  <div className="flex items-center gap-1.5 text-text-sec text-[10px] font-mono">
                    <span className="text-xs">🎤</span>
                    <span>Listening...</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">128ms</span>
                </div>
              </div>

              {/* Resume ATS Match */}
              <div className="border border-border-def bg-bg-base p-4 rounded-xl flex flex-col gap-3">
                <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">RESUME ATS MATCH</span>
                <div className="flex items-center gap-4">
                  <div className="relative size-20 shrink-0">
                    <svg className="size-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                      <circle cx="40" cy="40" r="34" fill="transparent" stroke="#FAFAFA" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="213.63" strokeDashoffset="17.09" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base font-mono font-bold text-text-prim">92%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[10px] font-mono text-text-sec">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                      <span>Keyword Match</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded-full border border-border-strong shrink-0" />
                      <span className="text-text-muted">Role Alignment</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                      <span>Experience Fit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                      <span>Skill Relevance</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Metric Gauge */}
              <div className="border border-border-def bg-bg-base p-4 rounded-xl flex flex-col gap-3">
                <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">SYSTEM METRIC GAUGE</span>
                <div className="space-y-2.5 mt-1">
                  {[
                    { label: "Posture", value: 92, display: "92%" },
                    { label: "Gaze Direction", value: 89, display: "89%" },
                    { label: "WPM", value: 100, display: "105" },
                    { label: "Speech Clarity", value: 94, display: "94%" },
                  ].map((metric, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-text-sec">{metric.label}</span>
                        <span className="text-text-prim font-bold">{metric.display}</span>
                      </div>
                      <div className="h-2 bg-bg-surface rounded-full overflow-hidden border border-border-subtle">
                        <div className="h-full bg-text-prim rounded-full transition-all" style={{ width: metric.value + "%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. LOGO CLOUD WALL / SOCIAL PROOF */}
      <section className="py-8 border-y border-border-subtle bg-bg-base/30 overflow-hidden relative">
        <div className="flex whitespace-nowrap">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            className="flex gap-20 text-xs font-mono font-bold tracking-widest text-text-muted select-none"
          >
            {companies.map((company, index) => (
              <span key={index} className="hover:text-text-prim transition-colors cursor-default">
                {company.toUpperCase()}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. PLATFORM CORE BLUEPRINTS (GRID OVERVIEW) */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-6 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-heading font-extrabold text-text-prim">
            Engineered for Precision, Sourced for Performance
          </h2>
          <p className="text-text-sec text-xs sm:text-sm max-w-xl mx-auto">
            MockAI replaces heavy visual clutter with sharp monochrome sandboxes that isolate your key performance dimensions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
          {[
            { 
              title: 'ATS Resume Auditor', 
              desc: 'Continuous keyword density evaluation, parsing metrics, and instant layout audit checklist.', 
              icon: <FileText className="size-5 text-text-sec" /> 
            },
            { 
              title: 'Adaptive Speech HUD', 
              desc: 'Low-latency voice detection measuring words-per-minute, filler intervals, and confidence scores.', 
              icon: <Cpu className="size-5 text-text-sec" /> 
            },
            { 
              title: 'Postural Lens Tracker', 
              desc: 'Gaze direction scanner and face positioning tracker for consistent delivery alignment.', 
              icon: <Video className="size-5 text-text-sec" /> 
            },
            { 
              title: 'Speed Code Challenges', 
              desc: 'Time-boxed interactive assessments mapping conceptual core language paradigms with global standings.', 
              icon: <Terminal className="size-5 text-text-sec" /> 
            }
          ].map((feat, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -2 }}
              className="p-6 bg-bg-surface border border-border-def hover:border-border-strong rounded-xl space-y-4 transition-all duration-200 cursor-default"
            >
              <div className="size-10 rounded-lg bg-bg-base border border-border-def flex items-center justify-center shrink-0">
                {feat.icon}
              </div>
              <h3 className="text-sm font-semibold text-text-prim font-heading">{feat.title}</h3>
              <p className="text-text-muted text-[11px] leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. INTERACTIVE ATS COMPATIBILITY SANDBOX */}
      <section id="sandbox" className="py-20 bg-bg-base/30 border-y border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 space-y-12 text-left">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-text-prim">
              ATS Matching Sandbox Simulator
            </h2>
            <p className="text-text-sec text-xs sm:text-sm max-w-xl mx-auto">
              Simulate our automatic parser algorithm on sample developer profile contexts.
            </p>
          </div>

          <div className="p-6 bg-bg-surface border border-border-def rounded-2xl flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-6 w-full">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-muted uppercase font-mono tracking-wider">Select Candidate Role Context</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(roleSpecs) as Array<keyof typeof roleSpecs>).map((roleKey) => (
                    <button
                      key={roleKey}
                      onClick={() => {
                        setActiveSandboxRole(roleKey);
                        setShowResult(false);
                        setSandboxProgress(0);
                      }}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer ${
                        activeSandboxRole === roleKey 
                          ? 'border-text-prim text-text-prim bg-bg-base' 
                          : 'border-border-def text-text-muted hover:text-text-sec hover:bg-bg-base'
                      }`}
                    >
                      {roleSpecs[roleKey].title.split(' ')[1] || roleSpecs[roleKey].title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-sec">Role: <strong className="text-text-prim">{roleSpecs[activeSandboxRole].title}</strong></span>
                  <span className="text-text-muted">Target Target: {roleSpecs[activeSandboxRole].target}</span>
                </div>
                
                <button
                  disabled={sandboxRunning}
                  onClick={startSandboxAnalysis}
                  className="w-full py-3 bg-text-prim hover:bg-white hover:text-black hover:shadow-[0_0_18px_rgba(255,255,255,0.12)] disabled:bg-zinc-700 disabled:text-text-muted text-bg-void font-bold text-xs rounded-lg border border-border-strong shadow transition-all cursor-pointer text-center"
                >
                  {sandboxRunning ? `Auditing Keywords... ${Math.floor(sandboxProgress)}%` : 'Execute Interactive Match'}
                </button>
              </div>

              {sandboxRunning && (
                <div className="h-1 bg-bg-base rounded-full overflow-hidden border border-border-subtle">
                  <motion.div 
                    className="h-full bg-text-prim" 
                    style={{ width: `${sandboxProgress}%` }} 
                  />
                </div>
              )}
            </div>

            <div className="w-full md:w-64 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-border-subtle pt-6 md:pt-0 md:pl-8 shrink-0 min-h-[160px]">
              {showResult ? (
                <div className="space-y-4 flex flex-col items-center text-center w-full">
                  <div className="relative size-28 flex items-center justify-center select-none">
                    <svg className="size-full transform rotate-180">
                      <circle cx="56" cy="56" r="40" className="stroke-border-subtle" strokeWidth="5" fill="transparent" />
                      <motion.circle 
                        cx="56" 
                        cy="56" 
                        r="40" 
                        className="stroke-text-prim" 
                        strokeWidth="5" 
                        fill="transparent" 
                        strokeDasharray={251}
                        initial={{ strokeDashoffset: 251 }}
                        animate={{ strokeDashoffset: 251 - (resultScore / 100) * 251 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="font-mono text-xl font-bold text-text-prim leading-none">{resultScore}%</span>
                      <span className="text-[7px] text-text-muted uppercase mt-0.5 tracking-wider font-bold">Compat score</span>
                    </div>
                  </div>

                  <div className="text-[10px] space-y-1 font-mono text-text-sec text-left w-full border-t border-border-subtle pt-2">
                    <p className="text-text-prim">Matched Keywords:</p>
                    <p className="text-text-muted truncate">{roleSpecs[activeSandboxRole].skills.slice(0, 3).join(', ')}</p>
                    <p className="text-text-prim mt-1">Missing Flags:</p>
                    <p className="text-text-muted truncate">{roleSpecs[activeSandboxRole].missing.join(', ')}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-text-muted text-xs p-6 font-mono border border-dashed border-border-strong rounded-xl w-full">
                  [Awaiting test trigger...]
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. DETAILED FEATURE 1: ATS RESUME PARSER AUDIT */}
      <section className="py-24 max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-left">
          <div className="size-10 rounded-lg bg-bg-surface border border-border-def flex items-center justify-center shrink-0">
            <FileText className="size-5 text-text-prim" />
          </div>
          <h3 className="text-2xl font-heading font-extrabold text-text-prim">
            Keyword Density Scan & ATS Score Auditing
          </h3>
          <p className="text-text-sec text-xs sm:text-sm leading-relaxed">
            Upload your resume PDF directly. Our system runs simulated ATS keyword matching matching technical indicators. It points out specific missing vocabulary tags and formats required to bypass baseline screening filters.
          </p>
          <ul className="space-y-2 text-xs text-text-sec">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-text-prim shrink-0" />
              <span>Full key-phrase extraction using NLP pipeline</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-text-prim shrink-0" />
              <span>Missing role context keyword recommendations</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-text-prim shrink-0" />
              <span>Structural layout parsing and warning logs</span>
            </li>
          </ul>
        </div>

        <div className="bg-bg-surface border border-border-def p-4 rounded-xl font-mono text-[10px] text-text-sec space-y-3 text-left relative overflow-hidden select-none">
          <div className="flex justify-between items-center border-b border-border-subtle pb-2 mb-2">
            <span className="text-text-prim uppercase font-bold">Parser Debug Shell</span>
            <span className="text-[8px] px-1.5 py-0.5 bg-bg-base border border-border-subtle text-text-muted rounded">JSON OUT</span>
          </div>
          <p className="text-text-muted">// parsing file software_engineer.pdf</p>
          <div className="space-y-1">
            <p><span className="text-text-prim">"candidate":</span> "Alex Kim",</p>
            <p><span className="text-text-prim">"target_role":</span> "Senior Software Engineer",</p>
            <p><span className="text-text-prim">"extracted_skills":</span> [</p>
            <p className="pl-4">"React 19", "TypeScript", "NodeJS", "Go", "Docker"</p>
            <p>],</p>
            <p><span className="text-text-prim">"warnings":</span> [</p>
            <p className="pl-4 text-amber-500">"Missing 'Next.js' in page 1 metadata",</p>
            <p className="pl-4 text-amber-500">"Layout uses nested multi-column frames"</p>
            <p>],</p>
            <p><span className="text-text-prim">"ats_score":</span> <span className="text-emerald-400 font-bold">84 / 100</span></p>
          </div>
          <div className="absolute bottom-2 right-2 w-16 h-16 opacity-5 bg-text-prim rounded-full"></div>
        </div>
      </section>

      {/* 7. DETAILED FEATURE 2: AI VOICE & SPEECH ANALYTICS SOUNDWAVE */}
      <section className="py-24 border-t border-border-subtle bg-bg-base/20">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 flex justify-center">
            {/* Animating Waveform SVG simulating speech feedback */}
            <div className="w-full max-w-md bg-bg-surface border border-border-def rounded-xl p-6 flex flex-col gap-6 text-left">
              <div className="flex justify-between items-center border-b border-border-subtle pb-3">
                <span className="text-[10px] font-mono font-bold text-text-muted uppercase">REAL-TIME PACING ANALYSIS</span>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              
              <div className="flex items-end justify-between h-20 px-2 gap-1 border-b border-dashed border-border-subtle pb-4">
                {[12, 24, 48, 32, 16, 28, 64, 80, 52, 28, 44, 76, 92, 56, 32, 48, 64, 40, 18, 12].map((height, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: [height - 6, height + 8, height] }}
                    transition={{ repeat: Infinity, duration: 1.2 + i * 0.05, ease: "easeInOut" }}
                    className="w-1.5 bg-text-prim rounded-full"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="border border-border-subtle p-2 rounded bg-bg-base">
                  <p className="text-[9px] text-text-muted uppercase">PACING</p>
                  <p className="text-text-prim font-bold mt-1">142 WPM</p>
                </div>
                <div className="border border-border-subtle p-2 rounded bg-bg-base">
                  <p className="text-[9px] text-text-muted uppercase">FILLER</p>
                  <p className="text-text-prim font-bold mt-1">3 / min</p>
                </div>
                <div className="border border-border-subtle p-2 rounded bg-bg-base">
                  <p className="text-[9px] text-text-muted uppercase">STRESS</p>
                  <p className="text-text-prim font-bold mt-1">Low</p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2 space-y-6 text-left">
            <div className="size-10 rounded-lg bg-bg-surface border border-border-def flex items-center justify-center shrink-0">
              <Cpu className="size-5 text-text-prim" />
            </div>
            <h3 className="text-2xl font-heading font-extrabold text-text-prim">
              Audio Waveform & Vocal Pacing Analytics
            </h3>
            <p className="text-text-sec text-xs sm:text-sm leading-relaxed">
              Answer simulated assessment questions live. Our algorithm converts voice streams on the client side, parsing pacing, recording structural filler patterns ("uh", "like"), and verifying answer confidence trends.
            </p>
            <ul className="space-y-2 text-xs text-text-sec">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-text-prim shrink-0" />
                <span>Immediate Words-Per-Minute assessment</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-text-prim shrink-0" />
                <span>Voice jitter and pausing interval detection</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-text-prim shrink-0" />
                <span>Post-session text transcripts and coaching summaries</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 8. DETAILED FEATURE 3: REAL-TIME VIDEO HUD MOCKUP */}
      <section className="py-24 max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-left">
          <div className="size-10 rounded-lg bg-bg-surface border border-border-def flex items-center justify-center shrink-0">
            <Video className="size-5 text-text-prim" />
          </div>
          <h3 className="text-2xl font-heading font-extrabold text-text-prim">
            Biometric Eye Gaze & Posture Coaching HUD
          </h3>
          <p className="text-text-sec text-xs sm:text-sm leading-relaxed">
            Position yourself in the camera feedback area. Our local browser model tracks facial alignment vectors and gaze vectors to ensure you retain active focus on the display and correct sitting posture under pressure.
          </p>
          <ul className="space-y-2 text-xs text-text-sec">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-text-prim shrink-0" />
              <span>Eye focus analytics tracking gaze alignment deviations</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-text-prim shrink-0" />
              <span>Facial landmark grid tracking shoulder and neck posture</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-text-prim shrink-0" />
              <span>Completely local tracking (no video streams upload to our server)</span>
            </li>
          </ul>
        </div>

        <div className="border border-border-def bg-bg-surface rounded-xl p-4 flex flex-col gap-4 text-left relative overflow-hidden select-none">
          <div className="flex justify-between items-center text-[10px] font-mono text-text-muted uppercase border-b border-border-subtle pb-2">
            <span>Video Focus Feed</span>
            <span className="text-emerald-400">Lock: True</span>
          </div>

          <div className="relative aspect-video bg-bg-base border border-border-subtle rounded-lg flex items-center justify-center overflow-hidden">
            {/* Scanline element */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 h-10 w-full animate-bounce"></div>
            
            {/* Mock camera landmarks wireframe */}
            <svg className="absolute inset-0 size-full opacity-35" viewBox="0 0 100 100">
              <line x1="10" y1="50" x2="90" y2="50" stroke="#FFF" strokeWidth="0.25" strokeDasharray="2" />
              <line x1="50" y1="10" x2="50" y2="90" stroke="#FFF" strokeWidth="0.25" strokeDasharray="2" />
              <circle cx="50" cy="45" r="15" fill="none" stroke="#FFF" strokeWidth="0.5" />
              <circle cx="45" cy="42" r="1.5" fill="#FFF" />
              <circle cx="55" cy="42" r="1.5" fill="#FFF" />
              <path d="M 43 53 Q 50 56 57 53" fill="none" stroke="#FFF" strokeWidth="0.5" />
            </svg>
            
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-[8px] font-mono text-text-sec border border-border-strong rounded flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-text-prim"></span> Face Landmark Matrix
            </div>
          </div>

          <div className="flex justify-between text-[10px] font-mono text-text-sec">
            <span>Gaze focus: 92%</span>
            <span>Tilt offset: -2.4°</span>
            <span>Posture: Optimal</span>
          </div>
        </div>
      </section>

      {/* 9. INTERACTIVE QUIZ SPEED SIMULATOR */}
      <section className="py-24 bg-bg-base/30 border-y border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 space-y-12 text-left">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-text-prim">
              Conceptual Quiz Speed Simulator
            </h2>
            <p className="text-text-sec text-xs sm:text-sm max-w-xl mx-auto">
              Test your core knowledge under pressure with our miniature quiz simulation.
            </p>
          </div>

          <div className="max-w-xl mx-auto bg-bg-surface border border-border-def rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
              <span>SECTION: JAVASCRIPT CONCURRENCY</span>
              <span>TIME LEFT: 00:14s</span>
            </div>

            <h3 className="text-sm font-bold text-text-prim font-heading">
              What is the output of `console.log(typeof NaN)` in Javascript?
            </h3>

            <div className="space-y-2">
              {[
                'undefined',
                'number',
                'object',
                'NaN'
              ].map((opt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuizAnswer(index)}
                  className={`w-full p-3 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer ${
                    selectedAnswer === index
                      ? index === 1
                        ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400'
                        : 'border-rose-500 bg-rose-500/5 text-rose-400'
                      : 'border-border-def text-text-sec hover:border-border-strong hover:bg-bg-base'
                  }`}
                >
                  {index + 1}. {opt}
                </button>
              ))}
            </div>

            {quizScore !== null && (
              <div className="text-center text-xs font-mono pt-2 border-t border-border-subtle">
                {quizScore === 100 ? (
                  <p className="text-emerald-400 flex items-center justify-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400 shrink-0" />
                    Correct! NaN is technically a number type in Javascript.
                  </p>
                ) : (
                  <p className="text-rose-400 flex items-center justify-center gap-1.5">
                    <X className="size-3.5 text-rose-400 shrink-0" />
                    Incorrect! NaN is technically of type "number".
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 10. SYSTEM ARCHITECTURE / UNDER THE HOOD */}
      <section id="tech" className="py-24 max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-left">
          <div className="size-10 rounded-lg bg-bg-surface border border-border-def flex items-center justify-center shrink-0">
            <Terminal className="size-5 text-text-prim" />
          </div>
          <h3 className="text-2xl font-heading font-extrabold text-text-prim">
            Zero-Latency Architecture
          </h3>
          <p className="text-text-sec text-xs sm:text-sm leading-relaxed">
            Our backend pipeline is built with speed as a core metric. We utilize local vector search indexing and optimized model weight context windows to deliver feedback under 200ms.
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-text-sec">
            <div className="border border-border-subtle p-3 rounded bg-bg-surface">
              <span className="text-[10px] text-text-muted block uppercase">LLM Latency</span>
              <span className="text-text-prim font-bold mt-1 block">~120ms average</span>
            </div>
            <div className="border border-border-subtle p-3 rounded bg-bg-surface">
              <span className="text-[10px] text-text-muted block uppercase">Embedding Size</span>
              <span className="text-text-prim font-bold mt-1 block">1,536 dimensions</span>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface border border-border-def rounded-xl p-4 font-mono text-[10px] text-text-sec text-left relative overflow-hidden select-none">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-2 text-text-muted uppercase">
            <span>RAG Query pipeline config</span>
            <span className="text-emerald-400">Live</span>
          </div>
          <pre className="overflow-x-auto">
{`{
  "rag_agent": {
    "embedding_model": "text-embedding-3-small",
    "vector_store": "chromadb",
    "distance_metric": "cosine",
    "retrieval_limit": 5,
    "prompt_template": {
      "system": "Grade candidate response precisely based on context",
      "context_window_tokens": 8192
    },
    "inference_options": {
      "temperature": 0.1,
      "max_tokens": 512
    }
  }
}`}
          </pre>
        </div>
      </section>

      {/* 11. DEVELOPER LEADERBOARDS & STREAK SECTION */}
      <section className="py-24 border-t border-border-subtle bg-bg-base/20">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 flex justify-center w-full">
            <div className="w-full max-w-md bg-bg-surface border border-border-def rounded-xl p-6 flex flex-col gap-4 text-left font-mono text-xs select-none">
              <div className="flex justify-between items-center text-[10px] text-text-muted uppercase border-b border-border-subtle pb-3">
                <span>STREAK CALENDAR & SCORES</span>
                <span className="text-text-prim font-bold flex items-center gap-1">
                  <Flame className="size-3.5 text-text-prim shrink-0 animate-pulse" /> 14 DAYS RUNNING
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <span key={idx} className="text-[10px] text-text-muted font-bold">{day}</span>
                ))}
                {Array.from({ length: 14 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`aspect-square rounded border ${
                      i < 12 
                        ? 'bg-text-prim border-text-prim' 
                        : 'bg-bg-base border-border-strong text-text-muted'
                    }`}
                  />
                ))}
              </div>

              <div className="border-t border-border-subtle pt-3 space-y-2">
                <p className="text-[10px] text-text-muted uppercase">ACTIVE PODIUM PLACEMENT</p>
                <div className="flex justify-between items-center bg-bg-base border border-border-subtle p-2 rounded">
                  <span>1. Sarah Jenkins</span>
                  <span className="text-text-prim font-bold">983 pts</span>
                </div>
                <div className="flex justify-between items-center bg-bg-base border border-border-subtle p-2 rounded">
                  <span>2. Alex Kim (You)</span>
                  <span className="text-text-prim font-bold">954 pts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2 space-y-6 text-left">
            <div className="size-10 rounded-lg bg-bg-surface border border-border-def flex items-center justify-center shrink-0">
              <Calendar className="size-5 text-text-prim" />
            </div>
            <h3 className="text-2xl font-heading font-extrabold text-text-prim">
              Gamified Streaks & Speed Challenge Leaderboards
            </h3>
            <p className="text-text-sec text-xs sm:text-sm leading-relaxed">
              Stay active and prepared daily. Earn preparation points through quick assessments, track consecutive preparation days, and benchmark yourself against developers globally.
            </p>
            <ul className="space-y-2 text-xs text-text-sec">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-text-prim shrink-0" />
                <span>Daily reminder indicators and status streaks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-text-prim shrink-0" />
                <span>Conceptual podiums mapping category standings</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-text-prim shrink-0" />
                <span>Shareable validation badges and score metrics</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 12. DEVELOPER TESTIMONIALS & REVIEWS */}
      <section className="py-24 max-w-6xl mx-auto px-6 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-heading font-extrabold text-text-prim">
            Preparation Verified by Developers
          </h2>
          <p className="text-text-sec text-xs sm:text-sm max-w-xl mx-auto">
            See how software engineers utilize MockAI to sharpen their conceptual accuracy and interview execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            {
              quote: "The speech pacing HUD completely altered how I formulate system design answers. I used to rush, but speaking at a solid 140 WPM made all the difference in my interviews.",
              author: "Marcus Chen",
              role: "Senior Software Engineer at Stripe",
              metric: "Streak: 18 Days"
            },
            {
              quote: "The ATS resume parser isolated three major framework keywords missing from my profile. After fixing those, my search response rate increased significantly.",
              author: "Sophia Alvarez",
              role: "Frontend Developer at Vercel",
              metric: "Score Index: 96%"
            },
            {
              quote: "Practicing the speed conceptual quizzes kept my computer science fundamentals incredibly sharp. Bypassed the initial screening test with ease.",
              author: "Liam Johnston",
              role: "Systems Architect at Linear",
              metric: "Placements: Top 5%"
            }
          ].map((item, idx) => (
            <div 
              key={idx}
              className="p-6 bg-bg-surface border border-border-def rounded-xl flex flex-col justify-between gap-6 hover:border-border-strong transition-colors cursor-default"
            >
              <p className="text-text-sec text-xs leading-relaxed">"{item.quote}"</p>
              <div className="border-t border-border-subtle pt-4 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-text-prim">{item.author}</h4>
                  <p className="text-[10px] text-text-muted">{item.role}</p>
                </div>
                <span className="text-[9px] font-mono border border-border-subtle bg-bg-base px-2 py-0.5 text-text-sec rounded">
                  {item.metric}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 13. MONOCHROME PRICING MATRIX */}
      <section id="pricing" className="py-24 bg-bg-base/30 border-y border-border-subtle">
        <div className="max-w-5xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-heading font-extrabold text-text-prim">
              SaaS Sandbox Pricing Matrix
            </h2>
            <p className="text-text-sec text-xs sm:text-sm max-w-xl mx-auto">
              Select your assessment depth. Free developer sandbox or custom AI metrics packages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto text-left">
            <div className="p-6 bg-bg-surface border border-border-def rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider block">Sandbox Basic</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-mono font-bold text-text-prim">$0</span>
                  <span className="text-xs text-text-muted">/ forever</span>
                </div>
                <p className="text-xs text-text-sec">Practice baseline mock interviews with standard metrics.</p>
                
                <ul className="space-y-2 text-[11px] text-text-sec leading-normal pt-4 border-t border-border-subtle">
                  <li className="flex gap-2 items-start">
                    <Check className="size-3 text-text-prim shrink-0 mt-0.5" />
                    <span>2 Resume ATS parser scans</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="size-3 text-text-prim shrink-0 mt-0.5" />
                    <span>5 AI speech interview rounds</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="size-3 text-text-prim shrink-0 mt-0.5" />
                    <span>Global developer standings leaderboard</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => navigate('/app/dashboard')}
                className="w-full py-2.5 bg-bg-base border border-border-def hover:bg-zinc-900 hover:border-border-strong text-text-sec hover:text-text-prim font-semibold text-xs rounded-lg transition-all duration-200 cursor-pointer text-center"
              >
                Access Free Sandbox
              </button>
            </div>

            <div className="p-6 bg-bg-surface border-2 border-text-prim rounded-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="absolute top-3 right-3 px-2 py-0.5 bg-text-prim text-bg-void font-mono text-[9px] uppercase font-bold rounded">
                Recommended
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-text-prim uppercase tracking-wider block">AI Pro Coach</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-mono font-bold text-text-prim">$20</span>
                  <span className="text-xs text-text-muted">/ month</span>
                </div>
                <p className="text-xs text-text-sec">Complete gaze postural analytics, unlimited parsing scans, and system architecture context mocks.</p>
                
                <ul className="space-y-2 text-[11px] text-text-sec leading-normal pt-4 border-t border-border-subtle">
                  <li className="flex gap-2 items-start">
                    <Check className="size-3 text-text-prim shrink-0 mt-0.5" />
                    <span>Infinite Resume analyses & storage</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="size-3 text-text-prim shrink-0 mt-0.5" />
                    <span>Live Camera posture HUD (gaze & tilt metrics)</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="size-3 text-text-prim shrink-0 mt-0.5" />
                    <span>Unlimited custom role autocomplete mock models</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <Check className="size-3 text-text-prim shrink-0 mt-0.5" />
                    <span>Performance improvement metrics reports</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => navigate('/app/dashboard')}
                className="w-full py-2.5 bg-text-prim hover:bg-white hover:text-black hover:shadow-[0_0_18px_rgba(255,255,255,0.12)] text-bg-void font-bold text-xs rounded-lg border border-border-strong shadow transition-all cursor-pointer text-center"
              >
                Unlock AI Pro Coach
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 14. FAQ ACCORDION & FOOTER */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-heading font-extrabold text-text-prim">
            Frequently Asked Queries
          </h2>
          <p className="text-text-sec text-xs sm:text-sm max-w-xl mx-auto">
            Answers to structural layout, pricing details, and performance queries.
          </p>
        </div>

        <div className="divide-y divide-border-subtle max-w-2xl mx-auto text-left border-y border-border-subtle">
          {[
            {
              q: "How does the posture tracking HUD operate?",
              a: "It runs entirely on client-side models inside your browser. No video streams are ever uploaded to our servers, preserving maximum data safety."
            },
            {
              q: "Is the ATS resume parser compatible with PDF formatting standards?",
              a: "Yes, our NLP pipeline extracts texts from standard multi-column and single-column PDF templates to verify compatibility indexes."
            },
            {
              q: "Can I customize the model context for specific company targets?",
              a: "Absolutely. Our Pro package allows targeting configurations (e.g. OpenAI, Stripe, Linear) which customizes the question depth parameters."
            },
            {
              q: "What is the expected latency for live audio transcription feedback?",
              a: "Transcriptions are buffered and analyzed locally and through low-latency inference pipelines, returning metrics under 200ms."
            },
            {
              q: "Can I test the leaderboard quizzes without an active subscription?",
              a: "Yes. Sandbox Basic candidates have full access to daily challenge leaderboards and CS conceptual quizzes for free."
            }
          ].map((faq, index) => (
            <div key={index} className="py-4">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex justify-between items-center text-xs font-bold text-text-prim hover:text-white transition-colors cursor-pointer py-2"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`size-4 text-text-muted transition-transform duration-200 ${activeFaq === index ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence initial={false}>
                {activeFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="text-[11px] text-text-sec leading-relaxed mt-2 pb-2">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 border-t border-border-subtle bg-bg-base/60 text-xs text-text-muted relative select-none">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="font-heading font-bold text-sm text-text-prim tracking-tight">MockAI</span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Precision mock assessments sandbox engineered for high-performance software developers.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-mono font-bold text-text-prim uppercase mb-3">Product</h4>
            <ul className="space-y-2 text-[10px]">
              <li><a href="#features" onClick={(e) => handleScroll(e, 'features')} className="hover:text-text-prim transition-colors">Features</a></li>
              <li><a href="#sandbox" onClick={(e) => handleScroll(e, 'sandbox')} className="hover:text-text-prim transition-colors">Sandbox Simulator</a></li>
              <li><a href="#pricing" onClick={(e) => handleScroll(e, 'pricing')} className="hover:text-text-prim transition-colors">Pricing Matrix</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-mono font-bold text-text-prim uppercase mb-3">Resources</h4>
            <ul className="space-y-2 text-[10px]">
              <li><a href="#tech" onClick={(e) => handleScroll(e, 'tech')} className="hover:text-text-prim transition-colors">Architecture Specs</a></li>
              <li><a href="#faq" onClick={(e) => handleScroll(e, 'faq')} className="hover:text-text-prim transition-colors">Frequently Asked Queries</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-[10px] font-mono font-bold text-text-prim uppercase mb-1">System Status</h4>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="size-2 rounded-full bg-emerald-500"></span>
              <span className="text-text-sec font-mono">All sandbox systems operational</span>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-6 border-t border-border-subtle pt-8 text-center flex flex-col md:flex-row justify-between items-center gap-4 text-[10px]">
          <p>© 2026 MockAI. All rights reserved. Built with surgical precision on carbon interfaces.</p>
          <div className="flex gap-4">
            <span className="hover:text-text-prim transition-colors cursor-pointer">Security Protocol</span>
            <span className="hover:text-text-prim transition-colors cursor-pointer">Privacy Guidelines</span>
          </div>
        </div>
      </footer>
    </div>
  );
}