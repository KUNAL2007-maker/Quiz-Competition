import React, { useEffect, useRef, useState } from 'react';

// Kunal Bankhele's signature (base64 PNG) — the Organizing Committee signature.
const KUNAL_SIGNATURE_DATA_URI = 'data:image/png;base64,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';

// Exact colours / paper from the approved cert.html design.
const PAPER =
  'radial-gradient(circle at 62% 38%, #faf8f2 0%, #f7f5ee 52%, #edeae0 100%)';
const TITLE = '#0b1f44';
const BODY = '#222d3f';
const ORANGE = '#e85a14';
const SANS = `'Inter', 'Manrope', sans-serif`;
const SERIF = `'Playfair Display', Georgia, serif`;

// Left "Event Convener" signature — the exact calligraphic squiggle from cert.html.
const LEFT_SIGNATURE_PATH =
  "M26,38 C12,40 12,15 27,12 C37,10 35,28 24,36 C19,40 31,42 40,26 C47,14 51,6 47,22 C42,39 36,53 38,53 C40,53 49,29 54,25 C57,23 54,36 58,36 C62,36 66,26 70,26 C73,26 70,35 77,35 C84,35 98,16 101,7 C104,-1 94,29 89,44 C86,52 91,32 100,29 C106,27 106,33 113,32 C122,31 136,28 148,27";

/**
 * Participant certificate — a faithful port of the approved cert.html design.
 *
 * The background artwork is the EXACT SVG from cert.html (top-left circuit
 * traces, left asymmetric ribbon architecture, NULL ORIGIN hexagon logo and
 * the bottom-centre laurel seal), embedded as one 1200x900 layer. The text
 * (brand, heading, name, citation, signature blocks) is HTML positioned
 * exactly as in cert.html, with only the recipient name being dynamic.
 * No cert ID, no QR code and no date appear on the certificate itself.
 */
export default function CertificateTemplate({ name }: { name: string }) {
  const displayName = (name || '').trim() || 'Participant';
  const [fontSize, setFontSize] = useState(72);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let size = 72;
    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      if (!canvasRef.current) canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        while (size > 32) {
          ctx.font = `700 ${size}px "Playfair Display", Georgia, serif`;
          if (ctx.measureText(displayName).width <= 740) break;
          size -= 2;
        }
      }
    } catch {
      size = 72;
    }
    setFontSize(size);
  }, [displayName]);

  const nameFontSize = fontSize;

  return (
    <div
      style={{
        position: 'relative',
        width: 1200,
        height: 900,
        overflow: 'hidden',
        background: PAPER,
        fontFamily: SANS,
      }}
    >
      {/* Thin gold border frame, as in the approved design. */}
      <div
        style={{
          position: 'absolute',
          inset: 10,
          border: '1px solid rgba(179,141,58,0.55)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 15,
          border: '1px solid rgba(179,141,58,0.28)',
          pointerEvents: 'none',
        }}
      />

      {/* ===== Exact artwork from cert.html (circuit traces, ribbons, hexagon logo, seal) ===== */}
      <svg
        width="1200"
        height="900"
        viewBox="0 0 1200 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >

        <defs>
          <filter id="pillarShadow" x="-10%" y="-5%" width="150%" height="110%">
            <feDropShadow dx="6" dy="2" stdDeviation="7" floodColor="#051026" floodOpacity="0.30"></feDropShadow>
          </filter>
          <filter id="ribbonShadow" x="-15%" y="-15%" width="150%" height="150%">
            <feDropShadow dx="5" dy="7" stdDeviation="7" floodColor="#040d21" floodOpacity="0.38"></feDropShadow>
          </filter>
          <filter id="sealShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#091938" floodOpacity="0.28"></feDropShadow>
          </filter>

          <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e6c878"></stop>
            <stop offset="100%" stopColor="#9b7322"></stop>
          </linearGradient>

          <linearGradient id="navyPillarGrad" x1="0" y1="0" x2="90" y2="900" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0d234a"></stop>
            <stop offset="50%" stopColor="#091a3a"></stop>
            <stop offset="100%" stopColor="#06142e"></stop>
          </linearGradient>

          <linearGradient id="goldLinear" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c39a45"></stop>
            <stop offset="28%" stopColor="#ebd28c"></stop>
            <stop offset="55%" stopColor="#c59c46"></stop>
            <stop offset="82%" stopColor="#e6c97a"></stop>
            <stop offset="100%" stopColor="#966e1e"></stop>
          </linearGradient>

          <linearGradient id="goldLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#efd895"></stop>
            <stop offset="50%" stopColor="#cba34d"></stop>
            <stop offset="100%" stopColor="#997020"></stop>
          </linearGradient>

          <linearGradient id="goldDiag1" x1="0" y1="205" x2="115" y2="335" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#b58a34"></stop>
            <stop offset="48%" stopColor="#ead086"></stop>
            <stop offset="100%" stopColor="#9e7422"></stop>
          </linearGradient>

          <linearGradient id="cobaltRibbonUpper" x1="0" y1="290" x2="188" y2="545" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0e3780"></stop>
            <stop offset="48%" stopColor="#1c57b8"></stop>
            <stop offset="82%" stopColor="#16479c"></stop>
            <stop offset="100%" stopColor="#0a2761"></stop>
          </linearGradient>

          <linearGradient id="cobaltRibbonLower" x1="0" y1="530" x2="280" y2="900" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0d3478"></stop>
            <stop offset="42%" stopColor="#1c58bc"></stop>
            <stop offset="80%" stopColor="#174ca6"></stop>
            <stop offset="100%" stopColor="#0e347a"></stop>
          </linearGradient>

          <linearGradient id="darkFoldBack" x1="40" y1="490" x2="188" y2="750" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#071838"></stop>
            <stop offset="55%" stopColor="#10326b"></stop>
            <stop offset="100%" stopColor="#05132b"></stop>
          </linearGradient>

          <radialGradient id="sealBlueDisc" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#2563eb"></stop>
            <stop offset="58%" stopColor="#144196"></stop>
            <stop offset="100%" stopColor="#081b42"></stop>
          </radialGradient>
        </defs>

        
        <g opacity="0.88">
          <path d="M82 60 L132 10 L215 10" stroke="#c8a456" strokeWidth="1.4" fill="none"></path>
          <path d="M82 115 L146 51 L202 51 L253 0" stroke="#162f59" strokeWidth="1.7" fill="none"></path>
          <circle cx="229" cy="51" r="4" stroke="#162f59" strokeWidth="1.7" fill="#f6f4ec"></circle>
          <path d="M82 135 L154 63 L210 63 L273 0" stroke="#c8a456" strokeWidth="1.4" fill="none"></path>
          <circle cx="154" cy="39" r="3.2" fill="#c8a456"></circle>
          <path d="M82 95 L138 39 L151 39" stroke="#c8a456" strokeWidth="1.3" fill="none"></path>
          <path d="M82 165 L122 125 L122 92 L195 19 L270 19" stroke="#162f59" strokeWidth="1.5" fill="none"></path>
          <circle cx="110" cy="184" r="4" stroke="#162f59" strokeWidth="1.7" fill="#f6f4ec"></circle>
          <path d="M82 212 L110 184" stroke="#162f59" strokeWidth="1.7" fill="none"></path>
          <path d="M312 0 L242 70" stroke="#162f59" strokeWidth="1.6" fill="none"></path>
          <circle cx="239" cy="73" r="4.2" stroke="#162f59" strokeWidth="1.7" fill="#f6f4ec"></circle>
          <path d="M332 0 L265 67" stroke="#c8a456" strokeWidth="1.5" fill="none"></path>
          <circle cx="262" cy="70" r="4.2" fill="#c8a456"></circle>
          <path d="M358 0 L292 66" stroke="#8a96a8" strokeWidth="1.2" fill="none"></path>
          <circle cx="289" cy="69" r="3.5" fill="#c8a456"></circle>

          
          <path d="M128 212 L128 335" stroke="#c8a456" strokeWidth="1.4" fill="none"></path>
          <path d="M140 232 L140 355" stroke="#162f59" strokeWidth="1.5" fill="none"></path>
          <circle cx="140" cy="229" r="3.8" stroke="#162f59" strokeWidth="1.6" fill="#f6f4ec"></circle>

          <path d="M128 315 L162 281 L162 248" stroke="#162f59" strokeWidth="1.7" fill="none"></path>
          <circle cx="162" cy="244" r="4.2" stroke="#162f59" strokeWidth="1.7" fill="#f6f4ec"></circle>

          <path d="M128 368 L224 272 L224 226" stroke="#162f59" strokeWidth="1.8" fill="none"></path>
          <circle cx="224" cy="222" r="4.2" stroke="#162f59" strokeWidth="1.8" fill="#f6f4ec"></circle>

          <path d="M128 402 L198 332 L198 282 L241 239" stroke="#c8a456" strokeWidth="1.5" fill="none"></path>
          <circle cx="244" cy="236" r="4" stroke="#c8a456" strokeWidth="1.6" fill="#f6f4ec"></circle>
        </g>

        
        
        <g filter="url(#pillarShadow)">
          <polygon points="0,0 82,0 82,360 116,460 116,900 0,900" fill="url(#navyPillarGrad)"></polygon>
          <rect x="79" y="0" width="4.5" height="250" fill="url(#goldLinear)"></rect>
          <rect x="113" y="670" width="4.5" height="230" fill="url(#goldLinear)"></rect>
        </g>

        
        <g filter="url(#ribbonShadow)">
          <polygon points="0,115 128,248 128,312 0,440" fill="#091f45"></polygon>
          <polygon points="0,218 102,322 75,350 0,273" fill="url(#goldDiag1)"></polygon>
        </g>

        
        <g filter="url(#ribbonShadow)">
          <polygon points="186,492 186,618 42,765 0,722 140,578" fill="url(#darkFoldBack)"></polygon>
          <polygon points="148,554 176,584 26,738 0,710" fill="url(#goldLinear)"></polygon>
        </g>

        
        <g filter="url(#ribbonShadow)">
          <polygon points="0,298 186,490 186,584 156,554 0,394" fill="url(#cobaltRibbonUpper)"></polygon>
          <polygon points="0,390 158,553 131,581 0,446" fill="url(#goldLinear)"></polygon>
        </g>

        
        <g filter="url(#ribbonShadow)">
          <polygon points="0,520 294,900 284,900 0,532" fill="url(#goldLinear)"></polygon>
          <polygon points="0,530 286,900 222,900 0,612" fill="url(#cobaltRibbonLower)"></polygon>
          <polygon points="0,608 226,900 206,900 0,632" fill="url(#goldLinear)"></polygon>
        </g>

        
        <g transform="translate(133, 94)">
          <polygon points="40,0 0,23 0,69 40,92 40,74 15,60 15,32 40,18" fill="#1857b8"></polygon>
          <polygon points="40,0 80,23 80,69 40,92 40,74 65,60 65,32 40,18" fill="#68778a"></polygon>
          <polygon points="40,24 60,35.5 60,56.5 40,68 20,56.5 20,35.5" fill="#1857b8"></polygon>
        </g>

        
        <g transform="translate(600, 728)" filter="url(#sealShadow)">
          <path d="M-20.4,71.1 L-33.9,65.8 L-46.0,57.9 L-56.4,47.9 L-64.7,36.0 L-70.4,22.7 L-73.5,8.5 L-73.8,-6.0 L-71.2,-20.2 L-65.9,-33.7 L-58.1,-45.9 L-48.0,-56.3 L-36.1,-64.6 L-22.9,-70.4" fill="none" stroke="url(#goldLinear)" strokeWidth="1.6"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-21.6,75.2) rotate(-98.0)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-19.5,68.1) rotate(-56.0)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-35.8,69.5) rotate(-86.8)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-32.4,63.0) rotate(-44.8)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-48.6,61.2) rotate(-75.5)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-44.0,55.4) rotate(-33.5)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-59.6,50.6) rotate(-64.3)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-54.0,45.8) rotate(-22.3)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-68.3,38.0) rotate(-53.1)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-61.9,34.4) rotate(-11.1)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-74.4,24.0) rotate(-41.8)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-67.4,21.7) rotate(0.2)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-77.7,9.0) rotate(-30.6)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-70.3,8.2) rotate(11.4)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-77.9,-6.3) rotate(-19.4)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-70.6,-5.7) rotate(22.6)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-75.2,-21.4) rotate(-8.2)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-68.1,-19.3) rotate(33.8)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-69.6,-35.6) rotate(3.1)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-63.0,-32.2) rotate(45.1)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-61.4,-48.5) rotate(14.3)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-55.6,-43.9) rotate(56.3)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-50.7,-59.5) rotate(25.5)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-45.9,-53.9) rotate(67.5)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-38.2,-68.2) rotate(36.8)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(-34.6,-61.8) rotate(78.8)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(-24.2,-74.4) rotate(48.0)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M20.4,71.1 L33.9,65.8 L46.0,57.9 L56.4,47.9 L64.7,36.0 L70.4,22.7 L73.5,8.5 L73.8,-6.0 L71.2,-20.2 L65.9,-33.7 L58.1,-45.9 L48.0,-56.3 L36.1,-64.6 L22.9,-70.4" fill="none" stroke="url(#goldLinear)" strokeWidth="1.6"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(21.6,75.2) rotate(98.0)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(19.5,68.1) rotate(56.0)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(35.8,69.5) rotate(86.8)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(32.4,63.0) rotate(44.8)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(48.6,61.2) rotate(75.5)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(44.0,55.4) rotate(33.5)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(59.6,50.6) rotate(64.3)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(54.0,45.8) rotate(22.3)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(68.3,38.0) rotate(53.1)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(61.9,34.4) rotate(11.1)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(74.4,24.0) rotate(41.8)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(67.4,21.7) rotate(-0.2)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(77.7,9.0) rotate(30.6)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(70.3,8.2) rotate(-11.4)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(77.9,-6.3) rotate(19.4)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(70.6,-5.7) rotate(-22.6)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(75.2,-21.4) rotate(8.2)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(68.1,-19.3) rotate(-33.8)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(69.6,-35.6) rotate(-3.1)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(63.0,-32.2) rotate(-45.1)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(61.4,-48.5) rotate(-14.3)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(55.6,-43.9) rotate(-56.3)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(50.7,-59.5) rotate(-25.5)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(45.9,-53.9) rotate(-67.5)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(38.2,-68.2) rotate(-36.8)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M0,-12.0 C3.6,-5.5 3.6,4.0 0,10.0 C-3.4,4.0 -3.4,-5.5 0,-12.0 Z" transform="translate(34.6,-61.8) rotate(-78.8)" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.5"></path>
<path d="M0,-13.5 C4.2,-6.5 4.2,4.5 0,11.5 C-3.8,4.5 -3.8,-6.5 0,-13.5 Z" transform="translate(24.2,-74.4) rotate(-48.0)" fill="url(#goldLeafGrad)" stroke="#855e14" strokeWidth="0.55"></path>
<path d="M-24,83 C-12,75 -5,72 0,72 C5,72 12,75 24,83 C16,85 7,80 0,76 C-7,80 -16,85 -24,83 Z" fill="url(#goldLinear)" stroke="#855e14" strokeWidth="0.7"></path>
<path d="M0.00,-69.90 L2.73,-69.39 L5.35,-68.03 L7.85,-66.30 L10.26,-64.75 L12.70,-63.85 L15.30,-63.75 L18.12,-64.25 L21.09,-64.90 L24.03,-65.15 L26.75,-64.58 L29.07,-63.06 L30.98,-60.80 L32.62,-58.25 L34.25,-55.90 L36.17,-54.13 L38.53,-53.04 L41.33,-52.43 L44.32,-51.89 L47.14,-50.99 L49.43,-49.43 L50.99,-47.14 L51.89,-44.32 L52.43,-41.33 L53.04,-38.53 L54.13,-36.17 L55.90,-34.25 L58.25,-32.62 L60.80,-30.98 L63.06,-29.07 L64.58,-26.75 L65.15,-24.03 L64.90,-21.09 L64.25,-18.12 L63.75,-15.30 L63.85,-12.70 L64.75,-10.26 L66.30,-7.85 L68.03,-5.35 L69.39,-2.73 L69.90,-0.00 L69.39,2.73 L68.03,5.35 L66.30,7.85 L64.75,10.26 L63.85,12.70 L63.75,15.30 L64.25,18.12 L64.90,21.09 L65.15,24.03 L64.58,26.75 L63.06,29.07 L60.80,30.98 L58.25,32.62 L55.90,34.25 L54.13,36.17 L53.04,38.53 L52.43,41.33 L51.89,44.32 L50.99,47.14 L49.43,49.43 L47.14,50.99 L44.32,51.89 L41.33,52.43 L38.53,53.04 L36.17,54.13 L34.25,55.90 L32.62,58.25 L30.98,60.80 L29.07,63.06 L26.75,64.58 L24.03,65.15 L21.09,64.90 L18.12,64.25 L15.30,63.75 L12.70,63.85 L10.26,64.75 L7.85,66.30 L5.35,68.03 L2.73,69.39 L0.00,69.90 L-2.73,69.39 L-5.35,68.03 L-7.85,66.30 L-10.26,64.75 L-12.70,63.85 L-15.30,63.75 L-18.12,64.25 L-21.09,64.90 L-24.03,65.15 L-26.75,64.58 L-29.07,63.06 L-30.98,60.80 L-32.62,58.25 L-34.25,55.90 L-36.17,54.13 L-38.53,53.04 L-41.33,52.43 L-44.32,51.89 L-47.14,50.99 L-49.43,49.43 L-50.99,47.14 L-51.89,44.32 L-52.43,41.33 L-53.04,38.53 L-54.13,36.17 L-55.90,34.25 L-58.25,32.62 L-60.80,30.98 L-63.06,29.07 L-64.58,26.75 L-65.15,24.03 L-64.90,21.09 L-64.25,18.12 L-63.75,15.30 L-63.85,12.70 L-64.75,10.26 L-66.30,7.85 L-68.03,5.35 L-69.39,2.73 L-69.90,0.00 L-69.39,-2.73 L-68.03,-5.35 L-66.30,-7.85 L-64.75,-10.26 L-63.85,-12.70 L-63.75,-15.30 L-64.25,-18.12 L-64.90,-21.09 L-65.15,-24.03 L-64.58,-26.75 L-63.06,-29.07 L-60.80,-30.98 L-58.25,-32.62 L-55.90,-34.25 L-54.13,-36.17 L-53.04,-38.53 L-52.43,-41.33 L-51.89,-44.32 L-50.99,-47.14 L-49.43,-49.43 L-47.14,-50.99 L-44.32,-51.89 L-41.33,-52.43 L-38.53,-53.04 L-36.17,-54.13 L-34.25,-55.90 L-32.62,-58.25 L-30.98,-60.80 L-29.07,-63.06 L-26.75,-64.58 L-24.03,-65.15 L-21.09,-64.90 L-18.12,-64.25 L-15.30,-63.75 L-12.70,-63.85 L-10.26,-64.75 L-7.85,-66.30 L-5.35,-68.03 L-2.73,-69.39 Z" fill="#0d2658" stroke="url(#goldLinear)" strokeWidth="2.2"></path>
<path d="M0.00,-65.40 L2.56,-65.04 L5.04,-64.10 L7.44,-62.87 L9.78,-61.74 L12.13,-61.00 L14.59,-60.78 L17.18,-60.93 L19.87,-61.15 L22.53,-61.07 L25.03,-60.42 L27.25,-59.12 L29.19,-57.29 L30.93,-55.23 L32.66,-53.29 L34.56,-51.72 L36.74,-50.57 L39.19,-49.71 L41.76,-48.89 L44.19,-47.80 L46.24,-46.24 L47.80,-44.19 L48.89,-41.76 L49.71,-39.19 L50.57,-36.74 L51.72,-34.56 L53.29,-32.66 L55.23,-30.93 L57.29,-29.19 L59.12,-27.25 L60.42,-25.03 L61.07,-22.53 L61.15,-19.87 L60.93,-17.18 L60.78,-14.59 L61.00,-12.13 L61.74,-9.78 L62.87,-7.44 L64.10,-5.04 L65.04,-2.56 L65.40,-0.00 L65.04,2.56 L64.10,5.04 L62.87,7.44 L61.74,9.78 L61.00,12.13 L60.78,14.59 L60.93,17.18 L61.15,19.87 L61.07,22.53 L60.42,25.03 L59.12,27.25 L57.29,29.19 L55.23,30.93 L53.29,32.66 L51.72,34.56 L50.57,36.74 L49.71,39.19 L48.89,41.76 L47.80,44.19 L46.24,46.24 L44.19,47.80 L41.76,48.89 L39.19,49.71 L36.74,50.57 L34.56,51.72 L32.66,53.29 L30.93,55.23 L29.19,57.29 L27.25,59.12 L25.03,60.42 L22.53,61.07 L19.87,61.15 L17.18,60.93 L14.59,60.78 L12.13,61.00 L9.78,61.74 L7.44,62.87 L5.04,64.10 L2.56,65.04 L0.00,65.40 L-2.56,65.04 L-5.04,64.10 L-7.44,62.87 L-9.78,61.74 L-12.13,61.00 L-14.59,60.78 L-17.18,60.93 L-19.87,61.15 L-22.53,61.07 L-25.03,60.42 L-27.25,59.12 L-29.19,57.29 L-30.93,55.23 L-32.66,53.29 L-34.56,51.72 L-36.74,50.57 L-39.19,49.71 L-41.76,48.89 L-44.19,47.80 L-46.24,46.24 L-47.80,44.19 L-48.89,41.76 L-49.71,39.19 L-50.57,36.74 L-51.72,34.56 L-53.29,32.66 L-55.23,30.93 L-57.29,29.19 L-59.12,27.25 L-60.42,25.03 L-61.07,22.53 L-61.15,19.87 L-60.93,17.18 L-60.78,14.59 L-61.00,12.13 L-61.74,9.78 L-62.87,7.44 L-64.10,5.04 L-65.04,2.56 L-65.40,0.00 L-65.04,-2.56 L-64.10,-5.04 L-62.87,-7.44 L-61.74,-9.78 L-61.00,-12.13 L-60.78,-14.59 L-60.93,-17.18 L-61.15,-19.87 L-61.07,-22.53 L-60.42,-25.03 L-59.12,-27.25 L-57.29,-29.19 L-55.23,-30.93 L-53.29,-32.66 L-51.72,-34.56 L-50.57,-36.74 L-49.71,-39.19 L-48.89,-41.76 L-47.80,-44.19 L-46.24,-46.24 L-44.19,-47.80 L-41.76,-48.89 L-39.19,-49.71 L-36.74,-50.57 L-34.56,-51.72 L-32.66,-53.29 L-30.93,-55.23 L-29.19,-57.29 L-27.25,-59.12 L-25.03,-60.42 L-22.53,-61.07 L-19.87,-61.15 L-17.18,-60.93 L-14.59,-60.78 L-12.13,-61.00 L-9.78,-61.74 L-7.44,-62.87 L-5.04,-64.10 L-2.56,-65.04 Z" fill="url(#goldLinear)" stroke="#7c5711" strokeWidth="0.8"></path>
<circle cx="0" cy="0" r="60" fill="url(#sealBlueDisc)" stroke="url(#goldLinear)" strokeWidth="2.2"></circle>
<circle cx="0" cy="0" r="54.5" fill="none" stroke="url(#goldLinear)" strokeWidth="0.9" strokeOpacity="0.9"></circle>
<circle cx="0" cy="0" r="34" fill="#0c2659" stroke="url(#goldLinear)" strokeWidth="1.4"></circle>
<circle cx="0" cy="0" r="31" fill="none" stroke="url(#goldLinear)" strokeWidth="0.7" strokeOpacity="0.75"></circle>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-12.0,44.8) rotate(-103.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-10.9,40.6) rotate(-49.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-19.9,41.9) rotate(-92.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-18.0,37.9) rotate(-38.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-27.2,37.6) rotate(-82.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-24.6,34.0) rotate(-28.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-33.5,32.1) rotate(-71.7)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-30.4,29.0) rotate(-17.7)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-38.8,25.5) rotate(-61.3)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-35.1,23.1) rotate(-7.3)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-42.8,18.0) rotate(-50.9)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-38.7,16.3) rotate(3.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-45.3,10.0) rotate(-40.4)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-41.0,9.0) rotate(13.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-46.4,1.6) rotate(-30.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-42.0,1.5) rotate(24.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-45.9,-6.8) rotate(-19.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-41.5,-6.2) rotate(34.4)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-43.9,-15.0) rotate(-9.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-39.7,-13.6) rotate(44.9)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-40.5,-22.7) rotate(1.3)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-36.6,-20.5) rotate(55.3)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-35.7,-29.6) rotate(11.7)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-32.3,-26.8) rotate(65.7)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-29.7,-35.6) rotate(22.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-26.9,-32.2) rotate(76.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-22.8,-40.4) rotate(32.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-20.6,-36.6) rotate(86.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(-15.1,-43.9) rotate(43.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(-13.7,-39.7) rotate(97.0)" fill="url(#goldLinear)"></path>
<path d="M-11.4,42.7 L-19.0,39.9 L-25.9,35.8 L-31.9,30.5 L-36.9,24.3 L-40.7,17.2 L-43.2,9.5 L-44.2,1.5 L-43.7,-6.5 L-41.8,-14.3 L-38.6,-21.6 L-34.0,-28.2 L-28.3,-33.9 L-21.7,-38.5 L-14.4,-41.8" fill="none" stroke="url(#goldLinear)" strokeWidth="0.9"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(12.0,44.8) rotate(103.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(10.9,40.6) rotate(49.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(19.9,41.9) rotate(92.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(18.0,37.9) rotate(38.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(27.2,37.6) rotate(82.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(24.6,34.0) rotate(28.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(33.5,32.1) rotate(71.7)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(30.4,29.0) rotate(17.7)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(38.8,25.5) rotate(61.3)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(35.1,23.1) rotate(7.3)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(42.8,18.0) rotate(50.9)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(38.7,16.3) rotate(-3.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(45.3,10.0) rotate(40.4)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(41.0,9.0) rotate(-13.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(46.4,1.6) rotate(30.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(42.0,1.5) rotate(-24.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(45.9,-6.8) rotate(19.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(41.5,-6.2) rotate(-34.4)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(43.9,-15.0) rotate(9.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(39.7,-13.6) rotate(-44.9)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(40.5,-22.7) rotate(-1.3)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(36.6,-20.5) rotate(-55.3)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(35.7,-29.6) rotate(-11.7)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(32.3,-26.8) rotate(-65.7)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(29.7,-35.6) rotate(-22.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(26.9,-32.2) rotate(-76.1)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(22.8,-40.4) rotate(-32.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(20.6,-36.6) rotate(-86.6)" fill="url(#goldLinear)"></path>
<path d="M0,-4.6 C1.5,-2 1.5,2 0,4.6 C-1.5,2 -1.5,-2 0,-4.6 Z" transform="translate(15.1,-43.9) rotate(-43.0)" fill="url(#goldLinear)"></path>
<path d="M0,-4.2 C1.4,-1.8 1.4,1.8 0,4.2 C-1.4,1.8 -1.4,-1.8 0,-4.2 Z" transform="translate(13.7,-39.7) rotate(-97.0)" fill="url(#goldLinear)"></path>
<path d="M11.4,42.7 L19.0,39.9 L25.9,35.8 L31.9,30.5 L36.9,24.3 L40.7,17.2 L43.2,9.5 L44.2,1.5 L43.7,-6.5 L41.8,-14.3 L38.6,-21.6 L34.0,-28.2 L28.3,-33.9 L21.7,-38.5 L14.4,-41.8" fill="none" stroke="url(#goldLinear)" strokeWidth="0.9"></path>

      <g transform="translate(-20, -23) scale(0.50)">
        <polygon points="40,0 0,23 0,69 40,92 40,74 15,60 15,32 40,18" fill="url(#goldLinear)" stroke="#7a5610" strokeWidth="1"></polygon>
        <polygon points="40,0 80,23 80,69 40,92 40,74 65,60 65,32 40,18" fill="#8b9bb0" stroke="#5b6b80" strokeWidth="1"></polygon>
        <polygon points="40,24 60,35.5 60,56.5 40,68 20,56.5 20,35.5" fill="url(#goldLinear)" stroke="#7a5610" strokeWidth="1"></polygon>
      </g>
    
        </g>
            </svg>

      {/* ===== Foreground HTML text & signature elements (positions from cert.html) ===== */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: 1200,
          height: 900,
        }}
      >
        {/* Brand name: NULL ORIGIN */}
        <div
          style={{
            position: 'absolute',
            left: 236,
            top: 118,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 48,
            letterSpacing: '0.02em',
            color: TITLE,
            lineHeight: 1,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          NULL ORIGIN
        </div>

        {/* Main certificate heading */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 250,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              display: 'inline-block',
              margin: 0,
              padding: '2px 12px',
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 38,
              letterSpacing: '0.022em',
              color: TITLE,
              textTransform: 'uppercase',
            }}
          >
            CERTIFICATE OF PARTICIPATION
          </h1>
        </div>

        {/* "Proudly presented to" */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 326,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              display: 'inline-block',
              margin: 0,
              padding: '2px 10px',
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: 22,
              color: BODY,
            }}
          >
            Proudly presented to
          </p>
        </div>

        {/* Recipient name */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 384,
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              display: 'inline-block',
              margin: 0,
              padding: '2px 18px',
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: nameFontSize,
              color: TITLE,
              letterSpacing: '0.005em',
              lineHeight: 1.08,
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </h2>
        </div>

        {/* Citation paragraph */}
        <div
          style={{
            position: 'absolute',
            left: 230,
            right: 230,
            top: 494,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              width: 740,
              margin: '0 auto',
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: 19,
              lineHeight: 1.5,
              color: BODY,
            }}
          >
            has actively participated in{' '}
            <b>Cyber Security Quiz 2026</b>, a national-level cybersecurity
            championship organized by <b>Team Null Origin</b>, and is awarded
            the <b style={{ color: ORANGE }}>Certificate of Participation</b>{' '}
            for their active engagement and commitment throughout the
            competition.
          </p>
        </div>

        {/* Left signature block: Event Convener */}
        <div
          style={{
            position: 'absolute',
            left: 240,
            top: 654,
            width: 230,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 4,
            }}
          >
            <svg
              width="160"
              height="58"
              viewBox="0 0 156 58"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={LEFT_SIGNATURE_PATH}
                stroke="#182334"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              width: 230,
              height: 1.5,
              background: '#2c384a',
              margin: '0 auto 12px auto',
            }}
          />
          <p
            style={{
              margin: 0,
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 19,
              color: BODY,
            }}
          >
            Event Convener
          </p>
          <p
            style={{
              margin: '8px 0 0 0',
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: 18.5,
              color: BODY,
            }}
          >
            NULL ORIGIN
          </p>
        </div>

        {/* Right signature block: Organizing Committee (Kunal's signature) */}
        <div
          style={{
            position: 'absolute',
            left: 730,
            top: 654,
            width: 230,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 4,
            }}
          >
            <img
              src={KUNAL_SIGNATURE_DATA_URI}
              alt="Kunal Bankhele signature"
              style={{ height: 58, width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div
            style={{
              width: 230,
              height: 1.5,
              background: '#2c384a',
              margin: '0 auto 12px auto',
            }}
          />
          <p
            style={{
              margin: 0,
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 19,
              color: BODY,
            }}
          >
            Organizing Committee
          </p>
          <p
            style={{
              margin: '8px 0 0 0',
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: 18.5,
              color: BODY,
            }}
          >
            NULL ORIGIN
          </p>
        </div>
      </div>
    </div>
  );
}
