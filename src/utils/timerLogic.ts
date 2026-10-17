export interface CountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isValid: boolean;
  progressPercent: number;
}

/**
 * Pure drift-free countdown calculation from a target timestamp and current epoch milliseconds.
 * Never invents a timestamp if targetTimestamp is null, empty, or invalid.
 */
export function calculateCountdown(
  targetTimestamp: string | number | null | undefined,
  nowMs: number = Date.now(),
  referenceTotalDurationMs: number = 3600 * 1000
): CountdownParts {
  if (targetTimestamp === null || targetTimestamp === undefined || targetTimestamp === '') {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: false,
      isValid: false,
      progressPercent: 0,
    };
  }

  const parsedTarget =
    typeof targetTimestamp === 'number'
      ? targetTimestamp
      : Date.parse(String(targetTimestamp));

  if (!Number.isFinite(parsedTarget) || Number.isNaN(parsedTarget)) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: false,
      isValid: false,
      progressPercent: 0,
    };
  }

  const diffMs = Math.max(0, parsedTarget - nowMs);
  const isExpired = parsedTarget <= nowMs;

  const totalSeconds = Math.ceil(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const safeRef = referenceTotalDurationMs > 0 ? referenceTotalDurationMs : 3600 * 1000;
  const elapsedRatio = Math.min(1, Math.max(0, 1 - diffMs / safeRef));
  const progressPercent = isExpired ? 100 : Math.round(elapsedRatio * 100);

  return {
    totalMs: diffMs,
    days,
    hours,
    minutes,
    seconds,
    isExpired,
    isValid: true,
    progressPercent,
  };
}

export function formatPad(num: number): string {
  return String(Math.max(0, Math.floor(num))).padStart(2, '0');
}

export function formatDurationSeconds(totalSeconds: number | undefined | null): string {
  if (totalSeconds === undefined || totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '—';
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    return `${formatPad(hrs)}:${formatPad(mins % 60)}:${formatPad(secs)}`;
  }
  return `${formatPad(mins)}:${formatPad(secs)}`;
}

export interface QuestionSummaryCounts {
  total: number;
  answered: number;
  unanswered: number;
  markedForReview: number;
  completionPercent: number;
}

export function calculateQuizProgress(
  questionIds: string[],
  selectedAnswers: Record<string, string>,
  markedForReview: Record<string, boolean>
): QuestionSummaryCounts {
  const total = questionIds.length;
  if (total === 0) {
    return {
      total: 0,
      answered: 0,
      unanswered: 0,
      markedForReview: 0,
      completionPercent: 0,
    };
  }

  let answered = 0;
  let reviewCount = 0;

  for (const id of questionIds) {
    if (selectedAnswers[id] !== undefined && selectedAnswers[id] !== '') {
      answered += 1;
    }
    if (markedForReview[id]) {
      reviewCount += 1;
    }
  }

  const unanswered = Math.max(0, total - answered);
  const completionPercent = Math.round((answered / total) * 100);

  return {
    total,
    answered,
    unanswered,
    markedForReview: reviewCount,
    completionPercent,
  };
}

export interface ProfileValidationResult {
  isValid: boolean;
  errors: {
    displayName?: string;
    username?: string;
    biography?: string;
  };
}

export function validateOperatorProfileInput(input: {
  displayName: string;
  username: string;
  biography: string;
}): ProfileValidationResult {
  const errors: ProfileValidationResult['errors'] = {};
  const trimmedName = input.displayName.trim();
  const trimmedUser = input.username.trim();
  const trimmedBio = input.biography.trim();

  if (trimmedName.length > 0 && trimmedName.length < 2) {
    errors.displayName = 'Display name must be at least 2 characters.';
  } else if (trimmedName.length > 48) {
    errors.displayName = 'Display name cannot exceed 48 characters.';
  }

  if (trimmedUser.length > 0 && !/^[a-zA-Z0-9_.-]{3,24}$/.test(trimmedUser)) {
    errors.username = 'Callsign handle must be 3–24 alphanumeric characters, underscores, dots, or hyphens.';
  }

  if (trimmedBio.length > 280) {
    errors.biography = 'Operator biography cannot exceed 280 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
