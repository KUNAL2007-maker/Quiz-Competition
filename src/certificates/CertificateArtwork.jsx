import React, { forwardRef, useMemo } from 'react';
import qrcode from './qrcode-generator.mjs';
import frame from './artwork.svg?raw';
import signature from './committee-signature.png?inline';

// The supplied frame is trusted, versioned artwork. Recipient and event values
// are always rendered as React text and never enter this markup.
const frameMarkup = frame.slice(frame.indexOf('>') + 1, frame.lastIndexOf('</svg>'));
const convenerSignature = 'M26,38 C12,40 12,15 27,12 C37,10 35,28 24,36 C19,40 31,42 40,26 C47,14 51,6 47,22 C42,39 36,53 38,53 C40,53 49,29 54,25 C57,23 54,36 58,36 C62,36 66,26 70,26 C73,26 70,35 77,35 C84,35 98,16 101,7 C104,-1 94,29 89,44 C86,52 91,32 100,29 C106,27 106,33 113,32 C122,31 136,28 148,27';
const titleColor = '#0b1f44';
const bodyColor = '#222d3f';
const bronze = '#e85a14';

export function awardName(type) {
  return type === 'excellence' ? 'Certificate of Excellence' : 'Certificate of Participation';
}

function fittedSize(text, start, width, family) {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return start;
  context.font = `700 ${start}px ${family}`;
  return Math.min(start, (start * width) / Math.max(context.measureText(text).width, 1));
}

export const CertificateArtwork = forwardRef(function CertificateArtwork({ cert }, ref) {
  const excellent = cert.type === 'excellence';
  const title = awardName(cert.type);
  const content = useMemo(() => {
    const base = import.meta.env.VITE_PUBLIC_ORIGIN || window.location.origin;
    const verifyUrl = new URL('/verify/' + encodeURIComponent(cert.id), base);
    const qr = qrcode(0, 'M');
    qr.addData(verifyUrl.href);
    qr.make();
    return {
      qrUrl: qr.createDataURL(4, 4),
      nameSize: fittedSize(cert.fullName, 72, 790, 'Georgia'),
      eventSize: fittedSize(cert.eventTitle, 26, 790, 'Arial'),
    };
  }, [cert.id, cert.fullName, cert.eventTitle]);
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"
      width="1200" height="900" role="img" aria-label={`${title} for ${cert.fullName}, ${cert.eventTitle}`}>
      <title>{title} awarded to {cert.fullName} for {cert.eventTitle}</title>
      <defs>
        <radialGradient id="cert-paper" cx="62%" cy="38%" r="78%">
          <stop offset="0" stopColor="#faf8f2" /><stop offset=".55" stopColor="#f7f5ee" /><stop offset="1" stopColor="#edeae0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#cert-paper)" />
      <g fill="none" stroke="#b38d3a">
        <rect x="10" y="10" width="1180" height="880" opacity=".55" />
        <rect x="15" y="15" width="1170" height="870" opacity=".28" />
      </g>
      <g aria-hidden="true" fill="none" dangerouslySetInnerHTML={{ __html: frameMarkup }} />
      <g fontFamily="Arial, sans-serif" fill={bodyColor}>
        <text x="236" y="157" fontWeight="800" fontSize="48" fill={titleColor}>NULL ORIGIN</text>
        <rect x="1012" y="44" width="140" height="159" rx="10" fill="white" />
        <image x="1022" y="54" width="120" height="120" href={content.qrUrl} />
        <text x="1082" y="190" textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="1.5">SCAN TO VERIFY</text>
        <g textAnchor="middle">
          <text x="600" y="263" fontSize="38" fontWeight="800" letterSpacing=".8" fill={titleColor}>{title.toUpperCase()}</text>
          <text x="600" y="330" fontSize="22">Proudly presented to</text>
          <text x="600" y="408" fontFamily="Georgia, serif" fontWeight="700" fontSize={content.nameSize} fill={titleColor}>{cert.fullName}</text>
          {excellent && <text x="600" y="463" fontSize="30" fill={bronze} fontWeight="700">RANK {cert.rank}</text>}
          <g transform={excellent ? 'translate(0 30)' : undefined}>
            <text x="600" y="480" fontSize="19">{excellent ? 'for outstanding performance in' : 'for participation in'}</text>
            <text x="600" y="518" fontSize={content.eventSize} fontWeight="700" fill={titleColor}>{cert.eventTitle}</text>
            <text x="600" y="555" fontSize="19">organized by Team Null Origin</text>
          </g>
          <g transform="translate(277 657)" fill="none" stroke="#182334" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
            <path d={convenerSignature} />
          </g>
          <image x="746" y="655" width="198" height="58" preserveAspectRatio="xMidYMid meet" href={signature} />
          <path d="M240 718H470 M730 718H960" stroke="#2c384a" strokeWidth="1.5" />
          <text x="355" y="751" fontSize="19">Event Convener</text>
          <text x="845" y="751" fontSize="19">Organizing Committee</text>
          <text x="355" y="784" fontSize="18.5">NULL ORIGIN</text>
          <text x="845" y="784" fontSize="18.5">NULL ORIGIN</text>
        </g>
      </g>
    </svg>
  );
});

export async function makeCertificatePdf(svg, cert) {
  const { jsPDF } = await import('jspdf');
  const serialized = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    const ready = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Certificate artwork could not be rendered.'));
    });
    image.src = url;
    await ready;
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1800;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image export is unavailable in this browser.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({ title: `${awardName(cert.type)} — ${cert.eventTitle}`, author: 'Null Origin' });
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 8.5, 0, 280, 210, undefined, 'FAST');
    return doc;
  } finally {
    URL.revokeObjectURL(url);
  }
}
