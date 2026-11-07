import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { jsPDF } from 'jspdf';
import { certRegistry } from '../constants/certRegistry';
import { CERT_TEMPLATE_DATA_URI } from '../constants/certTemplate';

const REFERRAL_URL = 'https://agentrouter.org/register?aff=p772';
const TEMPLATE_SRC = CERT_TEMPLATE_DATA_URI;
const CERT_W = 2000;
const CERT_H = 1414;
const NAME_MAX_WIDTH = 1180;
const NAME_START_SIZE = 96;
const NAME_MIN_SIZE = 34;
const NAME_X = 1000;
const NAME_Y = 608;
const ID_X = 132;
const ID_Y = 1324;
const ID_COVER = { x: 128, y: 1320, w: 260, h: 38 };
const CREAM = '#f7f2e6';

function generateCertId(email: string, name: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 900) + 100;
  const parts = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? 'X') + (parts[1]?.[0] ?? 'X')).toUpperCase();
  return `NO26-PRT-${num}-${initials}`;
}

interface FoundParticipant {
  name: string;
  certId: string;
  email: string;
  source: 'firestore' | 'registry';
}

export const CertificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [participant, setParticipant] = useState<FoundParticipant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // If user is not authorized administrator, show access denied (same pattern as AdminPage)
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#FF365B] bg-[#FF365B]/10 text-[#FF365B]">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
          Restricted Command Console
        </h1>
        <p className="text-sm text-[#a8a8a2] leading-relaxed">
          Access to the certificate generation interface requires verified administrator authorization.
        </p>
        {currentUser ? (
          <p className="text-xs font-mono text-[#FF365B]">
            Currently signed in with insufficient clearance
          </p>
        ) : (
          <p className="text-xs font-mono text-[#a8a8a2]">
            No authenticated operator session detected.
          </p>
        )}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 rounded-md bg-[#8dc63f] px-5 py-2.5 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer"
          >
            <span>Go to Operator Sign-In</span>
          </button>
        </div>
      </div>
    );
  }

  const renderCertificate = async (name: string, certId: string): Promise<boolean> => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    setRenderError(null);
    setIsRendering(true);
    try {
      canvas.width = CERT_W;
      canvas.height = CERT_H;
      const img = new Image();
      img.src = TEMPLATE_SRC;
      await img.decode();
      ctx.drawImage(img, 0, 0, CERT_W, CERT_H);

      try {
        await Promise.race([
          Promise.all([
            document.fonts.load('italic 700 96px "Playfair Display"'),
            document.fonts.load('600 28px Manrope'),
          ]),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch {
        // Fall back to Georgia / system serif and sans-serif below.
      }

      // Participant name (auto-shrinking italic serif, centred in the name slot).
      let size = NAME_START_SIZE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#141310';
      const setNameFont = (s: number) => {
        ctx.font = `italic 700 ${s}px "Playfair Display", Georgia, serif`;
      };
      setNameFont(size);
      while (ctx.measureText(name).width > NAME_MAX_WIDTH && size > NAME_MIN_SIZE) {
        size -= 2;
        setNameFont(size);
      }
      ctx.fillText(name, NAME_X, NAME_Y);

      // Cover the template's placeholder ID, then draw the real certificate ID.
      ctx.fillStyle = CREAM;
      ctx.fillRect(ID_COVER.x, ID_COVER.y, ID_COVER.w, ID_COVER.h);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#2b2b26';
      ctx.font = '600 28px Manrope, Arial, sans-serif';
      ctx.fillText(certId, ID_X, ID_Y);
      return true;
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : 'Could not render the certificate.');
      return false;
    } finally {
      setIsRendering(false);
    }
  };

  const handleFind = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      setError('Enter a valid registered email address.');
      setParticipant(null);
      return;
    }
    setError(null);
    setParticipant(null);
    setIsSearching(true);
    try {
      // Primary lookup: Firestore profiles collection by email.
      let displayName: string | null = null;
      try {
        const q = query(collection(db, 'profiles'), where('email', '==', normalized));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as { displayName?: string; email?: string };
          if (data.displayName && data.displayName.trim()) {
            displayName = data.displayName.trim();
          }
        }
        // Retry with the as-entered casing in case the stored email is not lowercased.
        if (!displayName && normalized !== email.trim()) {
          const q2 = query(collection(db, 'profiles'), where('email', '==', email.trim()));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            const data2 = snap2.docs[0].data() as { displayName?: string };
            if (data2.displayName && data2.displayName.trim()) {
              displayName = data2.displayName.trim();
            }
          }
        }
      } catch {
        // Firestore lookup failed (offline / permissions) — fall through to the registry.
        displayName = null;
      }

      // Fallback lookup: registration mapping (covers participants with no Firestore profile).
      const reg = certRegistry[normalized];
      if (!displayName && !reg) {
        setError('This email is not in the registered participants list.');
        return;
      }
      const name = displayName ?? reg!.name;
      const certId = reg ? reg.id : generateCertId(normalized, name);
      const found: FoundParticipant = {
        name,
        certId,
        email: normalized,
        source: displayName ? 'firestore' : 'registry',
      };
      setParticipant(found);
      await renderCertificate(name, certId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const fileBase = participant
    ? `NullOrigin-Certificate-${participant.name.replace(/\s+/g, '-')}`
    : 'NullOrigin-Certificate';

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas || !participant) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileBase}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const downloadPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas || !participant) return;
    const dataUrl = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210);
    pdf.save(`${fileBase}.pdf`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="font-mono text-[11px] font-semibold tracking-wider text-[#8dc63f] uppercase">
          Null Origin 2026 · Official Credentials
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
          Certification
        </h1>
        <p className="text-sm text-[#a8a8a2] leading-relaxed">
          Enter a participant&apos;s registered email address to generate their official
          Certificate of Participation, ready to download as a high-resolution PNG or PDF.
        </p>
      </div>

      {/* Email lookup */}
      <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#8dc63f]" />
          <h2 className="font-mono text-xs font-semibold tracking-wider text-[#f5f5f2] uppercase">
            Official Certificate Verification
          </h2>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email..."
              autoComplete="email"
              className="w-full rounded-lg border border-[#33332f] bg-[#151513] py-3 pl-10 pr-4 text-sm text-[#f5f5f2] placeholder:text-[#6f7d8c] focus:border-[#7ab32e] focus:outline-none focus:ring-2 focus:ring-[#8dc63f]/20"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || isRendering}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-3 text-sm font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Search className="h-4 w-4" />
            <span>{isSearching ? 'Verifying...' : 'Find My Certificate'}</span>
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

      {/* Certificate preview + downloads */}
      {participant && (
        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8dc63f]" />
            <div>
              <p className="text-sm font-semibold text-[#f5f5f2]">
                Registration confirmed — {participant.name}
              </p>
              <p className="text-xs text-[#a8a8a2] leading-relaxed">
                Certificate ID {participant.certId} · {participant.email}
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#2e2e2a] bg-[#151513]">
            <canvas ref={canvasRef} className="block h-auto w-full" aria-label="Certificate preview" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={downloadPNG}
              disabled={isRendering}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-5 py-3 text-sm font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Download PNG</span>
            </button>
            <button
              type="button"
              onClick={downloadPDF}
              disabled={isRendering}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#7ab32e]/60 bg-[#1b1b19] px-5 py-3 text-sm font-bold text-[#8dc63f] hover:bg-[#8dc63f]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
          </div>
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
          Click the button to open the registration page and <strong className="text-[#f5f5f2]">sign in with GitHub</strong> to
          claim your credits.
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

      <p className="text-xs text-[#a8a8a2]">© 2026 Null Origin</p>
    </div>
  );
};
