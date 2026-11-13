import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Award,
  Trophy,
  Calendar,
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { certRegistry } from '../constants/certRegistry';
import { CertificateTemplate } from '../components/CertificateTemplate';
import { ExcellenceCertificateTemplate } from '../components/ExcellenceCertificateTemplate';
import leaderboardSeed from '../constants/leaderboardSeed.json';
import cyberDefenseSeed from '../constants/cyberDefenseSeed.json';
import {
  CYBER_QUIZ_COMP_ID,
  CYBER_QUIZ_TOP_WINNERS,
  CYBER_DEFENSE_COMP_ID,
  CYBER_DEFENSE_TOP_WINNERS,
} from '../constants/tournaments';

const REFERRAL_URL = 'https://agentrouter.org/register?aff=p772';

// Standard 1200x900 landscape certificate artwork
const CERT_W = 1200;
const CERT_H = 900;

function generateCertId(email: string, name: string, prefix = 'NO26-PRT'): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 900) + 100;
  const parts = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? 'X') + (parts[1]?.[0] ?? 'X')).toUpperCase();
  return `${prefix}-${num}-${initials}`;
}

export interface AttachedCertificate {
  id: string; // unique item id
  certId: string;
  recipientName: string;
  email: string;
  competitionId: string;
  competitionTitle: string;
  competitionEndedAt: string; // ISO date string used for chronological descending sort
  isLatest: boolean;
  certType: 'excellence' | 'participation';
  rank?: string;
  titleBadge?: string;
}

// Individual Certificate Component with local responsive preview and offscreen capture container
const CertificateItemCard: React.FC<{
  cert: AttachedCertificate;
  isRendering: boolean;
  onDownloadPNG: (cert: AttachedCertificate, node: HTMLElement | null) => Promise<void>;
  onDownloadPDF: (cert: AttachedCertificate, node: HTMLElement | null) => Promise<void>;
}> = ({ cert, isRendering, onDownloadPNG, onDownloadPDF }) => {
  const previewOuterRef = useRef<HTMLDivElement>(null);
  const captureNodeRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);

  useEffect(() => {
    const el = previewOuterRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / CERT_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cert]);

  const isExcellence = cert.certType === 'excellence';

  return (
    <div
      className={`rounded-xl border p-5 sm:p-6 space-y-4 shadow-xl transition-all ${
        isExcellence
          ? 'border-[#b38d3a]/60 bg-gradient-to-b from-[#211f18] to-[#1b1b19]'
          : 'border-[#2e2e2a] bg-[#1b1b19]'
      }`}
    >
      {/* Header with tournament timeline and status badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2e2e2a] pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {cert.isLatest ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8dc63f]/50 bg-[#8dc63f]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#8dc63f] uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-[#8dc63f] animate-pulse" />
                Latest Ended Competition
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2e2e2a] bg-[#111110] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#a8a8a2] uppercase tracking-wider">
                <Calendar className="h-3 w-3" />
                Previous Ended Competition
              </span>
            )}

            <span className="font-mono text-xs text-[#a8a8a2]">
              · {cert.competitionTitle}
            </span>
          </div>

          <h3 className="font-display text-base sm:text-lg font-bold text-[#f5f5f2] flex items-center gap-2">
            {isExcellence ? (
              <>
                <Trophy className="h-4 w-4 text-[#E6B450]" />
                <span>Certificate of Excellence — {cert.rank}</span>
              </>
            ) : (
              <>
                <Award className="h-4 w-4 text-[#8dc63f]" />
                <span>Certificate of Participation</span>
              </>
            )}
          </h3>
        </div>

        <div className="text-left sm:text-right font-mono text-xs text-[#a8a8a2]">
          <span className="block text-[10px] uppercase text-[#6f7d8c]">CREDENTIAL ID</span>
          <span className="font-bold text-[#8dc63f]">{cert.certId}</span>
        </div>
      </div>

      {/* Recipient Details & Verification Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#a8a8a2]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#8dc63f]" />
          <span>Issued to: <strong className="text-[#f5f5f2]">{cert.recipientName}</strong></span>
          <span className="text-[#6f7d8c]">({cert.email})</span>
        </div>
        {cert.titleBadge && (
          <span className="rounded bg-[#b38d3a]/20 border border-[#b38d3a]/50 px-2 py-0.5 text-[10px] font-bold text-[#E6B450]">
            {cert.titleBadge}
          </span>
        )}
      </div>

      {/* Certificate Scaled Preview */}
      <div className="overflow-hidden rounded-lg border border-[#2e2e2a] bg-[#151513]">
        <div
          ref={previewOuterRef}
          style={{ position: 'relative', width: '100%', height: CERT_H * scale, overflow: 'hidden' }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CERT_W,
              height: CERT_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <div style={{ width: CERT_W, height: CERT_H }}>
              {isExcellence ? (
                <ExcellenceCertificateTemplate
                  name={cert.recipientName}
                  certId={cert.certId}
                  rank={cert.rank || 'Honorable Laureate'}
                  eventTitle={cert.competitionTitle}
                  brandTop={118}
                />
              ) : (
                <CertificateTemplate
                  name={cert.recipientName}
                  certId={cert.certId}
                  eventTitle={cert.competitionTitle}
                  brandTop={118}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons for Download and Verification */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => onDownloadPNG(cert, captureNodeRef.current)}
          disabled={isRendering}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            isExcellence
              ? 'bg-[#e85a14] text-[#fff7f0] hover:bg-[#f06a2a]'
              : 'bg-[#8dc63f] text-[#141a09] hover:bg-[#a4d65e]'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>Download High-Res PNG</span>
        </button>

        <button
          type="button"
          onClick={() => onDownloadPDF(cert, captureNodeRef.current)}
          disabled={isRendering}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-5 py-3 text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            isExcellence
              ? 'border-[#e85a14]/60 bg-[#1b1b19] text-[#e85a14] hover:bg-[#e85a14]/10'
              : 'border-[#7ab32e]/60 bg-[#1b1b19] text-[#8dc63f] hover:bg-[#8dc63f]/10'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Download High-Res PDF</span>
        </button>

        <a
          href={`/verify/${cert.certId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2e2e2a] bg-[#111110] px-4 py-3 text-xs font-semibold text-[#a8a8a2] hover:text-[#f5f5f2] hover:border-[#7ab32e] transition-colors whitespace-nowrap"
        >
          <span>Verify Credential QR</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Hidden offscreen unscaled container for high-fidelity html2canvas capture */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -10000,
          top: 0,
          width: CERT_W,
          height: CERT_H,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div ref={captureNodeRef} style={{ width: CERT_W, height: CERT_H }}>
          {isExcellence ? (
            <ExcellenceCertificateTemplate
              name={cert.recipientName}
              certId={cert.certId}
              rank={cert.rank || 'Honorable Laureate'}
              eventTitle={cert.competitionTitle}
              brandTop={96}
            />
          ) : (
            <CertificateTemplate
              name={cert.recipientName}
              certId={cert.certId}
              eventTitle={cert.competitionTitle}
              brandTop={96}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const CertificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAppContext();

  const [emailInput, setEmailInput] = useState(() => currentUser?.email || '');
  const [isSearching, setIsSearching] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [certificates, setCertificates] = useState<AttachedCertificate[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Sync email input if currentUser changes and input is still empty
  useEffect(() => {
    if (currentUser?.email && !emailInput) {
      setEmailInput(currentUser.email);
    }
  }, [currentUser?.email]);

  // Execute lookup whenever the user submits or triggers search
  const handleFind = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const queryEmail = (emailInput || currentUser?.email || '').trim().toLowerCase();

    if (!queryEmail || !queryEmail.includes('@')) {
      setError('Please enter a valid registered email address.');
      setCertificates([]);
      setHasSearched(true);
      return;
    }

    setError(null);
    setRenderError(null);
    setIsSearching(true);
    setHasSearched(true);

    try {
      // 1. Resolve participant display name
      let displayName: string | null = null;
      let uid: string | null = null;

      // Check current user UID or Firestore profiles
      if (currentUser && currentUser.email && currentUser.email.toLowerCase() === queryEmail) {
        uid = currentUser.uid;
        try {
          const profSnap = await getDoc(doc(db, 'profiles', uid));
          if (profSnap.exists()) {
            const data = profSnap.data() as { displayName?: string };
            if (data.displayName && data.displayName.trim()) {
              displayName = data.displayName.trim();
            }
          }
        } catch {}
      }

      if (!displayName) {
        try {
          const q = query(collection(db, 'profiles'), where('email', '==', queryEmail));
          const snap = await getDocs(q);
          if (!snap.empty) {
            uid = snap.docs[0].id;
            const data = snap.docs[0].data() as { displayName?: string };
            if (data.displayName && data.displayName.trim()) {
              displayName = data.displayName.trim();
            }
          }
        } catch {}
      }

      // Check registration mapping fallback
      const reg = certRegistry[queryEmail];
      if (!displayName && reg) {
        displayName = reg.name;
      }

      // Check Cyber Defense Challenge seed fallback
      if (!displayName) {
        const seedMatch = cyberDefenseSeed.find((s) => s.email && s.email.toLowerCase() === queryEmail);
        if (seedMatch) {
          displayName = seedMatch.displayName;
        }
      }

      // Check Cyber Security Quiz seed fallback
      if (!displayName) {
        const quizSeedMatch = (leaderboardSeed as any[]).find((s) => s.email && s.email.toLowerCase() === queryEmail);
        if (quizSeedMatch) {
          displayName = quizSeedMatch.displayName;
        }
      }

      // Special resolution for Kunal Bankhele / Admin accounts
      const ADMIN_EMAILS = ['checkship66@gmail.com', 'hafizmujawar786@gmail.com', 'kunalbankhele07@gmail.com'];
      if (!displayName && (queryEmail === 'kunalbankhele07@gmail.com' || queryEmail === 'checkship66@gmail.com')) {
        displayName = 'Kunal Bankhele';
      } else if (!displayName && queryEmail === 'hafizmujawar786@gmail.com') {
        displayName = 'Hafiz Mujawar';
      }

      if (!displayName) {
        setError('No tournament records found for this email address. Please make sure you typed your registered competition email.');
        setCertificates([]);
        return;
      }

      const recipientName = displayName;
      const gatheredCerts: AttachedCertificate[] = [];

      // =========================================================================
      // COMPETITION 1: Cyber Defense Challenge 2026 (LATEST ENDED: Nov 12, 2026)
      // =========================================================================
      const cddEndedAt = '2026-11-12T12:00:00.000Z';
      const isKunal =
        queryEmail === 'kunalbankhele07@gmail.com' ||
        queryEmail === 'checkship66@gmail.com' ||
        recipientName.toLowerCase().includes('kunal bankhele');

      // Top 3 Winners of Cyber Defense Challenge 2026
      const defTopWinner = CYBER_DEFENSE_TOP_WINNERS.find(
        (w) =>
          (isKunal && w.rank === '1st Place') ||
          w.name.toLowerCase() === recipientName.toLowerCase() ||
          w.username.toLowerCase() === queryEmail.split('@')[0]
      );

      // Check if user participated in Cyber Defense Challenge (Top Winner, Seed, Admin, or Leaderboard/Result)
      const inCddSeed = cyberDefenseSeed.some(
        (s) =>
          (s.email && s.email.toLowerCase() === queryEmail) ||
          s.displayName.toLowerCase() === recipientName.toLowerCase()
      );

      const hasCddParticipation = Boolean(defTopWinner || inCddSeed || isKunal || ADMIN_EMAILS.includes(queryEmail));

      if (hasCddParticipation) {
        if (defTopWinner) {
          // 1. Certificate of Excellence for Cyber Defense Challenge
          gatheredCerts.push({
            id: `cdd_excellence_${defTopWinner.certId}`,
            certId: defTopWinner.certId,
            recipientName,
            email: queryEmail,
            competitionId: CYBER_DEFENSE_COMP_ID,
            competitionTitle: 'Cyber Defense Challenge 2026',
            competitionEndedAt: cddEndedAt,
            isLatest: true,
            certType: 'excellence',
            rank: defTopWinner.rank,
            titleBadge: `${defTopWinner.title} · ${defTopWinner.badge}`,
          });
        }

        // 2. Certificate of Participation for Cyber Defense Challenge
        const cddPrtId = isKunal ? 'NO26-PRT-001-KB' : generateCertId(queryEmail, recipientName, 'NO26-PRT-CDD');
        gatheredCerts.push({
          id: `cdd_participation_${cddPrtId}`,
          certId: cddPrtId,
          recipientName,
          email: queryEmail,
          competitionId: CYBER_DEFENSE_COMP_ID,
          competitionTitle: 'Cyber Defense Challenge 2026',
          competitionEndedAt: cddEndedAt,
          isLatest: true,
          certType: 'participation',
        });
      }

      // =========================================================================
      // COMPETITION 2: Cyber Security Quiz 2026 (PREVIOUS ENDED: Nov 8, 2026)
      // =========================================================================
      const quizEndedAt = '2026-11-08T11:30:00.000Z';

      // Check Top Winners of Cyber Security Quiz 2026
      const quizTopWinner = CYBER_QUIZ_TOP_WINNERS.find(
        (w) =>
          w.name.toLowerCase() === recipientName.toLowerCase() ||
          w.username.toLowerCase() === queryEmail.split('@')[0] ||
          (queryEmail === 'itzichigo4u@gmail.com' && w.rank === '1st Place')
      );

      const hasQuizParticipation = Boolean(
        reg ||
        quizTopWinner ||
        ADMIN_EMAILS.includes(queryEmail) ||
        leaderboardSeed.some((s) => s.displayName.toLowerCase() === recipientName.toLowerCase())
      );

      if (hasQuizParticipation) {
        if (quizTopWinner) {
          // 1. Certificate of Excellence for Cyber Security Quiz 2026
          gatheredCerts.push({
            id: `quiz_excellence_${quizTopWinner.certId}`,
            certId: quizTopWinner.certId,
            recipientName,
            email: queryEmail,
            competitionId: CYBER_QUIZ_COMP_ID,
            competitionTitle: 'Cyber Security Quiz 2026',
            competitionEndedAt: quizEndedAt,
            isLatest: false,
            certType: 'excellence',
            rank: quizTopWinner.rank,
            titleBadge: `${quizTopWinner.title} · ${quizTopWinner.badge}`,
          });
        }

        // 2. Certificate of Participation for Cyber Security Quiz 2026
        const quizPrtId = reg
          ? reg.id
          : (isKunal ? 'NO26-PRT-000-KB' : generateCertId(queryEmail, recipientName, 'NO26-PRT'));

        gatheredCerts.push({
          id: `quiz_participation_${quizPrtId}`,
          certId: quizPrtId,
          recipientName,
          email: queryEmail,
          competitionId: CYBER_QUIZ_COMP_ID,
          competitionTitle: 'Cyber Security Quiz 2026',
          competitionEndedAt: quizEndedAt,
          isLatest: false,
          certType: 'participation',
        });
      }

      if (gatheredCerts.length === 0) {
        setError('This email did not participate in any concluded competitions, so no certificate is available.');
        setCertificates([]);
        return;
      }

      // =========================================================================
      // MANDATORY REQUIREMENT:
      // "the first certificate must always be the latest ended competition
      //  then the previous ended competition cert below and so on"
      // =========================================================================
      gatheredCerts.sort((a, b) => {
        // 1. Primary Sort: Competition Ended Timestamp (descending: newest first!)
        const dateDiff = new Date(b.competitionEndedAt).getTime() - new Date(a.competitionEndedAt).getTime();
        if (dateDiff !== 0) return dateDiff;

        // 2. Secondary Sort: Within same competition, Certificate of Excellence precedes Participation
        if (a.certType !== b.certType) {
          return a.certType === 'excellence' ? -1 : 1;
        }

        return 0;
      });

      // Synchronize issuance records in Firestore for verification
      for (const c of gatheredCerts) {
        try {
          await setDoc(
            doc(db, 'certificates', c.certId),
            {
              name: c.recipientName,
              event: c.competitionTitle,
              certType: c.certType,
              rank: c.rank || '',
              issuedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch {
          // Non-blocking write
        }
      }

      setCertificates(gatheredCerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed. Please verify the email and try again.');
      setCertificates([]);
    } finally {
      setIsSearching(false);
    }
  };

  // High-Resolution Node Capture
  const captureNode = async (node: HTMLElement | null): Promise<HTMLCanvasElement | null> => {
    if (!node) return null;
    setRenderError(null);
    setIsRendering(true);
    try {
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await Promise.all([
            document.fonts.load('800 48px "Inter"'),
            document.fonts.load('800 38px "Inter"'),
            document.fonts.load('800 30px "Inter"'),
            document.fonts.load('400 22px "Inter"'),
            document.fonts.load('400 19px "Inter"'),
            document.fonts.load('500 19px "Inter"'),
            document.fonts.load('700 72px "Playfair Display"'),
          ]);
          await document.fonts.ready;
        } catch {}
      }
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: '#f7f3ea',
        useCORS: true,
      });
      return canvas;
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : 'Could not render the certificate.');
      return null;
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownloadPNG = async (cert: AttachedCertificate, node: HTMLElement | null) => {
    const canvas = await captureNode(node);
    if (!canvas) return;
    const cleanEvent = cert.competitionTitle.replace(/\s+/g, '-');
    const cleanName = cert.recipientName.replace(/\s+/g, '-');
    const filename = `NullOrigin-${cleanEvent}-${cert.certType}-${cleanName}.png`;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleDownloadPDF = async (cert: AttachedCertificate, node: HTMLElement | null) => {
    const canvas = await captureNode(node);
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = 280;
    const h = 210;
    const x = (297 - w) / 2;
    pdf.addImage(dataUrl, 'PNG', x, 0, w, h);
    const cleanEvent = cert.competitionTitle.replace(/\s+/g, '-');
    const cleanName = cert.recipientName.replace(/\s+/g, '-');
    const filename = `NullOrigin-${cleanEvent}-${cert.certType}-${cleanName}.pdf`;
    pdf.save(filename);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="font-mono text-[11px] font-semibold tracking-wider text-[#8dc63f] uppercase">
          Null Origin 2026 · Official Credentials
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
          Certification Portal
        </h1>
        <p className="text-sm text-[#a8a8a2] leading-relaxed">
          Type your registered email address to fetch and download all certificates attached to your account.
          All credentials for the <strong className="text-[#f5f5f2]">latest ended competition</strong> are presented first, followed by previous tournament honors below.
        </p>
      </div>

      {/* Email lookup form */}
      <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 sm:p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#8dc63f]" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-[#f5f5f2] uppercase">
              Retrieve Certificates by Registered Email
            </h2>
          </div>
          {currentUser && (
            <span className="font-mono text-[11px] text-[#8dc63f]">
              Signed in as {currentUser.email}
            </span>
          )}
        </div>

        <form onSubmit={handleFind} className="space-y-3">
          <label htmlFor="cert-email" className="sr-only">
            Registered email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a8a2]" />
            <input
              id="cert-email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your registered competition email (e.g. kunalbankhele07@gmail.com)..."
              autoComplete="email"
              className="w-full rounded-lg border border-[#33332f] bg-[#151513] py-3 pl-10 pr-4 text-sm text-[#f5f5f2] placeholder:text-[#6f7d8c] focus:border-[#7ab32e] focus:outline-none focus:ring-2 focus:ring-[#8dc63f]/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || isRendering}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-3 text-sm font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
          >
            <Search className="h-4 w-4" />
            <span>{isSearching ? 'Verifying & Fetching Credentials...' : 'Fetch All My Certificates'}</span>
          </button>
        </form>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-[#FF365B]/40 bg-[#FF365B]/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF365B]" />
            <p className="text-xs text-[#f5f5f2] leading-relaxed">{error}</p>
          </div>
        )}
        {renderError && (
          <div className="flex items-start gap-2 rounded-lg border border-[#FF365B]/40 bg-[#FF365B]/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF365B]" />
            <p className="text-xs text-[#f5f5f2] leading-relaxed">{renderError}</p>
          </div>
        )}
      </div>

      {/* Found Certificates List (Chronological: Latest Ended Competition First) */}
      {certificates.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#2e2e2a] pb-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#8dc63f]" />
              <h2 className="font-display text-lg font-bold text-[#f5f5f2]">
                Your Verified Certificates ({certificates.length})
              </h2>
            </div>
            <span className="font-mono text-xs text-[#a8a8a2]">
              LATEST ENDED COMPETITION DISPLAYED FIRST
            </span>
          </div>

          <div className="space-y-6">
            {certificates.map((cert) => (
              <CertificateItemCard
                key={cert.id}
                cert={cert}
                isRendering={isRendering}
                onDownloadPNG={handleDownloadPNG}
                onDownloadPDF={handleDownloadPDF}
              />
            ))}
          </div>
        </div>
      )}

      {hasSearched && !isSearching && certificates.length === 0 && !error && (
        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-8 text-center space-y-3">
          <ShieldAlert className="mx-auto h-8 w-8 text-[#a8a8a2]" />
          <h3 className="font-display text-base font-bold text-[#f5f5f2]">No Certificates Found</h3>
          <p className="text-xs text-[#a8a8a2] max-w-md mx-auto">
            We could not find verified competition entries under this email address. Please make sure to enter the exact email used during registration.
          </p>
        </div>
      )}

      {/* Referral / participant gift */}
      <div className="rounded-xl border border-[#7ab32e]/60 bg-[#1b1b19] p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-[#7ab32e] px-2 py-1 font-mono text-[11px] font-semibold tracking-wider text-[#a4d65e] uppercase">
            Participant Gift
          </span>
          <span className="font-mono text-[11px] font-medium tracking-wider text-[#a8a8a2] uppercase">
            For All Registered Participants
          </span>
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-[#8dc63f]">
          $50 in AI credits — Gift for All Participants
        </h2>
        <p className="text-sm text-[#a8a8a2] leading-relaxed">
          Every Null Origin 2026 participant receives <strong className="text-[#f5f5f2]">$50 in AI credits</strong>.
          Click the button to open the registration page and <strong className="text-[#f5f5f2]">sign in with GitHub</strong> to claim your credits.
        </p>
        <a
          href={REFERRAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-3 text-sm font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors"
        >
          <span>Claim $50 in AI credits</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <p className="text-xs text-[#a8a8a2]">© 2026 Null Origin · Official Cyber Defense Credentials</p>
    </div>
  );
};
