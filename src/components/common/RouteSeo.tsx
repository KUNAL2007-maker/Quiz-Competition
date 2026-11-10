import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageMetaConfig {
  title: string;
  description: string;
  canonical: string;
}

const BASE_URL = 'https://www.nullorigin.live';

const ROUTE_META: Record<string, PageMetaConfig> = {
  '/': {
    title: 'Null Origin — Online Quiz Competition Platform | Live Tournaments & Certificates',
    description:
      'Compete in timed online quiz competitions across Technology, Science, Cybersecurity, General Knowledge, and Academic arenas. Climb the live leaderboard, test your speed, and earn verified certificates on Null Origin.',
    canonical: `${BASE_URL}/`,
  },
  '/competitions': {
    title: 'Competitions Directory — Null Origin',
    description:
      'Explore upcoming, live, and completed online quiz competitions across Technology, Science, General Knowledge, and Academic disciplines on Null Origin.',
    canonical: `${BASE_URL}/competitions`,
  },
  '/leaderboard': {
    title: 'Live Scoreboard — Null Origin',
    description:
      'Track live participant rankings, scores, completion times, and tournament standings across all competitions on Null Origin.',
    canonical: `${BASE_URL}/leaderboard`,
  },
  '/standings': {
    title: 'Official Final Standings & Laureates — Null Origin',
    description:
      'Official final rankings, verified scores, and laureates for completed tournaments on Null Origin.',
    canonical: `${BASE_URL}/standings`,
  },
  '/certification': {
    title: 'Certificate Verification & Registry — Null Origin',
    description:
      'Verify authentic credentials and official certificates of completion or achievement issued by Null Origin for accredited quiz competitions.',
    canonical: `${BASE_URL}/certification`,
  },
  '/about': {
    title: 'About Null Origin — Online Quiz Tournament Arena',
    description:
      'Learn about Null Origin, our mission to empower competitive minds, our multi-category tournament architecture, and anti-cheat standards.',
    canonical: `${BASE_URL}/about`,
  },
  '/privacy': {
    title: 'Privacy Policy — Null Origin',
    description:
      'Review the privacy policy, data handling practices, and security principles of the Null Origin quiz platform.',
    canonical: `${BASE_URL}/privacy`,
  },
  '/terms': {
    title: 'Terms & Conditions — Null Origin',
    description:
      'Review the official tournament regulations, user agreement, anti-cheat rules, and certificate policies of Null Origin.',
    canonical: `${BASE_URL}/terms`,
  },
  '/login': {
    title: 'Sign In — Null Origin',
    description:
      'Access your Null Origin account to participate in live quiz tournaments, review competition history, and download verified certificates.',
    canonical: `${BASE_URL}/login`,
  },
  '/profile': {
    title: 'Competitor Profile & Results — Null Origin',
    description:
      'View your quiz performance analytics, competition history, rank statistics, and earned certificates on Null Origin.',
    canonical: `${BASE_URL}/profile`,
  },
  '/quiz': {
    title: 'Live Quiz Arena — Null Origin',
    description:
      'Active competition test interface with high-integrity timers, randomized question sets, and real-time score calibration.',
    canonical: `${BASE_URL}/quiz`,
  },
  '/settings': {
    title: 'Platform Settings — Null Origin',
    description:
      'Customize your Null Origin experience, terminal audio, display overlays, and security preferences.',
    canonical: `${BASE_URL}/settings`,
  },
  '/admin': {
    title: 'Operations Control Center — Null Origin',
    description:
      'Administrative console for orchestrating competitions, calibrating timers, and monitoring live tournament telemetry.',
    canonical: `${BASE_URL}/admin`,
  },
};

function setOrCreateMeta(selector: string, attrName: string, attrVal: string, content: string) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrVal);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setOrCreateLink(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export const RouteSeo: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const rawPath = location.pathname.replace(/\/+$/, '') || '/';
    let meta = ROUTE_META[rawPath];
    if (!meta && rawPath.startsWith('/verify')) {
      meta = {
        title: 'Verify Credential — Null Origin',
        description: 'Verify authentic credentials and certificate validity on Null Origin.',
        canonical: `${BASE_URL}${rawPath}`,
      };
    }
    if (!meta && rawPath.startsWith('/standings')) {
      meta = {
        title: 'Official Final Standings — Null Origin',
        description: 'Review official tournament final standings, top 3 laureates, and verified participant rankings.',
        canonical: `${BASE_URL}${rawPath}`,
      };
    }
    if (!meta) {
      meta = {
        title: 'Null Origin — Online Quiz Competition Platform',
        description:
          'Compete in timed online quiz competitions, climb the live leaderboard, and earn verified certificates on Null Origin.',
        canonical: `${BASE_URL}${rawPath}`,
      };
    }

    // 1. Update Title
    document.title = meta.title;

    // 2. Standard Meta Tags
    setOrCreateMeta('meta[name="description"]', 'name', 'description', meta.description);

    // 3. Open Graph Tags
    setOrCreateMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    setOrCreateMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
    setOrCreateMeta('meta[property="og:url"]', 'property', 'og:url', meta.canonical);

    // 4. Twitter Tags
    setOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
    setOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);

    // 5. Canonical Link
    setOrCreateLink('canonical', meta.canonical);

    // 6. Structured Data Breadcrumbs
    let breadcrumbScript = document.getElementById('route-breadcrumb-schema') as HTMLScriptElement | null;
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.id = 'route-breadcrumb-schema';
      breadcrumbScript.type = 'application/ld+json';
      document.head.appendChild(breadcrumbScript);
    }

    const pathSegments = rawPath.split('/').filter(Boolean);
    const itemListElement = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${BASE_URL}/`,
      },
    ];

    let currentPath = '';
    pathSegments.forEach((segment, idx) => {
      currentPath += `/${segment}`;
      const segmentName = segment.charAt(0).toUpperCase() + segment.slice(1);
      itemListElement.push({
        '@type': 'ListItem',
        position: idx + 2,
        name: segmentName,
        item: `${BASE_URL}${currentPath}`,
      });
    });

    const breadcrumbJson = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement,
    };
    breadcrumbScript.text = JSON.stringify(breadcrumbJson);
  }, [location.pathname]);

  return null;
};
