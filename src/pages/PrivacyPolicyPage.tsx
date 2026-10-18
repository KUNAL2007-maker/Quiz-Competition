import React from 'react';
import { Shield, Lock, FileText, CheckCircle, Mail, Globe, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
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
          <span>LEGAL COMPLIANCE & DATA PROTECTION</span>
        </div>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F0F3F7]">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs font-mono text-[#929DAC]">
          LAST UPDATED: OCTOBER 2026 · APPLIES GLOBALLY TO ALL TOURNAMENT PARTICIPANTS
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-6 text-sm text-[#929DAC] leading-relaxed">
        {/* Section 1 */}
        <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#F0F3F7] font-semibold text-base">
            <Globe className="h-4 w-4 text-[#B6FF3B]" />
            <h2>1. Overview & Scope</h2>
          </div>
          <p>
            Welcome to <strong className="text-[#F0F3F7]">Aegis Cipher Quiz Competition</strong> ("we", "our", or "us"). 
            We provide an online cybersecurity tournament and skill evaluation platform. This Privacy Policy outlines our transparent policies regarding the collection, use, and disclosure of personal data when you use our website, authenticate using Google or email accounts, and participate in timed cybersecurity quizzes.
          </p>
          <p>
            By accessing or using our platform, you agree to the collection and use of information in accordance with this policy. This policy is structured to fully comply with Google Hosting and Firebase Terms of Service, GDPR, and global data privacy standards.
          </p>
        </div>

        {/* Section 2 */}
        <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#F0F3F7] font-semibold text-base">
            <FileText className="h-4 w-4 text-[#B6FF3B]" />
            <h2>2. Information We Collect</h2>
          </div>
          <p>To operate fair, secure, and competitive tournaments, we collect the following minimum necessary categories of information:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm">
            <li>
              <strong className="text-[#F0F3F7]">Authentication Data:</strong> When signing in via Google Authentication or email registration, we receive your email address, unique Firebase User ID (UID), and basic verification metadata from Firebase Auth. We never receive or store your Google account password.
            </li>
            <li>
              <strong className="text-[#F0F3F7]">Competitor Profile Details:</strong> To participate in scored quizzes and claim prizes, participants supply their Full Legal Name and WhatsApp Contact Phone Number.
            </li>
            <li>
              <strong className="text-[#F0F3F7]">Randomly Assigned Callsign Avatar:</strong> Profile photos are system-generated and randomly assigned to prevent identity theft, adult content upload, or impersonation.
            </li>
            <li>
              <strong className="text-[#F0F3F7]">Quiz & Tournament Telemetry:</strong> Answers submitted, question response times, per-question timer telemetry, total score, and calculated accuracy percent are recorded on the competition ledger.
            </li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#F0F3F7] font-semibold text-base">
            <CheckCircle className="h-4 w-4 text-[#36F58A]" />
            <h2>3. Purpose of Collection & Winner Prize Delivery</h2>
          </div>
          <p>We use your collected personal information strictly for legitimate tournament operations:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm">
            <li>To verify identity and prevent duplicate accounts or cheating bots from taking quizzes.</li>
            <li>To rank participants on the public live leaderboard based on score and time taken.</li>
            <li>
              <strong className="text-[#36F58A]">Winner Contact & Award Delivery:</strong> When a participant achieves a winning rank in a competition, our event administrator uses the provided WhatsApp phone number and Email address to verify eligibility and coordinate the delivery of prizes, awards, or certificates.
            </li>
            <li>We <strong className="text-[#FF365B]">never sell, rent, or trade</strong> your personal information or contact details to third-party advertisers or telemarketers.</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#F0F3F7] font-semibold text-base">
            <Lock className="h-4 w-4 text-[#B6FF3B]" />
            <h2>4. Hosting Infrastructure & Data Security</h2>
          </div>
          <p>
            Our web application is hosted on Google Cloud Platform and Google Firebase infrastructure. All communications between your browser and our servers are encrypted using modern Transport Layer Security (TLS/HTTPS).
          </p>
          <p>
            Database access is strictly governed by Firebase Security Rules ensuring participants can only write to their own authorized profile and session records, while system-level tournament modifications require verified administrator credentials for <code className="text-[#B6FF3B]">checkship66@gmail.com</code> or <code className="text-[#B6FF3B]">hafizmujawar786@gmail.com</code>.
          </p>
        </div>

        {/* Section 5 */}
        <div className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#F0F3F7] font-semibold text-base">
            <Mail className="h-4 w-4 text-[#B6FF3B]" />
            <h2>5. Participant Rights & Contact Officer</h2>
          </div>
          <p>
            You have the right to request access to your personal data, rectify inaccurate details, or request full deletion of your profile and historical tournament scores from our database.
          </p>
          <p>
            For any privacy inquiries, data deletion requests, or tournament policy questions, you may contact the designated Data Administrators directly at:
          </p>
          <div className="rounded-lg border border-[#252D38] bg-[#07090D] p-3 text-xs font-mono text-[#F0F3F7] inline-block space-x-2">
            <span>Tournament Data Controllers:</span>
            <a href="mailto:checkship66@gmail.com" className="text-[#B6FF3B] underline">checkship66@gmail.com</a>
            <span className="text-[#929DAC]">·</span>
            <a href="mailto:hafizmujawar786@gmail.com" className="text-[#B6FF3B] underline">hafizmujawar786@gmail.com</a>
          </div>
        </div>
      </div>
    </div>
  );
};
