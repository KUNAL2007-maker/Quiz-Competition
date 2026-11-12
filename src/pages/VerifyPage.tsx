import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, BadgeCheck } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { certRegistry } from '../constants/certRegistry';
import { CYBER_QUIZ_TOP_WINNERS, CYBER_DEFENSE_TOP_WINNERS } from '../constants/tournaments';

/**
 * Hidden certificate verification page.
 *
 * NOT linked anywhere on the site frontend — no nav item, no footer link,
 * no dashboard entry. It only opens when someone scans the QR code on a
 * certificate, which encodes https://www.nullorigin.live/verify/<certId>.
 * No login is required: anyone holding a certificate can verify it.
 *
 * PARTICIPANTS ONLY (9 Nov 2026): a certificate verifies only if it was
 * issued to a student who entered Cyber Security Quiz 2026 (any score,
 * including 0). The admin-only Certification page writes one doc per
 * issued certificate to the `certificates` collection (id = cert id) only
 * after its leaderboard participation gate passes. This page reads that
 * single doc — it does NOT consult the registration mapping, so a
 * registered-but-never-entered student has no doc and shows Not Found.
 * No email is stored in the doc (it is publicly readable by cert id).
 */
export const VerifyPage: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const id = (certId || '').trim().toUpperCase();

  const [status, setStatus] = useState<'checking' | 'verified' | 'not-found'>('checking');
  const [name, setName] = useState('');
  const [certType, setCertType] = useState<'participation' | 'excellence'>('participation');
  const [rank, setRank] = useState('');
  const [event, setEvent] = useState('Cyber Security Quiz 2026');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setStatus('not-found');
        return;
      }
      setStatus('checking');
      try {
        const snap = await getDoc(doc(db, 'certificates', id));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as { name?: string; event?: string; certType?: string; rank?: string };
          setName((data.name || '').trim());
          setCertType(data.certType === 'excellence' ? 'excellence' : 'participation');
          setRank((data.rank || '').trim());
          setEvent(data.event || (id.includes('KB') || id.includes('CDD') ? 'Cyber Defense Challenge 2026' : 'Cyber Security Quiz 2026'));
          setStatus('verified');
          return;
        }
      } catch {
        // Fall back to verified static tournament registry
      }
      if (cancelled) return;

      // 1. Fallback check for Cyber Defense Challenge Top Winners
      const defWinMatch = CYBER_DEFENSE_TOP_WINNERS.find((w) => w.certId.toUpperCase() === id);
      if (defWinMatch) {
        setName(defWinMatch.name);
        setCertType('excellence');
        setRank(defWinMatch.rank);
        setEvent('Cyber Defense Challenge 2026');
        setStatus('verified');
        return;
      }

      // 2. Check for Kunal Bankhele participation cert for Cyber Defense Challenge
      if (id === 'NO26-PRT-001-KB') {
        setName('Kunal Bankhele');
        setCertType('participation');
        setRank('');
        setEvent('Cyber Defense Challenge 2026');
        setStatus('verified');
        return;
      }

      // 3. Fallback check for Top 3 Excellence Certificates (Cyber Security Quiz)
      const winMatch = CYBER_QUIZ_TOP_WINNERS.find((w) => w.certId.toUpperCase() === id);
      if (winMatch) {
        setName(winMatch.name);
        setCertType('excellence');
        setRank(winMatch.rank);
        setEvent('Cyber Security Quiz 2026');
        setStatus('verified');
        return;
      }

      // 4. Fallback check for Participant Certificates in certified registry
      const regMatch = Object.values(certRegistry).find((entry) => entry.id.toUpperCase() === id);
      if (regMatch) {
        setName(regMatch.name);
        setCertType('participation');
        setRank('');
        setEvent('Cyber Security Quiz 2026');
        setStatus('verified');
        return;
      }

      setStatus('not-found');
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const verified = status === 'verified';
  const isExcellence = verified && certType === 'excellence';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#151513',
        color: '#f5f5f2',
        fontFamily: `'Inter', 'Manrope', sans-serif`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560 }}>
        <p
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: '#8dc63f',
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}
        >
          Null Origin 2026 · Certificate Verification
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 24px', lineHeight: 1.2 }}>
          Certificate Verification
        </h1>

        {status === 'checking' ? (
          <div
            style={{
              border: '1px solid #2e2e2a',
              borderRadius: 16,
              background: '#1b1b19',
              padding: '28px 24px',
              fontSize: 15,
              color: '#a8a8a2',
            }}
          >
            Checking certificate…
          </div>
        ) : verified ? (
          <div
            style={{
              border: '1px solid #2e2e2a',
              borderRadius: 16,
              background: '#1b1b19',
              padding: '28px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <ShieldCheck style={{ width: 28, height: 28, color: '#8dc63f' }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: '#8dc63f' }}>
                Certificate Verified
              </span>
            </div>
            <dl style={{ margin: 0, display: 'grid', gap: 12, fontSize: 15, lineHeight: 1.5 }}>
              <div>
                <dt style={{ fontSize: 12, color: '#a8a8a2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Participant</dt>
                <dd style={{ margin: '2px 0 0', fontWeight: 700 }}>{name}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: '#a8a8a2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Event</dt>
                <dd style={{ margin: '2px 0 0' }}>{event} — {isExcellence ? 'Certificate of Excellence' : 'Certificate of Participation'}</dd>
              </div>
              {isExcellence && rank && (
                <div>
                  <dt style={{ fontSize: 12, color: '#a8a8a2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rank</dt>
                  <dd style={{ margin: '2px 0 0', fontWeight: 700, color: '#e85a14' }}>{rank}</dd>
                </div>
              )}
              <div>
                <dt style={{ fontSize: 12, color: '#a8a8a2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Certificate ID</dt>
                <dd style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 700 }}>{id}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: '#a8a8a2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Organised by</dt>
                <dd style={{ margin: '2px 0 0' }}>Team Null Origin</dd>
              </div>
            </dl>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '20px 0 0', fontSize: 13, color: '#a8a8a2' }}>
              <BadgeCheck style={{ width: 16, height: 16, color: '#8dc63f' }} />
              This certificate was issued to {isExcellence ? `the ${rank || ''} winner` : 'a participant'} of {event}.
            </p>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid rgba(255,54,91,0.4)',
              borderRadius: 16,
              background: 'rgba(255,54,91,0.08)',
              padding: '28px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ShieldAlert style={{ width: 28, height: 28, color: '#FF365B' }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FF365B' }}>
                Certificate Not Found
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#a8a8a2' }}>
              {id ? (
                <>
                  The certificate ID <span style={{ fontFamily: 'monospace', color: '#f5f5f2' }}>{id}</span> does
                  not match an issued certificate for Cyber Security Quiz 2026. Certificates are only issued to students who entered the quiz. Check the
                  code and try again, or contact the organisers.
                </>
              ) : (
                <>No certificate ID was provided. Scan the QR code on a certificate to verify it.</>
              )}
            </p>
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: '#a8a8a2', lineHeight: 1.6 }}>
          Verification is provided by Team Null Origin. If you believe this result is wrong,
          contact <a href="mailto:contact@nullorigin.live" style={{ color: '#8dc63f' }}>contact@nullorigin.live</a>.
        </p>
        <p style={{ marginTop: 8 }}>
          <Link to="/" style={{ fontSize: 13, color: '#8dc63f', textDecoration: 'none' }}>
            ← Back to Null Origin
          </Link>
        </p>
      </div>
    </div>
  );
};
