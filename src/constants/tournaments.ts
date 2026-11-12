import { Competition } from '../types';

export const CYBER_QUIZ_COMP_ID = 'comp_1793963656835';
export const CYBER_DEFENSE_COMP_ID = 'comp_cyber_defense_2026';

export const CYBER_DEFENSE_CHALLENGE: Competition = {
  id: CYBER_DEFENSE_COMP_ID,
  title: 'Cyber Defense Challenge 2026',
  description:
    'Official live cybersecurity competition round. 10 tactical challenges covering Web Security, Network Forensics, Applied Cryptography, Cloud IAM, and Incident Response. Successfully concluded on November 12, 2026.',
  status: 'completed',
  startTime: '2026-11-11T00:00:00.000Z',
  endTime: '2026-11-12T12:00:00.000Z',
  durationMinutes: 3.5,
  difficulty: 'Senior Analyst',
  accessType: 'Open Clearance',
  participantCount: 121,
  perQuestionTimerSeconds: 20,
  rules: [
    'Strict forward progression without back navigation',
    '20 seconds allocated per question',
    '10 high-impact cybersecurity scenarios across core domains',
    'Completion time and early submission serve as tie-breakers',
  ],
  quizFormat: {
    totalQuestions: 10,
    timeLimitMinutes: 3.5,
    passingScore: 700,
    scoringModel: '100 points per question (1000 max), completion time tie-breaker',
  },
};

export const LIVE_CYBER_DEFENSE_CHALLENGE: Competition = CYBER_DEFENSE_CHALLENGE;

export const CYBER_DEFENSE_TOP_WINNERS = [
  {
    rank: '1st Place',
    title: 'Tournament Champion',
    name: 'Kunal Bankhele',
    username: 'Kunal',
    score: 1000,
    accuracyPercent: 100,
    completionTimeSeconds: 111,
    certId: 'NO26-EXC-001-KB',
    badge: 'Gold Medalist',
  },
  {
    rank: '1st Runner Up',
    title: 'Vice Champion',
    name: 'Sneha Deshmukh',
    username: 'sneha_deshmukh',
    score: 900,
    accuracyPercent: 90,
    completionTimeSeconds: 115,
    certId: 'NO26-EXC-002-SD',
    badge: 'Silver Medalist',
  },
  {
    rank: '2nd Runner Up',
    title: 'Third Laureate',
    name: 'Aisha Chawla',
    username: 'aisha_chawla',
    score: 900,
    accuracyPercent: 90,
    completionTimeSeconds: 117,
    certId: 'NO26-EXC-003-AC',
    badge: 'Bronze Medalist',
  },
];

export const ARCHIVED_CYBER_QUIZ: Competition = {
  id: CYBER_QUIZ_COMP_ID,
  title: 'Cyber Security Quiz 2026',
  description:
    'Official collegiate cybersecurity tournament covering Cryptography, Digital Forensics, Network Exploitation, and Defense. Successfully concluded on November 8, 2026.',
  status: 'completed',
  startTime: '2026-11-08T06:30:00.000Z',
  endTime: '2026-11-08T11:30:00.000Z',
  durationMinutes: 7.5,
  difficulty: 'Senior Analyst',
  accessType: 'Open Clearance',
  participantCount: 62,
  perQuestionTimerSeconds: 15,
  rules: [
    'Strict forward progression without back navigation',
    '15 seconds timer allocated per question',
    '30 questions selected deterministically',
  ],
  quizFormat: {
    totalQuestions: 30,
    timeLimitMinutes: 7.5,
    scoringModel: '100 points per question, completion time tie-breaker',
  },
};

export const CYBER_QUIZ_TOP_WINNERS = [
  {
    rank: '1st Place',
    title: 'Tournament Champion',
    name: 'Ashaz Ansari',
    username: 'itzichigo4u',
    score: 3000,
    accuracyPercent: 100,
    completionTimeSeconds: 76,
    certId: 'NO26-EXC-784-AA',
    badge: 'Gold Medalist',
  },
  {
    rank: '1st Runner Up',
    title: 'Vice Champion',
    name: 'Keerthana K',
    username: 'keeru_2007',
    score: 3000,
    accuracyPercent: 100,
    completionTimeSeconds: 79,
    certId: 'NO26-EXC-593-KS',
    badge: 'Silver Medalist',
  },
  {
    rank: '2nd Runner Up',
    title: 'Third Laureate',
    name: 'Chayesh Kumar',
    username: 'chayesh',
    score: 3000,
    accuracyPercent: 100,
    completionTimeSeconds: 88,
    certId: 'NO26-EXC-041-CK',
    badge: 'Bronze Medalist',
  },
];
