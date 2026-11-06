# Security Specification — Null Origin

## 1. Data Invariants
1. **Default Deny**: All unlisted paths are strictly denied (`allow read, write: if false;`).
2. **Verified Identity**: All write mutations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Owner Binding (`profiles/{userId}`)**: A profile document's ID `{userId}` and `ownerId` field must strictly equal `request.auth.uid`. `createdAt` and `ownerId` are immutable on update.
4. **Result Isolation (`results/{resultId}`)**: Assessment results are readable (`get`, `list`) and creatable strictly when `resource.data.ownerId == request.auth.uid` (or `incoming().ownerId == request.auth.uid`), and are immutable once recorded (`allow update, delete: if false;`).
5. **Leaderboard Integrity (`leaderboard/{entryId}`)**: Entries must reference an existing competition via `exists(/databases/$(database)/documents/competitions/$(incoming().competitionId))`, bind `ownerId == request.auth.uid`, enforce server timestamps (`createdAt == request.time`), and lock terminal completion status (`Completed` or `Verified` cannot be mutated).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempting to create `/profiles/{uid}`.
2. **Cross-User Profile Hijack**: Authenticated user `uid_A` attempting to create `/profiles/uid_B` with `ownerId: "uid_B"`.
3. **Shadow Field Injection on Profile**: Creating `/profiles/{uid}` with an undeclared field `"isAdmin": true`.
4. **Callsign Regex Bypass**: Creating `/profiles/{uid}` with `username: "bad handle!@#"`.
5. **Biography Overflow (Denial of Wallet)**: Updating `/profiles/{uid}` with a 5,000-character `biography`.
6. **Immutable `createdAt` Tampering**: Updating `/profiles/{uid}` while changing `createdAt` or `ownerId`.
7. **Client Timestamp Forgery**: Creating `/profiles/{uid}` with a past or future timestamp instead of `request.time`.
8. **Orphaned Leaderboard Write**: Creating `/leaderboard/entry1` referencing a non-existent `competitionId`.
9. **Score Manipulation on Terminal Leaderboard Entry**: Updating `/leaderboard/entry1` when `existing().completionStatus == 'Completed'`.
10. **Cross-User Result Scraping**: Listing `/results` without filtering `resource.data.ownerId == request.auth.uid`.
11. **Result Tampering After Submission**: Attempting to `update` or `delete` an existing `/results/{resultId}` document.
12. **ID Poisoning Attack**: Attempting to access a document with a 500-character malformed ID containing special characters.
