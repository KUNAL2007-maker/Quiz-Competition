import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#252D38] bg-[#0C1017]/80 py-4 px-4 sm:px-8 mt-auto">
      <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#929DAC]">
        {/* Brand & Hosting Notice */}
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#B6FF3B] shrink-0" />
          <span className="font-display font-medium text-[#F0F3F7]">AEGIS CIPHER</span>
          <span>·</span>
          <span className="font-mono text-[11px] text-[#929DAC]/80">
            Hosted securely via Google Cloud & Firebase
          </span>
        </div>

        {/* Small Bottom Links */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <Link
            to="/about"
            className="text-[#929DAC] hover:text-[#B6FF3B] transition-colors"
          >
            About Us
          </Link>
          <span className="text-[#252D38]">|</span>
          <Link
            to="/privacy"
            className="text-[#929DAC] hover:text-[#B6FF3B] transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-[#252D38]">|</span>
          <Link
            to="/competitions"
            className="text-[#929DAC] hover:text-[#F0F3F7] transition-colors"
          >
            Competitions
          </Link>
          <span className="text-[#252D38]">|</span>
          <a
            href="mailto:checkship66@gmail.com"
            className="text-[#929DAC] hover:text-[#36F58A] transition-colors"
          >
            Support
          </a>
        </div>

        {/* Copyright */}
        <div className="text-[10px] text-[#929DAC]/60 font-mono">
          © 2026 Aegis Cipher. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
