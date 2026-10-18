export type CompetitionStatus = 'upcoming' | 'live' | 'completed';
export type CompetitionDifficulty = 'Field Operator' | 'Senior Analyst' | 'Zero-Day Specialist' | 'Classified';

export interface Competition {
  id: string;
  title: string;
  description?: string;
  status: CompetitionStatus;
  startTime?: string; // ISO 8601 timestamp
  durationMinutes?: number;
  difficulty?: CompetitionDifficulty;
  participantCount?: number;
  accessType?: 'Open Clearance' | 'Invite Only' | 'Key Required';
  perQuestionTimerSeconds?: number; // default 15 seconds per question
  rules?: string[];
  requirements?: string[];
  quizFormat?: {
    totalQuestions?: number;
    timeLimitMinutes?: number;
    scoringModel?: string;
  };
}

export interface QuizOption {
  id: string;
  label: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  index: number;
  category?: string;
  points?: number;
  prompt: string;
  codeSnippet?: string;
  options: QuizOption[];
  correctOptionId?: string;
  timeLimitSeconds?: number;
}

export type QuestionVisualState = 'unanswered' | 'answered' | 'review' | 'current';

export interface QuizSessionState {
  competitionId: string | null;
  competitionTitle: string | null;
  deadlineTimestamp: number | null; // epoch ms
  currentQuestionIndex: number;
  selectedAnswers: Record<string, string>; // questionId -> optionId
  markedForReview: Record<string, boolean>; // questionId -> boolean
  isSubmitted: boolean;
  submittedAt: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  displayName: string;
  username?: string;
  score: number;
  completionStatus: 'Completed' | 'In Progress' | 'Verified';
  accuracyPercent?: number;
  completionTimeSeconds?: number;
  rankDelta?: number; // positive = moved up, negative = moved down
  isCurrentUser?: boolean;
}

export interface OperatorProfile {
  displayName: string;
  username: string;
  biography: string;
  avatarUrl: string | null;
  avatarPreset: string;
  createdAt: string | null;
  isVerified: boolean | null;
  strongestCategories: string[];
  badges: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: string;
  }>;
}

export interface CompetitionResult {
  id: string;
  competitionId: string;
  competitionName: string;
  completedAt: string;
  finalScore: number;
  maxScore?: number;
  rank?: number;
  accuracyPercent?: number;
  timeTakenSeconds?: number;
  correctCount?: number;
  incorrectCount?: number;
  topicBreakdown?: Array<{
    topic: string;
    scorePercent: number;
  }>;
}

export interface ActivityRecord {
  id: string;
  type: 'registration' | 'submission' | 'ranking' | 'profile_update';
  title: string;
  timestamp: string;
  detail?: string;
}

export interface AppSettings {
  appearance: {
    gridOverlay: boolean;
    scanlineOverlay: boolean;
    compactDensity: boolean;
  };
  notifications: {
    competitionStartAlerts: boolean;
    leaderboardUpdates: boolean;
    resultPublication: boolean;
  };
  audio: {
    soundEffectsEnabled: boolean;
    countdownChimeEnabled: boolean;
  };
  accessibility: {
    reducedMotion: boolean;
    highContrastBorders: boolean;
    largeMonospaceText: boolean;
  };
  privacy: {
    publicOperatorProfile: boolean;
    displayLeaderboardHandle: boolean;
    shareTelemetryLogs: boolean;
  };
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'alert';
}
