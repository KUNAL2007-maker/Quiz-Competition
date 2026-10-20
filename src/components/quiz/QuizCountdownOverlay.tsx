import React from 'react';
import { Terminal, Shield, Zap } from 'lucide-react';

interface QuizCountdownOverlayProps {
  value: number; // 3, 2, 1, or 0 ("GO")
}

export const QuizCountdownOverlay: React.FC<QuizCountdownOverlayProps> = ({ value }) => {
  const isGo = value === 0;

  const messages: Record<number, { title: string; subtitle: string }> = {
    3: {
      title: 'STAND BY: PROTOCOL 3',
      subtitle: 'CALIBRATING SECURE ENVIRONMENT & DISABLING EXTERNAL AIDS...',
    },
    2: {
      title: 'STAND BY: PROTOCOL 2',
      subtitle: 'ENFORCING ZERO-AI INTEGRITY & SECURING QUIZ WINDOW...',
    },
    1: {
      title: 'STAND BY: PROTOCOL 1',
      subtitle: 'DISPATCHING QUESTION PACKET TO OPERATIVE TERMINAL...',
    },
    0: {
      title: 'TERMINAL ARMED · GO!',
      subtitle: 'QUIZ COMMENCED — TIMER IS LIVE!',
    },
  };

  const currentMsg = messages[value] || messages[0];

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090D]/95 p-6 text-center backdrop-blur-md select-none"
    >
      <div className="relative flex flex-col items-center space-y-6 max-w-md">
        {/* Pulsing Target Ring */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-44 w-44 rounded-full border border-[#B6FF3B]/20 animate-ping" />
          <div className="absolute h-36 w-36 rounded-full border-2 border-[#B6FF3B]/40" />

          {/* Central Number Display */}
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#111722] border-2 border-[#B6FF3B] shadow-[0_0_50px_rgba(182,255,59,0.3)]">
            <span
              className={`font-display font-black tracking-tighter ${
                isGo ? 'text-4xl text-[#36F58A]' : 'text-6xl text-[#B6FF3B]'
              } animate-pulse`}
            >
              {isGo ? 'GO!' : value}
            </span>
          </div>
        </div>

        {/* Status Messaging */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#B6FF3B]/40 bg-[#B6FF3B]/10 px-3.5 py-1 font-mono text-xs font-bold text-[#B6FF3B]">
            {isGo ? <Zap className="h-3.5 w-3.5" /> : <Terminal className="h-3.5 w-3.5" />}
            <span>{currentMsg.title}</span>
          </div>

          <p className="font-mono text-xs text-[#929DAC] tracking-wider uppercase">
            {currentMsg.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
