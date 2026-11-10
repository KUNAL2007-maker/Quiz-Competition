import React from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Award,
  CheckCircle2,
  Mail,
  ArrowLeft,
  Smartphone,
  Scale,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TermsPage: React.FC = () => {
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
          <FileText className="h-3.5 w-3.5" />
          <span>LEGAL AGREEMENT & TOURNAMENT RULES</span>
        </div>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#f5f5f2]">
          Terms & Conditions
        </h1>
        <p className="mt-2 text-sm text-[#a8a8a2] max-w-2xl leading-relaxed">
          Official tournament regulations, user participation agreement, integrity policies, and award terms for all competitions conducted on the Null Origin platform.
        </p>
        <p className="mt-2 font-mono text-xs text-[#a8a8a2]/70">
          Effective Date: January 1, 2026 · Last Updated: November 2026
        </p>
      </div>

      {/* Terms Content Sections */}
      <div className="space-y-6 text-sm text-[#a8a8a2] leading-relaxed">
        {/* Section 1 */}
        <section className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#f5f5f2] font-display font-semibold text-base border-b border-[#2e2e2a] pb-2">
            <ShieldCheck className="h-4 w-4 text-[#8dc63f]" />
            <h2>1. Acceptance of Terms & Eligibility</h2>
          </div>
          <p>
            By accessing or using <strong className="text-[#f5f5f2]">Null Origin</strong> (the "Platform", "we", "our", or "us"), you agree to be bound by these Terms & Conditions. If you do not agree to these terms, you must not access or participate in any quiz tournaments.
          </p>
          <p>
            Participation is open to eligible individuals worldwide. To enter any scored quiz competition, operators must maintain a <strong className="text-[#f5f5f2]">100% completed profile</strong>, including their Full Legal Name and a <strong className="text-[#8dc63f]">verified, valid WhatsApp contact phone number</strong>. Profiles containing random, fake, or dummy contact details are subject to immediate disqualification.
          </p>
        </section>

        {/* Section 2 */}
        <section className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#f5f5f2] font-display font-semibold text-base border-b border-[#2e2e2a] pb-2">
            <Smartphone className="h-4 w-4 text-[#8dc63f]" />
            <h2>2. WhatsApp Verification & Accurate Information</h2>
          </div>
          <p>
            Competitors must provide an authentic and currently reachable WhatsApp phone number. This number is strictly utilized by event administrators for:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
            <li>Identity and participant verification before leaderboard finalization.</li>
            <li>Direct communication with tournament winners to deliver prize money, rewards, and honors.</li>
            <li>Resolving certificate credential disputes and security checks.</li>
          </ul>
          <p className="text-xs text-[#e8c060]">
            Entering dummy sequences, sequential numbers (e.g. 1234567890), non-existent numbers, or another person's number without authorization will permanently forfeit any earned prize or certificate.
          </p>
        </section>

        {/* Section 3 */}
        <section className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#f5f5f2] font-display font-semibold text-base border-b border-[#2e2e2a] pb-2">
            <AlertTriangle className="h-4 w-4 text-[#e85a14]" />
            <h2>3. Single Attempt Rule & Proctoring Integrity</h2>
          </div>
          <p>
            Official competition rounds enforce a <strong className="text-[#f5f5f2]">strict single-attempt policy</strong> per competitor account. Once a tournament round has been initiated, competitors cannot restart, reset, or submit duplicate attempts.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg border border-[#2e2e2a] bg-[#111110] p-4 space-y-1.5">
              <h3 className="font-semibold text-xs text-[#f5f5f2]">Zero-AI & Anti-Cheat Protocols</h3>
              <p className="text-xs text-[#a8a8a2]">
                External AI tools, generative engines, automated scrapers, and assistive extensions are strictly prohibited during competition execution.
              </p>
            </div>
            <div className="rounded-lg border border-[#2e2e2a] bg-[#111110] p-4 space-y-1.5">
              <h3 className="font-semibold text-xs text-[#f5f5f2]">Tab-Switch Detection</h3>
              <p className="text-xs text-[#a8a8a2]">
                Focus tracking logs unfocused browser events. Navigating away from the quiz window triggers official warnings; excessive switches incur automatic disqualification.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#f5f5f2] font-display font-semibold text-base border-b border-[#2e2e2a] pb-2">
            <Scale className="h-4 w-4 text-[#8dc63f]" />
            <h2>4. Scoring, Telemetry & Final Standings</h2>
          </div>
          <p>
            Tournament standings are computed deterministically using speed-weighted accuracy models. Correct answers yield full domain points, with speed bonuses awarded based on elapsed answer time against the per-question countdown.
          </p>
          <p>
            Standings remain preliminary until administrative audit concludes. Null Origin organizers reserve the right to review anomalous telemetry, audit response timestamps, and adjust or remove disqualified records before publishing official Final Standings.
          </p>
        </section>

        {/* Section 5 */}
        <section className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#f5f5f2] font-display font-semibold text-base border-b border-[#2e2e2a] pb-2">
            <Award className="h-4 w-4 text-[#a4d65e]" />
            <h2>5. Certificates & Prize Distribution</h2>
          </div>
          <p>
            Every competitor who completes a tournament is awarded an official verifiable <strong className="text-[#f5f5f2]">Certificate of Participation</strong> or <strong className="text-[#f5f5f2]">Certificate of Excellence</strong>. Each certificate carries a cryptographically registered QR code resolvable via <code className="font-mono text-[#a4d65e]">https://www.nullorigin.live/verify/&lt;certId&gt;</code>.
          </p>
          <p>
            Prize winners will be reached via WhatsApp and the registered email address. Winners must acknowledge the notification and verify their payout details within <strong className="text-[#f5f5f2]">7 calendar days</strong>. Unclaimed prizes or participants failing identity verification may be forfeited or redistributed to the next ranked operative.
          </p>
        </section>

        {/* Section 6 */}
        <section className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#f5f5f2] font-display font-semibold text-base border-b border-[#2e2e2a] pb-2">
            <CheckCircle2 className="h-4 w-4 text-[#8dc63f]" />
            <h2>6. Intellectual Property & Fair Use</h2>
          </div>
          <p>
            All tournament questions, branding, graphics, 3D artwork, certificates, software code, and architecture on Null Origin are protected by intellectual property laws. Users may not reproduce, redistribute, republish, or commercially exploit quiz materials or question sets without express written permission from Team Null Origin.
          </p>
        </section>

        {/* Section 7 */}
        <section className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#f5f5f2] font-display font-semibold text-base border-b border-[#2e2e2a] pb-2">
            <Mail className="h-4 w-4 text-[#8dc63f]" />
            <h2>7. Contact & Dispute Resolution</h2>
          </div>
          <p>
            If you have questions, feedback, or require tournament dispute review regarding these Terms & Conditions, please contact the organizing committee directly:
          </p>
          <div className="pt-2">
            <a
              href="mailto:contact@nullorigin.live"
              className="inline-flex items-center gap-2 rounded-lg border border-[#7ab32e]/40 bg-[#8dc63f]/10 px-4 py-2 font-mono text-xs font-semibold text-[#8dc63f] hover:bg-[#8dc63f]/20 transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>contact@nullorigin.live</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
