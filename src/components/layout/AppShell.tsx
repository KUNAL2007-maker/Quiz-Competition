import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToastContainer } from '../ui/ToastContainer';
import { useAppContext } from '../../context/AppContext';

export const AppShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { settings } = useAppContext();

  return (
    <div
      className={`min-h-screen flex bg-[#111110] text-[#f5f5f2] ${
        settings.appearance.gridOverlay ? 'cyber-grid-bg' : ''
      } ${settings.appearance.scanlineOverlay ? 'cyber-scanline' : ''}`}
    >
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main
          className={`flex-1 ${
            settings.appearance.compactDensity ? 'p-4 md:p-6' : 'p-4 sm:p-6 md:p-8 lg:p-10'
          } max-w-[1400px] w-full mx-auto`}
        >
          <Outlet />
        </main>

        <Footer />
      </div>

      <ToastContainer />
    </div>
  );
};
