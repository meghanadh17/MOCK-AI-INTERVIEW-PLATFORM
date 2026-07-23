import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface QuizResultDonutProps {
  score: number; // 0 to 100
  correctCount: number;
  totalQuestions: number;
}

export function QuizResultDonut({ score, correctCount, totalQuestions }: QuizResultDonutProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // SVG circular properties
  const radius = 70;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  
  // Animation values
  const animatedScore = useMotionValue(0);
  const roundedScore = useTransform(animatedScore, (latest) => Math.round(latest));
  const strokeDashoffset = useTransform(animatedScore, (latest) => circumference - (latest / 100) * circumference);

  useEffect(() => {
    // Animate score count on mount
    const controls = animate(animatedScore, score, {
      duration: 1.5,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [score, animatedScore]);

  // Confetti trigger if score >= 80
  useEffect(() => {
    if (score < 80 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 400;

    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      gravity: number;
      rotation: number;
      rotationSpeed: number;
    }

    const colors = ['#10b981', '#6366f1', '#a1a1aa', '#3b82f6', '#ec4899', '#a855f7'];
    const particles: Particle[] = [];

    // Create particles from center radiating outwards
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed - 2, // lift slightly
        gravity: 0.15,
        rotation: Math.random() * 360,
        rotationSpeed: -4 + Math.random() * 8,
      });
    }

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let active = false;

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += p.gravity;
        p.rotation += p.rotationSpeed;

        // Render particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        // Keep running if particles are still on screen
        if (p.y < canvas.height && p.x > 0 && p.x < canvas.width) {
          active = true;
        }
      });

      if (active) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [score]);

  // Color mapping based on score
  const getScoreColor = (val: number) => {
    if (val >= 80) return '#10b981'; // emerald
    if (val >= 40) return '#6366f1'; // indigo
    return '#ef4444'; // rose
  };

  const scoreColor = getScoreColor(score);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-6">
      {/* Confetti Canvas */}
      {score >= 80 && (
        <canvas
          ref={canvasRef}
          className="absolute pointer-events-none z-10 w-[300px] h-[300px]"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      )}

      {/* SVG Donut */}
      <div className="relative size-[180px] flex items-center justify-center">
        <svg className="size-full -rotate-90">
          {/* Background track circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="#18181b"
            strokeWidth={strokeWidth}
          />
          {/* Animated score fill circle */}
          <motion.circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Labels */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline font-mono text-zinc-100">
            <motion.span className="text-4xl font-extrabold font-sans">
              {roundedScore}
            </motion.span>
            <span className="text-sm font-semibold opacity-60">/100</span>
          </div>
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">
            {correctCount} of {totalQuestions} Correct
          </span>
        </div>
      </div>
    </div>
  );
}