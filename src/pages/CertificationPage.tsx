import React, { useState, useRef, useEffect } from 'react';
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
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { certRegistry } from '../constants/certRegistry';
import { CertificateTemplate } from '../components/CertificateTemplate';
import { ExcellenceCertificateTemplate } from '../components/ExcellenceCertificateTemplate';

const REFERRAL_URL = 'https://agentrouter.org/register?aff=p772';
// Cyber Security Quiz 2026 competition id — the participation gate below
// only issues a certificate when this user has a leaderboard entry here
// (any score, including 0). Registered-but-never-entered users get none.
const CYBER_QUIZ_COMP_ID = 'comp_1793963656835';
// Top 3 winners — each gets TWO certificates: the Participation cert
// (above) AND a Certificate of Excellence with their rank. The Excellence
// cert has its own id (NO26-EXC-###-XX) so its QR verifies separately as
// a Certificate of Excellence. Keyed by the winner's registered email.
const WINNERS: Record<string, { rank: string; excCertId: string }> = {
  'itzichigo4u@gmail.com': { rank: '1st Place', excCertId: 'NO26-EXC-784-AA' },
  'keerthanashreektha@gmail.com': { rank: '1st Runner Up', excCertId: 'NO26-EXC-593-KS' },
  'chayeshkumar@gmail.com': { rank: '2nd Runner Up', excCertId: 'NO26-EXC-041-CK' },
};
// Certificate artwork is 1200x900 (the CertificateTemplate component).
const CERT_W = 1200;
const CERT_H = 900;

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

interface FoundExcellence {
  name: string;
  certId: string;
  rank: string;
  email: string;
}

export const CertificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAppContext();
  const certRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const excCertRef = useRef<HTMLDivElement>(null);
  const excCaptureRef = useRef<HTMLDivElement>(null);
  const previewOuterRef = useRef<HTMLDivElement>(null);
  const excPreviewOuterRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.7);
  const [excPreviewScale, setExcPreviewScale] = useState(0.7);

  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [participant, setParticipant] = useState<FoundParticipant | null>(null);
  const [excellence, setExcellence] = useState<FoundExcellence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Scale the 1200x900 certificate previews to fit the card width.
  // The html2canvas capture targets certRef / excCertRef (the unscaled
  // 1200x900 divs), so downloads stay full resolution regardless of the
  // preview scale.
  useEffect(() => {
    const el = previewOuterRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setPreviewScale(w / CERT_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [participant]);

  useEffect(() => {
    const el = excPreviewOuterRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setExcPreviewScale(w / CERT_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [excellence]);

  // Non-admins look up their OWN certificate, so lock the email field to
  // their signed-in account (admins keep the free-form lookup).
  useEffect(() => {
    if (currentUser && !isAdmin) {
      setEmail(currentUser.email ?? '');
    }
  }, [currentUser, isAdmin]);

  // The certificate page is open to everyone — but you must be signed in,
  // so the page knows which participant you are (a certificate is tied to
  // your quiz entry). Non-admins can only fetch their OWN certificate;
  // admins can look up any registered email.
  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#8dc63f] bg-[#8dc63f]/10 text-[#8dc63f]">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
          Sign in to get your certificate
        </h1>
        <p className="text-sm text-[#a8a8a2] leading-relaxed">
          Certificates are only for students who entered Cyber Security Quiz 2026. Sign in with the account you used for the quiz to download yours.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 rounded-md bg-[#8dc63f] px-5 py-2.5 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer"
          >
            <span>Go to Sign-In</span>
          </button>
        </div>
      </div>
    );
  }

  const handleFind = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // Non-admins can only fetch their OWN certificate, so the lookup uses
    // their signed-in account. Admins can look up any registered email.
    const normalized = isAdmin
      ? email.trim().toLowerCase()
      : (currentUser?.email ?? '').trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      setError('Enter a valid registered email address.');
      setParticipant(null);
      setExcellence(null);
      return;
    }
    setError(null);
    setParticipant(null);
    setExcellence(null);
    setIsSearching(true);
    try {
      // Primary lookup: the participant's profile (for the current/updated
      // name — never the leaderboard, which keeps the name from quiz time).
      // We also capture the profile uid: only a user who ENTERED the quiz
      // has a leaderboard entry, and that entry is keyed by uid.
      let displayName: string | null = null;
      let uid: string | null = null;
      if (isAdmin) {
        try {
          const q = query(collection(db, 'profiles'), where('email', '==', normalized));
          const snap = await getDocs(q);
          if (!snap.empty) {
            uid = snap.docs[0].id;
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
              if (!uid) uid = snap2.docs[0].id;
              const data2 = snap2.docs[0].data() as { displayName?: string };
              if (data2.displayName && data2.displayName.trim()) {
                displayName = data2.displayName.trim();
              }
            }
          }
        } catch {
          // Firestore lookup failed (offline / permissions) — fall through to the registry.
          displayName = null;
          uid = null;
        }
      } else {
        // Self-service: read the signed-in user's OWN profile doc by uid.
        // (A plain email query is not allowed for non-admins by the rules,
        // but reading your own profile by id is.)
        uid = currentUser!.uid;
        try {
          const profSnap = await getDoc(doc(db, 'profiles', uid));
          if (profSnap.exists()) {
            const data = profSnap.data() as { displayName?: string };
            if (data.displayName && data.displayName.trim()) {
              displayName = data.displayName.trim();
            }
          }
        } catch {
          displayName = null;
        }
      }

      // Fallback lookup: registration mapping (covers registered users with no Firestore profile).
      // The profile name (above) always wins when present.
      const reg = certRegistry[normalized];
      if (!displayName && !reg) {
        setError('This email is not in the registered participants list.');
        return;
      }
      const name = displayName ?? reg!.name;
      const certId = reg ? reg.id : generateCertId(normalized, name);

      // PARTICIPATION GATE (9 Nov 2026): certificates are ONLY for students
      // who entered Cyber Security Quiz 2026 — any score, including 0.
      // A leaderboard entry for this uid + competition is the proof of entry.
      // No profile (no uid) means they never signed in to take the quiz.
      // ADMIN EXCEPTION: the admin email(s) can always get a certificate
      // (the organiser did not take the quiz as a participant, so there is
      // no leaderboard entry to check). Same list as firestore.rules isAdmin().
      const ADMIN_EMAILS = ['checkship66@gmail.com', 'hafizmujawar786@gmail.com', 'kunalbankhele07@gmail.com'];
      let participated = ADMIN_EMAILS.includes(normalized);
      if (!participated && uid) {
        try {
          const lbDoc = await getDoc(doc(db, 'leaderboard', `${uid}_${CYBER_QUIZ_COMP_ID}`));
          participated = lbDoc.exists();
        } catch {
          participated = false;
        }
      }
      if (!participated) {
        setError('This email did not participate in Cyber Security Quiz 2026, so no certificate is available. Certificates are only for students who entered the quiz (any score, including 0).');
        return;
      }

      // Record the issuance: the hidden public Verify page reads this doc.
      // Only participants reach here (gate above), so only participants
      // ever get a doc — this is what makes a QR verifiable. No email is
      // stored (the doc is publicly readable by cert id).
      try {
        await setDoc(doc(db, 'certificates', certId), {
          name,
          event: 'Cyber Security Quiz 2026',
          certType: 'participation',
          issuedAt: serverTimestamp(),
        }, { merge: true });
      } catch {
        // Issuance record failed — the certificate itself is still valid
        // for download; the QR just won't verify until the record exists.
        // (Admin can re-look the email up to retry the write.)
      }

      // Top 3 winners get a SECOND certificate — the Certificate of
      // Excellence with their rank. It has its own id (NO26-EXC-###-XX)
      // and its own `certificates` doc (certType 'excellence' + rank), so
      // its QR verifies separately as a Certificate of Excellence.
      const win = WINNERS[normalized];
      if (win) {
        try {
          await setDoc(doc(db, 'certificates', win.excCertId), {
            name,
            event: 'Cyber Security Quiz 2026',
            certType: 'excellence',
            rank: win.rank,
            issuedAt: serverTimestamp(),
          }, { merge: true });
        } catch {
          // Same as above — the Excellence cert is still downloadable;
          // its QR just won't verify until the record exists.
        }
        setExcellence({ name, certId: win.excCertId, rank: win.rank, email: normalized });
      }

      const found: FoundParticipant = {
        name,
        certId,
        email: normalized,
        source: displayName ? 'firestore' : 'registry',
      };
      setParticipant(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const fileBase = participant
    ? `NullOrigin-Certificate-${participant.name.replace(/\s+/g, '-')}`
    : 'NullOrigin-Certificate';

  const excFileBase = excellence
    ? `NullOrigin-Certificate-of-Excellence-${excellence.name.replace(/\s+/g, '-')}`
    : 'NullOrigin-Certificate-of-Excellence';

  // Render a certificate node to a high-resolution canvas (scale 2 =>
  // 2400x1800). IMPORTANT: capture from the hidden off-screen container
  // (captureRef / excCaptureRef), NOT from the scaled preview. html2canvas
  // mis-measures text when the target sits inside a transformed (scaled)
  // ancestor, which produced overlapping/garbled text in the downloaded
  // PNG/PDF. We also wait for the certificate fonts to be fully loaded
  // before capturing, so html2canvas measures text with the real fonts.
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
        } catch {
          // Font loading is best-effort; proceed with the capture anyway.
        }
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

  const captureCertificate = async (): Promise<HTMLCanvasElement | null> => {
    if (!participant) return null;
    return captureNode(captureRef.current ?? certRef.current);
  };

  const captureExcellence = async (): Promise<HTMLCanvasElement | null> => {
    if (!excellence) return null;
    return captureNode(excCaptureRef.current ?? excCertRef.current);
  };

  const downloadPNG = async () => {
    const canvas = await captureCertificate();
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

  const downloadPDF = async () => {
    const canvas = await captureCertificate();
    if (!canvas || !participant) return;
    const dataUrl = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    // Certificate is 1200x900 (4:3) — fit it inside A4 landscape without stretching.
    const w = 280;
    const h = 210;
    const x = (297 - w) / 2;
    pdf.addImage(dataUrl, 'PNG', x, 0, w, h);
    pdf.save(`${fileBase}.pdf`);
  };

  const downloadExcPNG = async () => {
    const canvas = await captureExcellence();
    if (!canvas || !excellence) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${excFileBase}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const downloadExcPDF = async () => {
    const canvas = await captureExcellence();
    if (!canvas || !excellence) return;
    const dataUrl = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = 280;
    const h = 210;
    const x = (297 - w) / 2;
    pdf.addImage(dataUrl, 'PNG', x, 0, w, h);
    pdf.save(`${excFileBase}.pdf`);
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
          Enter your registered email to download your Certificate of Participation (PNG or PDF).
          Only students who entered Cyber Security Quiz 2026 can get one — top 3 winners also
          get their Certificate of Excellence here. {isAdmin ? 'As an admin you can look up any registered email.' : 'You are signed in, so this looks up your own certificate.'}
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
              disabled={!isAdmin}
              className="w-full rounded-lg border border-[#33332f] bg-[#151513] py-3 pl-10 pr-4 text-sm text-[#f5f5f2] placeholder:text-[#6f7d8c] focus:border-[#7ab32e] focus:outline-none focus:ring-2 focus:ring-[#8dc63f]/20 disabled:opacity-70"
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
            <div
              ref={previewOuterRef}
              style={{ position: 'relative', width: '100%', height: CERT_H * previewScale, overflow: 'hidden' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: CERT_W,
                  height: CERT_H,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div ref={certRef} style={{ width: CERT_W, height: CERT_H }}>
                  <CertificateTemplate name={participant.name} certId={participant.certId} brandTop={118} />
                </div>
              </div>
            </div>
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

      {/* Certificate of Excellence — only for the top 3 winners. Shown
          below the participation certificate, with its own downloads. */}
      {participant && excellence && (
        <div className="rounded-xl border border-[#b38d3a]/60 bg-[#1b1b19] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e85a14]" />
            <div>
              <p className="text-sm font-semibold text-[#f5f5f2]">
                Certificate of Excellence — {excellence.rank}
              </p>
              <p className="text-xs text-[#a8a8a2] leading-relaxed">
                Certificate ID {excellence.certId} · {excellence.email}
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#2e2e2a] bg-[#151513]">
            <div
              ref={excPreviewOuterRef}
              style={{ position: 'relative', width: '100%', height: CERT_H * excPreviewScale, overflow: 'hidden' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: CERT_W,
                  height: CERT_H,
                  transform: `scale(${excPreviewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div ref={excCertRef} style={{ width: CERT_W, height: CERT_H }}>
                  <ExcellenceCertificateTemplate name={excellence.name} certId={excellence.certId} rank={excellence.rank} brandTop={118} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={downloadExcPNG}
              disabled={isRendering}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#e85a14] px-5 py-3 text-sm font-bold text-[#fff7f0] hover:bg-[#f06a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Download Excellence PNG</span>
            </button>
            <button
              type="button"
              onClick={downloadExcPDF}
              disabled={isRendering}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#e85a14]/60 bg-[#1b1b19] px-5 py-3 text-sm font-bold text-[#e85a14] hover:bg-[#e85a14]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Download Excellence PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden off-screen render target for downloads. This is a second,
          full-size (1200x900, unscaled, no transformed ancestors) copy of
          the certificate used ONLY by html2canvas. Capturing the scaled
          preview produced overlapping/garbled text. */}
      {participant && (
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
          <div ref={captureRef} style={{ width: CERT_W, height: CERT_H }}>
            <CertificateTemplate name={participant.name} certId={participant.certId} brandTop={96} />
          </div>
        </div>
      )}

      {/* Hidden off-screen render target for the Excellence certificate downloads. */}
      {participant && excellence && (
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
          <div ref={excCaptureRef} style={{ width: CERT_W, height: CERT_H }}>
            <ExcellenceCertificateTemplate name={excellence.name} certId={excellence.certId} rank={excellence.rank} brandTop={96} />
          </div>
        </div>
      )}

      {/* Referral / participant gift — visible to everyone, including
          non-participants. */}
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
