/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { CompetitionsPage } from './pages/CompetitionsPage';
import { QuizPage } from './pages/QuizPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { CertificationPage } from './pages/CertificationPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { VerifyPage } from './pages/VerifyPage';
import { StandingsPage } from './pages/StandingsPage';
import { RouteSeo } from './components/common/RouteSeo';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <RouteSeo />
        <Routes>
          {/*
            Hidden certificate verification page. It is deliberately NOT
            inside AppShell and NOT linked anywhere in the site frontend
            (no nav item, no footer link, no dashboard entry). It only
            opens when someone scans the QR code printed on a certificate,
            which encodes /verify/<certId>. No login is required.
          */}
          <Route path="/verify/:certId" element={<VerifyPage />} />
          <Route path="/" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="competitions" element={<CompetitionsPage />} />
            <Route path="arena" element={<Navigate to="/competitions" replace />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="standings" element={<StandingsPage />} />
            <Route path="standings/:competitionId" element={<StandingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="results" element={<Navigate to="/profile" replace />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="certification" element={<CertificationPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
