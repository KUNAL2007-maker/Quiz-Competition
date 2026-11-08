// Synchronized copy of firestore.rules for in-app administrator deployment and diagnostics.
export const FIRESTORE_RULES_SOURCE = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // 1. Global Safety Net: Default-deny catch-all
    match /{document=**} {
      allow read, write: if false;
    }

    // 2. Reusable Hardened Primitives
    function isSignedIn() {
      return request.auth != null;
    }

    function isVerifiedUser() {
      return isSignedIn() && request.auth.token.email_verified == true;
    }

    function incoming() {
      return request.resource.data;
    }

    function existing() {
      return resource.data;
    }

    function isValidId(id) {
      return id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    function isAdmin() {
      return isSignedIn() && (
        (request.auth.token.email != null && (
          request.auth.token.email in ['checkship66@gmail.com', 'hafizmujawar786@gmail.com', 'kunalbankhele07@gmail.com'] ||
          request.auth.token.email.matches('(?i)^(checkship66@gmail\\.com|hafizmujawar786@gmail\\.com|kunalbankhele07@gmail\\.com)$')
        )) ||
        exists(/databases/$(database)/documents/admins/$(request.auth.uid))
      );
    }

    // 3. Entity Validation Blueprints
    function isValidCompetition(data) {
      return data.keys().hasAll(['title', 'status', 'createdAt']) &&
        data.title is string && data.title.size() >= 1 && data.title.size() <= 200 &&
        (!('description' in data) || (data.description is string && data.description.size() <= 2000)) &&
        data.status is string && data.status in ['upcoming', 'live', 'completed'] &&
        (!('startTime' in data) || (data.startTime is string && data.startTime.size() <= 128)) &&
        (!('durationMinutes' in data) || (data.durationMinutes is number && data.durationMinutes >= 1)) &&
        (!('perQuestionTimerSeconds' in data) || (data.perQuestionTimerSeconds is number && data.perQuestionTimerSeconds >= 1)) &&
        (data.createdAt == request.time || data.createdAt is timestamp);
    }

    function isValidQuestion(data, compId) {
      return data.keys().hasAll(['competitionId', 'index', 'prompt']) &&
        data.competitionId is string && data.competitionId == compId &&
        data.index is number && data.index >= 0 && data.index <= 10000 &&
        (!('category' in data) || (data.category is string && data.category.size() <= 128)) &&
        (!('points' in data) || (data.points is number && data.points >= 0)) &&
        data.prompt is string && data.prompt.size() >= 1 && data.prompt.size() <= 4000 &&
        (!('codeSnippet' in data) || (data.codeSnippet is string && data.codeSnippet.size() <= 8000)) &&
        (!('options' in data) || data.options is list) &&
        (!('correctOptionId' in data) || (data.correctOptionId is string && data.correctOptionId.size() <= 64)) &&
        (!('timeLimitSeconds' in data) || (data.timeLimitSeconds is number && data.timeLimitSeconds >= 1));
    }

    function isValidOperatorProfile(data, userId) {
      return data.keys().hasAll(['ownerId', 'displayName', 'username', 'createdAt', 'updatedAt']) &&
        data.keys().hasOnly(['ownerId', 'displayName', 'username', 'biography', 'avatarPreset', 'whatsappNumber', 'email', 'avatarUrl', 'isProfileComplete', 'createdAt', 'updatedAt']) &&
        data.ownerId is string && data.ownerId == request.auth.uid && data.ownerId == userId &&
        data.displayName is string && data.displayName.size() >= 2 && data.displayName.size() <= 64 &&
        data.username is string && data.username.size() >= 3 && data.username.size() <= 32 && data.username.matches('^[a-zA-Z0-9_.\\-]+$') &&
        (!('whatsappNumber' in data) || (data.whatsappNumber is string && data.whatsappNumber.size() <= 32)) &&
        (!('email' in data) || (data.email is string && data.email.size() <= 120)) &&
        (!('avatarUrl' in data) || (data.avatarUrl is string && data.avatarUrl.size() <= 500)) &&
        (!('isProfileComplete' in data) || data.isProfileComplete is bool) &&
        (!('biography' in data) || (data.biography is string && data.biography.size() <= 280)) &&
        (!('avatarPreset' in data) || (data.avatarPreset is string && data.avatarPreset.size() <= 32)) &&
        data.createdAt is timestamp &&
        data.updatedAt is timestamp;
    }

    function isValidLeaderboardEntry(data) {
      return data.keys().hasAll(['ownerId', 'competitionId', 'displayName', 'score', 'completionStatus', 'createdAt']) &&
        data.keys().hasOnly(['ownerId', 'competitionId', 'displayName', 'username', 'score', 'completionStatus', 'accuracyPercent', 'completionTimeSeconds', 'avatarUrl', 'createdAt']) &&
        data.ownerId is string && data.ownerId == request.auth.uid &&
        isValidId(data.competitionId) &&
        data.displayName is string && data.displayName.size() >= 2 && data.displayName.size() <= 64 &&
        (!('username' in data) || (data.username is string && data.username.size() >= 3 && data.username.size() <= 32 && data.username.matches('^[a-zA-Z0-9_.\\-]+$'))) &&
        (!('avatarUrl' in data) || (data.avatarUrl is string && data.avatarUrl.size() <= 500)) &&
        data.score is number && data.score >= 0 && data.score <= 3000 &&
        data.completionStatus is string && data.completionStatus in ['Completed', 'In Progress', 'Verified'] &&
        (!('accuracyPercent' in data) || (data.accuracyPercent is number && data.accuracyPercent >= 0 && data.accuracyPercent <= 100)) &&
        (!('completionTimeSeconds' in data) || (data.completionTimeSeconds is number && data.completionTimeSeconds >= 0 && data.completionTimeSeconds <= 86400)) &&
        data.createdAt is timestamp;
    }

    function isValidWinnerContact(data) {
      return data.keys().hasAll(['ownerId', 'competitionId', 'displayName', 'score', 'createdAt']) &&
        data.keys().hasOnly(['ownerId', 'competitionId', 'displayName', 'whatsappNumber', 'email', 'score', 'createdAt']) &&
        data.ownerId is string && data.ownerId == request.auth.uid &&
        isValidId(data.competitionId) &&
        data.displayName is string && data.displayName.size() >= 2 && data.displayName.size() <= 64 &&
        (!('whatsappNumber' in data) || (data.whatsappNumber is string && data.whatsappNumber.size() <= 32)) &&
        (!('email' in data) || (data.email is string && data.email.size() <= 120)) &&
        data.score is number && data.score >= 0 && data.score <= 3000 &&
        data.createdAt is timestamp;
    }

    function isValidCompetitionResult(data) {
      return data.keys().hasAll(['ownerId', 'competitionId', 'competitionName', 'finalScore', 'createdAt']) &&
        data.keys().hasOnly(['ownerId', 'competitionId', 'competitionName', 'finalScore', 'maxScore', 'accuracyPercent', 'timeTakenSeconds', 'correctCount', 'incorrectCount', 'createdAt']) &&
        data.ownerId is string && data.ownerId == request.auth.uid &&
        isValidId(data.competitionId) &&
        data.competitionName is string && data.competitionName.size() >= 2 && data.competitionName.size() <= 120 &&
        data.finalScore is number && data.finalScore >= 0 && data.finalScore <= 3000 &&
        (!('maxScore' in data) || (data.maxScore is number && data.maxScore >= 0 && data.maxScore <= 3000)) &&
        (!('accuracyPercent' in data) || (data.accuracyPercent is number && data.accuracyPercent >= 0 && data.accuracyPercent <= 100)) &&
        (!('timeTakenSeconds' in data) || (data.timeTakenSeconds is number && data.timeTakenSeconds >= 0 && data.timeTakenSeconds <= 86400)) &&
        (!('correctCount' in data) || (data.correctCount is number && data.correctCount >= 0 && data.correctCount <= 30)) &&
        (!('incorrectCount' in data) || (data.incorrectCount is number && data.incorrectCount >= 0 && data.incorrectCount <= 30)) &&
        data.createdAt is timestamp;
    }

    // 4. Collection Rules
    match /admins/{adminId} {
      allow get: if isSignedIn() && isValidId(adminId) && request.auth.uid == adminId;
      allow list, create, update, delete: if false;
    }

    // Administrator connectivity & diagnostic testing
    match /_diagnostics/{docId} {
      allow read, write: if isAdmin();
    }

    match /competitions/{competitionId} {
      allow get: if isValidId(competitionId) && (isAdmin() || existing().status in ['upcoming', 'live', 'completed']);
      allow list: if isAdmin() || existing().status in ['upcoming', 'live', 'completed'];
      allow create: if isAdmin() && isValidId(competitionId) && isValidCompetition(incoming()) && (incoming().createdAt == request.time || incoming().createdAt is timestamp);
      allow update: if isAdmin() && isValidId(competitionId);
      allow delete: if isAdmin() && isValidId(competitionId);

      // Questions subcollection
      match /questions/{questionId} {
        allow get: if isSignedIn() && isValidId(competitionId) && isValidId(questionId) &&
          exists(/databases/$(database)/documents/competitions/$(competitionId)) &&
          (isAdmin() || get(/databases/$(database)/documents/competitions/$(competitionId)).data.status in ['live', 'completed']);
        allow list: if isSignedIn() && (isAdmin() || (
          exists(/databases/$(database)/documents/competitions/$(competitionId)) &&
          get(/databases/$(database)/documents/competitions/$(competitionId)).data.status in ['live', 'completed']
        ));
        allow create: if isAdmin() && isValidId(competitionId) && isValidId(questionId) &&
          isValidQuestion(incoming(), competitionId) &&
          exists(/databases/$(database)/documents/competitions/$(competitionId));
        allow update: if isAdmin() && isValidId(competitionId) && isValidId(questionId);
        allow delete: if isAdmin() && isValidId(competitionId) && isValidId(questionId);
      }
    }

    // Operator Profiles (Restricted: only the user or admin can read)
    match /profiles/{userId} {
      allow get: if isSignedIn() && isValidId(userId) && (request.auth.uid == userId || isAdmin());
      allow list: if isSignedIn() && (existing().ownerId == request.auth.uid || isAdmin());
      allow create: if isVerifiedUser() && isValidId(userId) &&
        isValidOperatorProfile(incoming(), userId) &&
        incoming().createdAt == request.time &&
        incoming().updatedAt == request.time;
      allow update: if isVerifiedUser() && isValidId(userId) &&
        isValidOperatorProfile(incoming(), userId) &&
        existing().ownerId == request.auth.uid &&
        incoming().ownerId == existing().ownerId &&
        incoming().createdAt == existing().createdAt &&
        incoming().updatedAt == request.time &&
        incoming().diff(existing()).affectedKeys().hasOnly(['displayName', 'username', 'biography', 'avatarPreset', 'whatsappNumber', 'email', 'avatarUrl', 'isProfileComplete', 'updatedAt']);
      allow delete: if isAdmin() && isValidId(entryId);
    }

    // Public Leaderboard Standings (Free of PII like WhatsApp and Email)
    match /leaderboard/{entryId} {
      allow get: if isValidId(entryId);
      allow list: if true;
      allow create: if isVerifiedUser() && isValidId(entryId) &&
        entryId == request.auth.uid + '_' + incoming().competitionId &&
        !exists(/databases/$(database)/documents/leaderboard/$(entryId)) &&
        isValidLeaderboardEntry(incoming()) &&
        incoming().createdAt == request.time &&
        exists(/databases/$(database)/documents/competitions/$(incoming().competitionId));
      allow update: if isVerifiedUser() && isValidId(entryId) &&
        isValidLeaderboardEntry(incoming()) &&
        existing().ownerId == request.auth.uid &&
        incoming().ownerId == existing().ownerId &&
        incoming().competitionId == existing().competitionId &&
        incoming().createdAt == existing().createdAt &&
        existing().completionStatus == 'In Progress' &&
        incoming().diff(existing()).affectedKeys().hasOnly(['score', 'completionStatus', 'accuracyPercent', 'completionTimeSeconds']);
      allow delete: if isAdmin() && isValidId(userId);
    }

    // Winner Contacts (Strictly admin-accessible for prize fulfillment)
    match /winner_contacts/{entryId} {
      allow get, list: if isAdmin();
      allow create: if isVerifiedUser() && isValidId(entryId) &&
        isValidWinnerContact(incoming()) &&
        incoming().createdAt == request.time &&
        exists(/databases/$(database)/documents/competitions/$(incoming().competitionId));
      allow update, delete: if isAdmin() && isValidId(entryId);
    }

    // Private Operator Results (Strictly scoped to ownerId)
    match /results/{resultId} {
      allow get: if isSignedIn() && isValidId(resultId) && (existing().ownerId == request.auth.uid || isAdmin());
      allow list: if isSignedIn() && (existing().ownerId == request.auth.uid || isAdmin());
      allow create: if isVerifiedUser() && isValidId(resultId) &&
        resultId == request.auth.uid + '_' + incoming().competitionId &&
        !exists(/databases/$(database)/documents/results/$(resultId)) &&
        isValidCompetitionResult(incoming()) &&
        incoming().createdAt == request.time &&
        exists(/databases/$(database)/documents/competitions/$(incoming().competitionId));
      allow update, delete: if isAdmin() && isValidId(resultId);
    }
  }
}`;
