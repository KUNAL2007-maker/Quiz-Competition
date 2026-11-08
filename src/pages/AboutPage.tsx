import React from 'react';
import { Shield, Target, Award, Users, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-6 sm:py-10">
      {/* Top Navigation */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-3.5 py-2 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] hover:border-[#7ab32e] transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="border-b border-[#2e2e2a] pb-6">
        <div className="inline-flex items-center gap-2 rounded bg-[#8dc63f]/10 border border-[#7ab32e]/40 px-2.5 py-1 text-xs font-mono font-semibold text-[#8dc63f]">
          <Shield className="h-3.5 w-3.5" />
          <span>ONLINE QUIZ COMPETITION PLATFORM</span>
        </div>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#f5f5f2]">
          About Null Origin
        </h1>
        <p className="mt-2 text-sm text-[#a8a8a2] max-w-2xl leading-relaxed">
          The premier competitive quiz tournament platform engineered to test, rank, and reward top minds across Technology, Science, Cybersecurity, and specialized academic arenas.
        </p>
      </div>

      {/* Main Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#7ab32e]/40 bg-[#8dc63f]/10 text-[#8dc63f]">
            <Target className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-[#f5f5f2]">High-Speed Competition</h2>
          <p className="text-xs text-[#a8a8a2] leading-relaxed">
            Rapid-fire timed quizzes across diverse knowledge domains with deterministic per-question countdown timers and anti-cheat proctoring.
          </p>
        </div>

        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#a4d65e]/40 bg-[#a4d65e]/10 text-[#a4d65e]">
            <Award className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-[#f5f5f2]">Fair & Transparent Awards</h2>
          <p className="text-xs text-[#a8a8a2] leading-relaxed">
            Live rankings calculated without drift. Competitors earn verified participation certificates and climb the persistent podium ledger.
          </p>
        </div>

        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#a8a8a2]/40 bg-[#1b1b19] text-[#f5f5f2]">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-[#f5f5f2]">Equal Access for All</h2>
          <p className="text-xs text-[#a8a8a2] leading-relaxed">
            Zero barriers to entry. Browse scheduled tournaments freely, authenticate with Google, and test your aptitude on mobile or desktop.
          </p>
        </div>
      </div>

      {/* Fair Play & Integrity Guidelines */}
      <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#2e2e2a] pb-3">
          <CheckCircle2 className="h-5 w-5 text-[#a4d65e]" />
          <h2 className="font-display text-lg font-bold text-[#f5f5f2]">
            Fair Play & Integrity Charter
          </h2>
        </div>
        <p className="text-xs text-[#a8a8a2] leading-relaxed">
          Every competition runs on strict anti-cheating protocols:
        </p>
        <ul className="space-y-2 text-xs text-[#a8a8a2]">
          <li className="flex items-start gap-2">
            <span className="text-[#8dc63f] font-bold">01.</span>
            <span>Single account per competitor. Multi-accounting or automated quiz submission scripts result in immediate disqualification.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#8dc63f] font-bold">02.</span>
            <span>Per-question timers enforce genuine rapid recall without external assistance.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#8dc63f] font-bold">03.</span>
            <span>All answer keys are validated server-side by our scoring gateway and protected by Firebase Security Rules.</span>
          </li>
        </ul>
      </div>

      {/* Contact Organizers */}
      <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#f5f5f2] font-semibold text-base">
          <Mail className="h-4 w-4 text-[#8dc63f]" />
          <h2>Contact Tournament Operations</h2>
        </div>
        <p className="text-xs text-[#a8a8a2] leading-relaxed">
          Have questions about an upcoming tournament, hosting a custom quiz, corporate sponsorships, or prize claims? Reach out to the event lead:
        </p>
        <div className="rounded-lg border border-[#2e2e2a] bg-[#111110] p-3 text-xs font-mono text-[#f5f5f2] inline-block space-x-2">
          <span>Official Contact:</span>
          <a href="mailto:contact@nullorigin.live" className="text-[#8dc63f] underline">contact@nullorigin.live</a>
        </div>
      </div>
    </div>
  );
};
