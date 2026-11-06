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
        className="inline-flex items-center gap-2 rounded-md border border-[#252D38] bg-[#111722] px-3.5 py-2 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] hover:border-[#B6FF3B] transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="border-b border-[#252D38] pb-6">
        <div className="inline-flex items-center gap-2 rounded bg-[#B6FF3B]/10 border border-[#B6FF3B]/40 px-2.5 py-1 text-xs font-mono font-semibold text-[#B6FF3B]">
          <Shield className="h-3.5 w-3.5" />
          <span>CYBERSECURITY TOURNAMENT PLATFORM</span>
        </div>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F0F3F7]">
          About Null Origin
        </h1>
        <p className="mt-2 text-sm text-[#929DAC] max-w-2xl leading-relaxed">
          The premier competitive cybersecurity quiz competition platform engineered to test, rank, and reward elite offensive and defensive security operators.
        </p>
      </div>

      {/* Main Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-5 space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#B6FF3B]/40 bg-[#B6FF3B]/10 text-[#B6FF3B]">
            <Target className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-[#F0F3F7]">Mission-Grade Testing</h2>
          <p className="text-xs text-[#929DAC] leading-relaxed">
            Timed quizzes across Cryptography, Network Defense, Digital Forensics, and Application Security with deterministic per-question countdown timers.
          </p>
        </div>

        <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-5 space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#36F58A]/40 bg-[#36F58A]/10 text-[#36F58A]">
            <Award className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-[#F0F3F7]">Fair & Transparent Awards</h2>
          <p className="text-xs text-[#929DAC] leading-relaxed">
            Live rankings calculated without drift. Winners are verified via legal names, WhatsApp phone numbers, and registered Google emails for prompt award delivery.
          </p>
        </div>

        <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-5 space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#929DAC]/40 bg-[#111722] text-[#F0F3F7]">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-[#F0F3F7]">Equal Access for All</h2>
          <p className="text-xs text-[#929DAC] leading-relaxed">
            Zero barriers to entry. Browse scheduled competitions freely, authenticate with Google, and test your cyber aptitude on any device.
          </p>
        </div>
      </div>

      {/* Fair Play & Integrity Guidelines */}
      <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#252D38] pb-3">
          <CheckCircle2 className="h-5 w-5 text-[#36F58A]" />
          <h2 className="font-display text-lg font-bold text-[#F0F3F7]">
            Fair Play & Integrity Charter
          </h2>
        </div>
        <p className="text-xs text-[#929DAC] leading-relaxed">
          Every competition runs on strict anti-cheating protocols:
        </p>
        <ul className="space-y-2 text-xs text-[#929DAC]">
          <li className="flex items-start gap-2">
            <span className="text-[#B6FF3B] font-bold">01.</span>
            <span>Single account per operator. Multi-accounting or automated quiz submission scripts result in immediate disqualification.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#B6FF3B] font-bold">02.</span>
            <span>Per-question timers (default 15 seconds) enforce genuine rapid recall without external assistance.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#B6FF3B] font-bold">03.</span>
            <span>All answer keys are validated server-side by our Python calculation gateway and protected by Firebase Security Rules.</span>
          </li>
        </ul>
      </div>

      {/* Contact Organizers */}
      <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#F0F3F7] font-semibold text-base">
          <Mail className="h-4 w-4 text-[#B6FF3B]" />
          <h2>Contact Tournament Operations</h2>
        </div>
        <p className="text-xs text-[#929DAC] leading-relaxed">
          Have questions about an upcoming tournament, corporate sponsorships, or prize claims? Reach out to the event lead:
        </p>
        <div className="rounded-lg border border-[#252D38] bg-[#07090D] p-3 text-xs font-mono text-[#F0F3F7] inline-block space-x-2">
          <span>Official Contact:</span>
          <a href="mailto:checkship66@gmail.com" className="text-[#B6FF3B] underline">checkship66@gmail.com</a>
          <span className="text-[#929DAC]">·</span>
          <a href="mailto:hafizmujawar786@gmail.com" className="text-[#B6FF3B] underline">hafizmujawar786@gmail.com</a>
        </div>
      </div>
    </div>
  );
};
