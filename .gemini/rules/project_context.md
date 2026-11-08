# Null Origin — Cybersecurity Competition Platform (Cyber Quiz 2026)

## Platform Overview
- **Repository Root:** `Quiz-Competition`
- **Domain:** `https://www.nullorigin.live`
- **Primary Tournament ID:** `comp_1793963656835` ("Cyber Quiz 2026")
- **Tech Stack:** React 19, TypeScript, Vite / Rolldown, Tailwind CSS, Firebase Firestore & Auth, Vercel

## Critical Business & Architectural Rules
1. **Single Attempt Enforcement:**
   - One attempt per competitor per competition. Locked across UID, email, and local storage (`completed_comp_*`).
   - Practice simulation remains repeatable.

2. **Scoring & Leaderboard:**
   - 30 questions, 100 points each, 3,000 max score. No negative marks.
   - Tie-breaker: 1st by score (descending), 2nd by completion time (seconds ascending), 3rd by submission timestamp (`createdAt`).
   - Authentic positive scores (> 0) must never be overwritten or diminished.
   - Glitch entries are calibrated fairly via `src/utils/leaderboardCalibration.ts`.
   - Test entries under `Hafiz Mujawar` are strictly excluded from rankings.

3. **Firestore Security Queries:**
   - Public leaderboard query requires `where('score', '>=', 0)` to comply with Firestore security rules.
   - `leaderboardSeed.json` provides zero-latency fallback data.

4. **Tournament Concluded Handling:**
   - Quizzes past `endTime` display "Tournament Concluded" status and route users to the leaderboard.
