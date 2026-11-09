import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, BadgeCheck } from 'lucide-react';
import { certRegistry } from '../constants/certRegistry';

/**
 * Hidden certificate verification page.
 *
 * NOT linked anywhere on the site frontend — no nav item, no footer link,
 * no dashboard entry. It only opens when someone scans the QR code on a
 * certificate, which encodes https://www.nullorigin.live/verify/<certId>.
 * No login is required: anyone holding a certificate can verify it.
 *
 * Lookup is against the registration mapping already bundled in the site
 * (email -> { name, id }); no new database, no server function, no extra
 * cost. A cert ID that is not in the registry cannot be verified.
 */
export const VerifyPage: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const id = (certId || '').trim().toUpperCase();

  const found = useMemo(() => {
    if (!id) return null;
    const entry = Object.entries(certRegistry).find(([, v]) => v.id.toUpperCase() === id);
    if (!entry) return null;
    return { email: entry[0], name: entry[1].name, id: entry[1].id };
  }, [id]);

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

        {found ? (
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
                <dd style={{ margin: '2px 0 0', fontWeight: 700 }}>{found.name}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: '#a8a8a2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Event</dt>
                <dd style={{ margin: '2px 0 0' }}>Cyber Security Quiz 2026 — Certificate of Participation</dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: '#a8a8a2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Certificate ID</dt>
                <dd style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 700 }}>{found.id}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: '#a8a8a2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Organised by</dt>
                <dd style={{ margin: '2px 0 0' }}>Team Null Origin</dd>
              </div>
            </dl>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '20px 0 0', fontSize: 13, color: '#a8a8a2' }}>
              <BadgeCheck style={{ width: 16, height: 16, color: '#8dc63f' }} />
              This certificate ID matches our registration records.
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
                  not match our registration records for Cyber Security Quiz 2026. Check the
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
