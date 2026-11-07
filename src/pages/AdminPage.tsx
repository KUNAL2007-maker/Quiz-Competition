import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  PlusCircle,
  Upload,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sliders,
  Trash2,
  FolderPlus,
  Play,
  RotateCcw,
  Phone,
  Mail,
  Trophy,
  ExternalLink,
  Database,
  Copy,
} from 'lucide-react';
import { doc, setDoc, deleteDoc, getDocs, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { db, firebaseConfig } from '../lib/firebase';
import { FIRESTORE_RULES_SOURCE } from '../constants/firestoreRules';
import cyberQuizQuestions from '../constants/cyberQuizQuestions.json';
import { useAppContext } from '../context/AppContext';
import { Competition, QuizQuestion } from '../types';
import { ModalDialog } from '../components/ui/ModalDialog';

const SAMPLE_QUESTIONS_JSON = JSON.stringify(cyberQuizQuestions, null, 2);

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    isAdmin,
    competitions,
    leaderboard,
    selectCompetition,
    resetQuizSession,
    addToast,
  } = useAppContext();

  // Create Competition Form States
  const [compTitle, setCompTitle] = useState('');
  const [compDescription, setCompDescription] = useState('');
  const [compStatus, setCompStatus] = useState<'live' | 'upcoming'>('live');
  const [compDurationMinutes, setCompDurationMinutes] = useState(15);
  const [perQuestionTimer, setPerQuestionTimer] = useState<number>(15); // Default 15s per question
  const [isCreatingComp, setIsCreatingComp] = useState(false);

  // Scheduled Start Time for Upcoming Competitions (default: 1 hour ahead)
  const [compStartTime, setCompStartTime] = useState<string>(() => {
    const d = new Date(Date.now() + 3600000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // Competition Deletion States
  const [compToDelete, setCompToDelete] = useState<Competition | null>(null);
  const [isDeletingComp, setIsDeletingComp] = useState(false);

  // Selected Competition for Question Upload
  const [targetCompId, setTargetCompId] = useState<string>('');

  // Single Question Form States
  const [qPrompt, setQPrompt] = useState('');
  const [qCategory, setQCategory] = useState('Cryptography');
  const [qPoints, setQPoints] = useState(100);
  const [qCodeSnippet, setQCodeSnippet] = useState('');
  const [qTimeLimit, setQTimeLimit] = useState(15); // Per question timer setting (default 15s)
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [correctOption, setCorrectOption] = useState('opt_a');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Bulk JSON Upload State
  const [bulkJson, setBulkJson] = useState(SAMPLE_QUESTIONS_JSON);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  // Cloud Firestore Rules Diagnostic States
  const [rulesPermissionError, setRulesPermissionError] = useState<string | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [rulesCopied, setRulesCopied] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [isSettingLive, setIsSettingLive] = useState(false);
  const [isSyncingQuestions, setIsSyncingQuestions] = useState(false);

  // Schedule & Timer Control for an Existing Competition (finale: 8 Nov 12:00 PM, 15s/question)
  const [schedCompId, setSchedCompId] = useState<string>('');
  const [schedStartTime, setSchedStartTime] = useState<string>('2026-11-08T12:00');
  const [schedPerQuestion, setSchedPerQuestion] = useState<number>(15);
  const [schedDuration, setSchedDuration] = useState<number>(15);
  const [schedStatus, setSchedStatus] = useState<'upcoming' | 'live'>('upcoming');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Private Winner Contact Directory (Synced securely from admin-only collection)
  const [winnerContacts, setWinnerContacts] = useState<Record<string, { whatsappNumber?: string; email?: string }>>({});

  useEffect(() => {
    if (!isAdmin) return;
    try {
      const unsub = onSnapshot(collection(db, 'winner_contacts'), (snap) => {
        const map: Record<string, { whatsappNumber?: string; email?: string }> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          map[d.id] = {
            whatsappNumber: data.whatsappNumber,
            email: data.email,
          };
        });
        setWinnerContacts(map);
      });
      return () => unsub();
    } catch {
      // Standby if offline
    }
  }, [isAdmin]);

  const cyberComp = useMemo(
    () => competitions.find((c) => c.title.toLowerCase().includes('cyber quiz 2026')),
    [competitions]
  );

  const filteredLeaderboard = useMemo(() => {
    const cyberCompId = cyberComp?.id;
    return leaderboard
      .filter((entry) => {
        const entryCompId =
          entry.competitionId ||
          (entry.participantId.includes('_') ? entry.participantId.split('_').slice(1).join('_') : '');
        // Exclude practice quiz from rankings directory; only display Cyber Quiz 2026
        if (cyberCompId) return entryCompId === cyberCompId;
        return Boolean(entryCompId && !entryCompId.toLowerCase().includes('practice'));
      })
      .sort((a, b) => {
        // 1. Primary: Higher Score ranks first
        const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;

        // 2. Secondary (Requirement): If score is the same, rank by completion time (faster completion ranks first)
        const timeA =
          typeof a.completionTimeSeconds === 'number' && a.completionTimeSeconds >= 0
            ? a.completionTimeSeconds
            : 999999999;
        const timeB =
          typeof b.completionTimeSeconds === 'number' && b.completionTimeSeconds >= 0
            ? b.completionTimeSeconds
            : 999999999;
        const timeDiff = timeA - timeB;
        if (timeDiff !== 0) return timeDiff;

        // 3. Tertiary (Requirement): If both are the same, who submitted first must be winner
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 9999999999999;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 9999999999999;
        const dateDiff = dateA - dateB;
        if (dateDiff !== 0) return dateDiff;

        // 4. Fallback: accuracy percent
        const accDiff = Number(b.accuracyPercent || 0) - Number(a.accuracyPercent || 0);
        return accDiff;
      })
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      }));
  }, [leaderboard, competitions]);

  const handleDeleteLeaderboardEntry = async (entryId: string) => {
    try {
      await deleteDoc(doc(db, 'leaderboard', entryId));
      try {
        await deleteDoc(doc(db, 'winner_contacts', entryId));
      } catch {
        // ignore
      }
      addToast('Record Purged', 'Leaderboard record removed from directory.', 'default');
    } catch (err) {
      addToast('Deletion Error', err instanceof Error ? err.message : 'Unable to remove record.', 'alert');
    }
  };

  const handleResetAllTournamentData = async () => {
    if (
      !window.confirm(
        'Are you sure you want to RESET EVERYTHING? This will delete all leaderboard rankings, competitor quiz results, and winner contact records for a clean realtime test.'
      )
    ) {
      return;
    }
    setIsResettingAll(true);
    try {
      // 1. Purge leaderboard collection
      const lbSnap = await getDocs(collection(db, 'leaderboard'));
      for (const d of lbSnap.docs) {
        await deleteDoc(d.ref);
      }
      // 2. Purge results collection
      const resSnap = await getDocs(collection(db, 'results'));
      for (const d of resSnap.docs) {
        await deleteDoc(d.ref);
      }
      // 3. Purge winner_contacts collection
      const wcSnap = await getDocs(collection(db, 'winner_contacts'));
      for (const d of wcSnap.docs) {
        await deleteDoc(d.ref);
      }
      // 4. Clear local attempt / warning / disqualification flags in this browser
      if (typeof window !== 'undefined') {
        const prefixes = [
          'completed_comp_',
          'completed_email_',
          'nullorigin_tab_warnings_',
          'nullorigin_disqualified_',
          'nullorigin_disqualified_email_',
        ];
        [window.localStorage, window.sessionStorage].forEach((store) => {
          const toRemove: string[] = [];
          for (let i = 0; i < store.length; i++) {
            const k = store.key(i);
            if (k && prefixes.some((p) => k.startsWith(p))) {
              toRemove.push(k);
            }
          }
          toRemove.forEach((k) => store.removeItem(k));
        });
      }
      addToast(
        'Database Reset Complete',
        'All leaderboard entries, quiz results, and winner records purged. Fresh state ready for testing!',
        'success'
      );
    } catch (err) {
      addToast('Reset Error', err instanceof Error ? err.message : 'Failed to purge database.', 'alert');
    } finally {
      setIsResettingAll(false);
    }
  };

  const handleSetCyberQuizLive = async () => {
    const target = cyberComp || competitions.find((c) => c.id === targetCompId) || competitions[0];
    if (!target) {
      addToast('Error', 'Tournament document not found.', 'alert');
      return;
    }
    setIsSettingLive(true);
    try {
      await setDoc(
        doc(db, 'competitions', target.id),
        {
          ...target,
          status: 'live',
          startTime: new Date().toISOString(),
          isLiveNow: true,
        },
        { merge: true }
      );
      addToast(
        'Cyber Quiz 2026 is LIVE',
        'Tournament status set to LIVE with no countdown lock! Open for all operators to test in real-time.',
        'success'
      );
    } catch (err) {
      addToast('Update Failed', err instanceof Error ? err.message : 'Could not set competition to live.', 'alert');
    } finally {
      setIsSettingLive(false);
    }
  };

  const handleSaveSchedule = async () => {
    const targetId = schedCompId || cyberComp?.id || '';
    if (!targetId) {
      addToast('Error', 'Select a competition first.', 'alert');
      return;
    }
    setIsSavingSchedule(true);
    try {
      const startIso = schedStartTime
        ? new Date(schedStartTime).toISOString()
        : new Date().toISOString();
      await setDoc(
        doc(db, 'competitions', targetId),
        {
          status: schedStatus,
          startTime: startIso,
          perQuestionTimerSeconds: Number(schedPerQuestion) || 15,
          durationMinutes: Number(schedDuration) || 15,
        },
        { merge: true }
      );
      addToast(
        'Schedule Saved',
        `Competition updated: ${schedStatus}, starts ${new Date(startIso).toLocaleString()}, ${schedPerQuestion}s per question.`,
        'success'
      );
    } catch (err) {
      addToast('Save Failed', err instanceof Error ? err.message : 'Could not update competition.', 'alert');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSync30Questions = async () => {
    const target = cyberComp || competitions.find((c) => c.id === targetCompId) || competitions[0];
    if (!target) {
      addToast('Error', 'Tournament document not found.', 'alert');
      return;
    }
    setIsSyncingQuestions(true);
    try {
      // 1. Purge existing questions in competitions/{target.id}/questions
      const qSnap = await getDocs(collection(db, `competitions/${target.id}/questions`));
      for (const qDoc of qSnap.docs) {
        await deleteDoc(qDoc.ref);
      }
      // 2. Upload the 50 one-liner questions
      for (let i = 0; i < cyberQuizQuestions.length; i++) {
        const item = cyberQuizQuestions[i];
        const qId = `q_cq2026_${String(i).padStart(2, '0')}`;
        await setDoc(doc(db, `competitions/${target.id}/questions`, qId), {
          competitionId: target.id,
          index: i,
          category: item.category || 'Cyber Security',
          points: item.points || 100,
          prompt: item.prompt,
          options: item.options,
          correctOptionId: item.correctOptionId,
          timeLimitSeconds: item.timeLimitSeconds || 30,
        });
      }
      addToast(
        '50 Questions Uploaded',
        'Successfully loaded all 50 one-liner questions into Cyber Quiz 2026!',
        'success'
      );
    } catch (err) {
      addToast('Upload Error', err instanceof Error ? err.message : 'Could not upload questions.', 'alert');
    } finally {
      setIsSyncingQuestions(false);
    }
  };

  // If user is not authorized administrator, show access denied
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#FF365B] bg-[#FF365B]/10 text-[#FF365B]">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F0F3F7]">
          Restricted Command Console
        </h1>
        <p className="text-sm text-[#929DAC] leading-relaxed">
          Access to the quiz upload and tournament administration interface requires verified administrator authorization.
        </p>
        {currentUser ? (
          <p className="text-xs font-mono text-[#FF365B]">
            Currently signed in with insufficient clearance
          </p>
        ) : (
          <p className="text-xs font-mono text-[#929DAC]">
            No authenticated operator session detected.
          </p>
        )}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-5 py-2.5 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] transition-colors cursor-pointer"
          >
            <span>Go to Operator Sign-In</span>
          </button>
        </div>
      </div>
    );
  }

  // Diagnostic Test: Check whether active admin account can write to Cloud Firestore
  const handleTestFirestoreConnection = async () => {
    setIsTestingConn(true);
    try {
      await setDoc(doc(db, '_diagnostics', 'admin_ping'), {
        pingedAt: serverTimestamp(),
        adminEmail: currentUser?.email || 'unknown',
        uid: currentUser?.uid || 'unknown',
      });
      setRulesPermissionError(null);
      addToast(
        'Permissions Verified',
        'Your admin credentials have verified write clearance on Cloud Firestore.',
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRulesPermissionError(msg);
      addToast(
        'Cloud Permission Blocked',
        'Firestore rejected write request. Please verify rules deployment in Firebase Console.',
        'alert'
      );
    } finally {
      setIsTestingConn(false);
    }
  };

  // One-click copy for production firestore.rules
  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES_SOURCE);
      setRulesCopied(true);
      addToast('Rules Copied', 'Production firestore.rules copied to clipboard.', 'success');
      setTimeout(() => setRulesCopied(false), 3000);
    } catch {
      addToast('Copy Failed', 'Unable to copy to clipboard automatically. Please copy from firestore.rules in repository.', 'alert');
    }
  };

  // Handle Competition Creation
  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compTitle.trim()) {
      addToast('Validation Error', 'Competition title is required.', 'alert');
      return;
    }
    setIsCreatingComp(true);
    try {
      const compId = `comp_${Date.now()}`;
      const scheduledStartIso = compStartTime
        ? new Date(compStartTime).toISOString()
        : new Date(Date.now() + 3600000).toISOString();

        const newCompData = {
          title: compTitle.trim().slice(0, 120),
          description: compDescription.trim().slice(0, 1000) || 'Official cybersecurity competition round.',
          status: compStatus,
          durationMinutes: Number(compDurationMinutes) || 15,
          perQuestionTimerSeconds: Number(perQuestionTimer) || 15,
          startTime: compStatus === 'upcoming' ? scheduledStartIso : new Date().toISOString(),
          createdAt: serverTimestamp(),
        };

      await setDoc(doc(db, 'competitions', compId), newCompData);

      addToast(
        'Competition Created Successfully',
        `Created tournament "${compTitle}" with ${perQuestionTimer}s per-question timer${compStatus === 'upcoming' ? ` (Scheduled: ${new Date(scheduledStartIso).toLocaleString()})` : ''}.`,
        'success'
      );

      setRulesPermissionError(null);
      setTargetCompId(compId);
      setCompTitle('');
      setCompDescription('');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unable to create competition in Firestore.';
      if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('insufficient')) {
        setRulesPermissionError(errMsg);
        addToast(
          'Missing Permissions in Firebase',
          'Cloud Firestore blocked competition creation. Security rules must be published in Firebase Console.',
          'alert'
        );
      } else {
        addToast('Creation Failed', errMsg, 'alert');
      }
    } finally {
      setIsCreatingComp(false);
    }
  };

  // Handle Competition Deletion
  const handleDeleteCompetition = async () => {
    if (!compToDelete) return;
    setIsDeletingComp(true);
    try {
      await deleteDoc(doc(db, 'competitions', compToDelete.id));
      addToast(
        'Competition Deleted',
        `Tournament "${compToDelete.title}" has been permanently removed.`,
        'success'
      );
      if (targetCompId === compToDelete.id) {
        setTargetCompId('');
      }
      setCompToDelete(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unable to delete competition from Firestore.';
      if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('insufficient')) {
        setRulesPermissionError(errMsg);
        addToast(
          'Missing Permissions in Firebase',
          'Cloud Firestore blocked competition deletion. Security rules must be published in Firebase Console.',
          'alert'
        );
      } else {
        addToast('Deletion Failed', errMsg, 'alert');
      }
    } finally {
      setIsDeletingComp(false);
    }
  };

  // Handle Single Question Upload
  const handleAddSingleQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompId) {
      addToast('Target Required', 'Please select or create a competition to attach this question.', 'alert');
      return;
    }
    if (!qPrompt.trim() || !qOptA.trim() || !qOptB.trim()) {
      addToast('Validation Error', 'Prompt and at least Options A and B are required.', 'alert');
      return;
    }

    setIsSavingQuestion(true);
    try {
      const questionId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const options = [
        { id: 'opt_a', label: 'A', text: qOptA.trim() },
        { id: 'opt_b', label: 'B', text: qOptB.trim() },
      ];
      if (qOptC.trim()) options.push({ id: 'opt_c', label: 'C', text: qOptC.trim() });
      if (qOptD.trim()) options.push({ id: 'opt_d', label: 'D', text: qOptD.trim() });

      const newQuestionData = {
        competitionId: targetCompId,
        index: Math.floor(Date.now() / 1000) % 1000,
        category: qCategory.trim() || 'General Security',
        points: Number(qPoints) || 100,
        prompt: qPrompt.trim(),
        ...(qCodeSnippet.trim() ? { codeSnippet: qCodeSnippet.trim() } : {}),
        options,
        correctOptionId: correctOption,
        timeLimitSeconds: Number(qTimeLimit) || 15,
      };

      await setDoc(doc(db, `competitions/${targetCompId}/questions`, questionId), newQuestionData);

      setRulesPermissionError(null);
      addToast('Question Added', `Question added with ${qTimeLimit}s timer.`, 'success');

      // Reset single question form
      setQPrompt('');
      setQCodeSnippet('');
      setQOptA('');
      setQOptB('');
      setQOptC('');
      setQOptD('');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unable to write question to Firestore.';
      if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('insufficient')) {
        setRulesPermissionError(errMsg);
        addToast(
          'Missing Permissions in Firebase',
          'Cloud Firestore blocked question upload. Security rules must be published in Firebase Console.',
          'alert'
        );
      } else {
        addToast('Upload Failed', errMsg, 'alert');
      }
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // Handle Bulk JSON Upload
  const handleBulkUpload = async () => {
    if (!targetCompId) {
      addToast('Target Required', 'Please select a competition to receive questions.', 'alert');
      return;
    }

    let parsedList: any[] = [];
    try {
      parsedList = JSON.parse(bulkJson);
      if (!Array.isArray(parsedList)) {
        throw new Error('JSON content must be an array of question objects.');
      }
    } catch (err) {
      addToast('Invalid JSON Format', err instanceof Error ? err.message : 'JSON parse error.', 'alert');
      return;
    }

    setIsBulkUploading(true);
    let successCount = 0;
    try {
      // Purge prior questions for this competition to prevent duplicates
      try {
        const oldSnap = await getDocs(collection(db, `competitions/${targetCompId}/questions`));
        for (const oldDoc of oldSnap.docs) {
          await deleteDoc(oldDoc.ref);
        }
      } catch {
        // continue even if prior collection was empty
      }

      for (let i = 0; i < parsedList.length; i++) {
        const item = parsedList[i];
        const qId = `q_bulk_${Date.now()}_${i}`;
        const questionData = {
          competitionId: targetCompId,
          index: typeof item.index === 'number' ? item.index : i,
          category: String(item.category || 'General Security'),
          points: typeof item.points === 'number' ? item.points : 100,
          prompt: String(item.prompt || `Question ${i + 1}`),
          ...(item.codeSnippet ? { codeSnippet: String(item.codeSnippet) } : {}),
          options: Array.isArray(item.options) ? item.options : [],
          ...(item.correctOptionId ? { correctOptionId: String(item.correctOptionId) } : {}),
          timeLimitSeconds: typeof item.timeLimitSeconds === 'number' ? item.timeLimitSeconds : Number(perQuestionTimer) || 15,
        };

        await setDoc(doc(db, `competitions/${targetCompId}/questions`, qId), questionData);
        successCount++;
      }

      setRulesPermissionError(null);
      addToast(
        'Bulk Upload Complete',
        `Successfully uploaded ${successCount} questions with ${perQuestionTimer}s per-question timer to competition!`,
        'success'
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('insufficient')) {
        setRulesPermissionError(errMsg);
      }
      addToast(
        'Bulk Upload Error',
        `Uploaded ${successCount}/${parsedList.length} items before error: ${errMsg}`,
        'alert'
      );
    } finally {
      setIsBulkUploading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Admin Command Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#252D38] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded bg-[#B6FF3B]/10 border border-[#B6FF3B]/40 px-2 py-0.5 font-mono text-[11px] font-bold text-[#B6FF3B]">
              SUPERUSER ACCESS · Authorized Administrator
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#F0F3F7]">
            Quiz & Tournament Management Console
          </h1>
          <p className="mt-1 text-sm text-[#929DAC] max-w-2xl">
            Create competitions, upload question packets, and configure manual per-question timers (default 15s).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {cyberComp && (
            <button
              type="button"
              onClick={() => {
                resetQuizSession();
                selectCompetition(cyberComp);
                navigate('/quiz');
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-bold text-[#07090D] hover:bg-[#c8ff66] transition-colors cursor-pointer shadow-md"
              title="Test Cyber Quiz 2026 in admin test mode"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Test Cyber Quiz 2026</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="rounded-md border border-[#252D38] bg-[#111722] px-3.5 py-2 text-xs font-medium text-[#F0F3F7] hover:border-[#B6FF3B] hover:text-[#B6FF3B] transition-colors cursor-pointer"
          >
            View Public Directory
          </button>
        </div>
      </div>

      {/* Cloud Firestore Security Rules Diagnostic Banner */}
      <section className="rounded-xl border border-[#252D38] bg-[#0C1017] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#00E5FF]" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F0F3F7]">
                Cloud Firestore Authorization Status
              </span>
              {rulesPermissionError ? (
                <span className="inline-flex items-center gap-1 rounded bg-[#FF365B]/10 border border-[#FF365B]/30 px-2 py-0.5 font-mono text-[10px] text-[#FF365B]">
                  <AlertTriangle className="h-3 w-3" /> Permissions Blocked in Cloud
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-[#B6FF3B]/10 border border-[#B6FF3B]/30 px-2 py-0.5 font-mono text-[10px] text-[#B6FF3B]">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              )}
            </div>
            <p className="text-xs text-[#929DAC]">
              Project: <span className="font-mono text-[#F0F3F7]">{firebaseConfig.projectId}</span> · Database: <span className="font-mono text-[#00E5FF]">{firebaseConfig.firestoreDatabaseId || '(default)'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestFirestoreConnection}
              disabled={isTestingConn}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#252D38] bg-[#111722] px-3 py-1.5 font-mono text-xs text-[#F0F3F7] hover:border-[#00E5FF] hover:text-[#00E5FF] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isTestingConn ? 'animate-spin text-[#00E5FF]' : ''}`} />
              <span>{isTestingConn ? 'Testing Rules...' : 'Test Cloud Write Access'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyRules}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#B6FF3B]/40 bg-[#B6FF3B]/10 px-3 py-1.5 font-mono text-xs font-semibold text-[#B6FF3B] hover:bg-[#B6FF3B]/20 transition-colors cursor-pointer"
            >
              {rulesCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{rulesCopied ? 'Rules Copied!' : 'Copy firestore.rules'}</span>
            </button>

            <a
              href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/rules`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#252D38] bg-[#111722] px-3 py-1.5 font-mono text-xs text-[#929DAC] hover:border-[#F0F3F7] hover:text-[#F0F3F7] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Firebase Console</span>
            </a>
          </div>
        </div>

        {/* If permissions error is active, show the 3-step resolution guide */}
        {rulesPermissionError && (
          <div className="rounded-lg border border-[#FF365B]/30 bg-[#FF365B]/5 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-[#FF365B] mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#FF365B]">
                  Firebase Error: Missing or insufficient permissions.
                </p>
                <p className="text-xs text-[#929DAC] leading-relaxed">
                  Firestore rules execute on Google Cloud servers (not locally in Git). To authorize your administrator email on database <span className="font-mono text-[#00E5FF]">{firebaseConfig.firestoreDatabaseId}</span>:
                </p>
              </div>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-xs text-[#F0F3F7] font-mono pl-2">
              <li>Click the green <strong className="text-[#B6FF3B]">"Copy firestore.rules"</strong> button above.</li>
              <li>Click <strong className="text-[#00E5FF]">"Open Firebase Console"</strong> (takes you directly to the database rules tab).</li>
              <li>Ensure the database dropdown selects <strong className="text-[#00E5FF]">{firebaseConfig.firestoreDatabaseId}</strong>.</li>
              <li>Paste the rules and click <strong className="text-[#B6FF3B]">"Publish"</strong>.</li>
              <li>Return here and click <strong className="text-[#00E5FF]">"Test Cloud Write Access"</strong>.</li>
            </ol>
          </div>
        )}
      </section>

      {/* Real-time Testing & Reset Control Suite */}
      <section className="rounded-xl border border-[#B6FF3B]/40 bg-[#0C1017] p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#252D38] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#B6FF3B] animate-pulse" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#B6FF3B]">
                Real-Time Testing & Platform Reset Suite
              </h2>
            </div>
            <p className="text-xs text-[#929DAC]">
              Reset platform state, update questions, and keep tournament open for real-time live testing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-[11px] font-semibold px-2.5 py-1 rounded border ${
                cyberComp?.status === 'live'
                  ? 'bg-[#36F58A]/10 text-[#36F58A] border-[#36F58A]/40'
                  : 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/40'
              }`}
            >
              Cyber Quiz 2026: {cyberComp?.status === 'live' ? 'OPEN / LIVE (No Timer Lock)' : 'UPCOMING (Locked)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Action 1: Set Live / Keep Open */}
          <button
            type="button"
            onClick={handleSetCyberQuizLive}
            disabled={isSettingLive}
            className="flex flex-col items-start gap-1 p-3.5 rounded-lg border border-[#36F58A]/40 bg-[#36F58A]/5 hover:bg-[#36F58A]/10 transition-colors cursor-pointer text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-2 text-[#36F58A] font-bold text-xs">
              <Play className="h-4 w-4 fill-current" />
              <span>{isSettingLive ? 'Updating...' : '1. Keep Open / Set LIVE'}</span>
            </div>
            <p className="text-[11px] text-[#929DAC]">
              Removes upcoming countdown lock. Sets tournament to LIVE so anyone can enter and test immediately.
            </p>
          </button>

          {/* Action 2: Upload 30 Questions */}
          <button
            type="button"
            onClick={handleSync30Questions}
            disabled={isSyncingQuestions}
            className="flex flex-col items-start gap-1 p-3.5 rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/5 hover:bg-[#00E5FF]/10 transition-colors cursor-pointer text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-2 text-[#00E5FF] font-bold text-xs">
              <Upload className="h-4 w-4" />
              <span>{isSyncingQuestions ? 'Uploading...' : '2. Load 50 Questions'}</span>
            </div>
            <p className="text-[11px] text-[#929DAC]">
              Replaces Cyber Quiz 2026 with the 50 one-liners (Easy 16, Med 20, Hard 14) — each student gets a random 30.
            </p>
          </button>

          {/* Action 3: Reset Everything */}
          <button
            type="button"
            onClick={handleResetAllTournamentData}
            disabled={isResettingAll}
            className="flex flex-col items-start gap-1 p-3.5 rounded-lg border border-[#FF365B]/40 bg-[#FF365B]/5 hover:bg-[#FF365B]/10 transition-colors cursor-pointer text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-2 text-[#FF365B] font-bold text-xs">
              <Trash2 className="h-4 w-4" />
              <span>{isResettingAll ? 'Purging...' : '3. Reset Everything (Purge)'}</span>
            </div>
            <p className="text-[11px] text-[#929DAC]">
              Purges all leaderboard rankings, quiz results, and winner contacts. Fresh clean slate for testing.
            </p>
          </button>
        </div>
      </section>

      {/* Schedule & Timer Control for an Existing Competition */}
      <section className="rounded-xl border border-[#00E5FF]/40 bg-[#0C1017] p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-[#252D38] pb-4">
          <Calendar className="h-5 w-5 text-[#00E5FF]" />
          <div>
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#00E5FF]">
              Schedule &amp; Timer — Existing Competition
            </h2>
            <p className="text-xs text-[#929DAC]">
              Set the start time, status and per-question timer for a competition that already exists (e.g. Cyber Quiz 2026 for 8 Nov 12:00 PM).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="sched-comp" className="block font-mono text-xs text-[#929DAC] mb-1">COMPETITION</label>
            <select
              id="sched-comp"
              value={schedCompId || cyberComp?.id || ''}
              onChange={(e) => {
                const id = e.target.value;
                setSchedCompId(id);
                const c = competitions.find((x) => x.id === id);
                if (c) {
                  if (c.startTime) {
                    const d = new Date(c.startTime);
                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                    setSchedStartTime(d.toISOString().slice(0, 16));
                  }
                  setSchedPerQuestion(c.perQuestionTimerSeconds || 15);
                  setSchedDuration(c.durationMinutes || 15);
                  setSchedStatus(c.status === 'live' ? 'live' : 'upcoming');
                }
              }}
              className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#00E5FF] focus:outline-none cursor-pointer"
            >
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c.status})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sched-start" className="block font-mono text-xs text-[#929DAC] mb-1">START TIME</label>
            <input
              id="sched-start"
              type="datetime-local"
              value={schedStartTime}
              onChange={(e) => setSchedStartTime(e.target.value)}
              className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 font-mono text-xs text-[#00E5FF] focus:border-[#00E5FF] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="sched-perq" className="block font-mono text-xs text-[#929DAC] mb-1">SECONDS / QUESTION</label>
            <input
              id="sched-perq"
              type="number"
              min={5}
              max={600}
              value={schedPerQuestion}
              onChange={(e) => setSchedPerQuestion(Math.max(5, Number(e.target.value)))}
              className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 font-mono text-xs text-[#F0F3F7] focus:border-[#00E5FF] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="sched-duration" className="block font-mono text-xs text-[#929DAC] mb-1">DURATION (MIN)</label>
            <input
              id="sched-duration"
              type="number"
              min={1}
              max={1440}
              value={schedDuration}
              onChange={(e) => setSchedDuration(Number(e.target.value))}
              className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 font-mono text-xs text-[#F0F3F7] focus:border-[#00E5FF] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="sched-status" className="block font-mono text-xs text-[#929DAC] mb-1">STATUS</label>
            <select
              id="sched-status"
              value={schedStatus}
              onChange={(e) => setSchedStatus(e.target.value as any)}
              className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#00E5FF] focus:outline-none cursor-pointer"
            >
              <option value="upcoming">Upcoming (countdown lock)</option>
              <option value="live">Live (open now)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleSaveSchedule}
            disabled={isSavingSchedule}
            className="inline-flex items-center gap-2 rounded-md bg-[#00E5FF] px-5 py-2.5 text-xs font-bold text-[#07090D] hover:bg-[#7deeff] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Calendar className="h-4 w-4" />
            <span>{isSavingSchedule ? 'Saving...' : 'Save Schedule & Timer'}</span>
          </button>
          <p className="text-[11px] text-[#929DAC]">
            Saving sets the competition to Upcoming with the chosen start time — it flips live automatically when the countdown reaches zero.
          </p>
        </div>
      </section>

      {/* Grid: Create Competition & Manage Existing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Step 1: Create New Competition */}
        <section className="lg:col-span-2 rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-[#252D38] pb-4">
            <FolderPlus className="h-5 w-5 text-[#B6FF3B]" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#F0F3F7]">
                01. Create New Competition
              </h2>
              <p className="text-xs text-[#929DAC]">
                Initialize a tournament container with per-question timer configuration.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateCompetition} className="space-y-4">
            <div>
              <label htmlFor="comp-title" className="block font-mono text-xs text-[#929DAC] mb-1">
                COMPETITION TITLE *
              </label>
              <input
                id="comp-title"
                type="text"
                required
                value={compTitle}
                onChange={(e) => setCompTitle(e.target.value)}
                placeholder="e.g. Cybersecurity Blitz Challenge — Round 1"
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3.5 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="comp-desc" className="block font-mono text-xs text-[#929DAC] mb-1">
                BRIEFING / DESCRIPTION
              </label>
              <textarea
                id="comp-desc"
                rows={2}
                value={compDescription}
                onChange={(e) => setCompDescription(e.target.value)}
                placeholder="Operational rules, scope, and topics covered..."
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3.5 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="comp-status" className="block font-mono text-xs text-[#929DAC] mb-1">
                  STATUS
                </label>
                <select
                  id="comp-status"
                  value={compStatus}
                  onChange={(e) => setCompStatus(e.target.value as any)}
                  className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none cursor-pointer"
                >
                  <option value="live">Live (Active Now)</option>
                  <option value="upcoming">Upcoming (Scheduled Tournament)</option>
                </select>
              </div>

              <div>
                <label htmlFor="comp-duration" className="block font-mono text-xs text-[#929DAC] mb-1">
                  DURATION (MINUTES)
                </label>
                <input
                  id="comp-duration"
                  type="number"
                  min={1}
                  max={1440}
                  value={compDurationMinutes}
                  onChange={(e) => setCompDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
                />
              </div>
            </div>

            {/* Scheduled Start Date & Time for Upcoming Competitions */}
            {compStatus === 'upcoming' && (
              <div className="rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#00E5FF]" />
                    <label htmlFor="comp-start-time" className="font-mono text-xs font-bold text-[#F0F3F7]">
                      SCHEDULED TOURNAMENT START TIME *
                    </label>
                  </div>
                  <span className="font-mono text-xs text-[#00E5FF]">
                    {compStartTime ? new Date(compStartTime).toLocaleString() : 'Pending'}
                  </span>
                </div>

                <p className="text-xs text-[#929DAC] leading-relaxed">
                  Configure the scheduled start time. Participants entering this competition before start will see a synchronized live countdown.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <input
                    id="comp-start-time"
                    type="datetime-local"
                    required={compStatus === 'upcoming'}
                    value={compStartTime}
                    onChange={(e) => setCompStartTime(e.target.value)}
                    className="rounded-md border border-[#252D38] bg-[#07090D] px-3 py-1.5 font-mono text-xs text-[#00E5FF] focus:border-[#00E5FF] focus:outline-none"
                  />

                  {/* Preset quick offsets */}
                  <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                    {[
                      { label: '+30m', mins: 30 },
                      { label: '+1h', mins: 60 },
                      { label: '+6h', mins: 360 },
                      { label: '+1d', mins: 1440 },
                      { label: '+3d', mins: 4320 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const d = new Date(Date.now() + preset.mins * 60000);
                          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                          setCompStartTime(d.toISOString().slice(0, 16));
                        }}
                        className="rounded border border-[#252D38] bg-[#07090D] px-2 py-1 font-mono text-[11px] text-[#929DAC] hover:border-[#00E5FF] hover:text-[#00E5FF] transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Per-Question Timer Setting (Default 15s, manually changeable) */}
            <div className="rounded-lg border border-[#B6FF3B]/30 bg-[#111722] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#B6FF3B]" />
                  <label htmlFor="per-q-timer" className="font-mono text-xs font-bold text-[#F0F3F7]">
                    PER-QUESTION TIMER SETTING (DEFAULT: 15 SECONDS)
                  </label>
                </div>
                <span className="font-mono text-sm font-bold text-[#B6FF3B]">
                  {perQuestionTimer}s / question
                </span>
              </div>

              <p className="text-xs text-[#929DAC] leading-relaxed">
                Controls the countdown allotted per question during the quiz. Set to 15 seconds by default, or adjust manually below.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <input
                  id="per-q-timer"
                  type="number"
                  min={5}
                  max={600}
                  value={perQuestionTimer}
                  onChange={(e) => setPerQuestionTimer(Math.max(5, Number(e.target.value)))}
                  className="w-28 rounded-md border border-[#252D38] bg-[#07090D] px-3 py-1.5 font-mono text-xs font-bold text-[#B6FF3B] focus:border-[#B6FF3B] focus:outline-none"
                />
                <span className="text-xs text-[#929DAC]">Seconds</span>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 ml-auto">
                  {[
                    { label: '15s (Default)', val: 15 },
                    { label: '30s', val: 30 },
                    { label: '45s', val: 45 },
                    { label: '60s', val: 60 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setPerQuestionTimer(preset.val)}
                      className={`rounded px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer ${
                        perQuestionTimer === preset.val
                          ? 'bg-[#B6FF3B] text-[#07090D] font-bold'
                          : 'border border-[#252D38] bg-[#07090D] text-[#929DAC] hover:text-[#F0F3F7]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingComp}
              className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-5 py-2.5 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{isCreatingComp ? 'Writing to Firestore...' : 'Create Competition Round'}</span>
            </button>
          </form>
        </section>

        {/* Existing Competitions Selector & Deletion Manager */}
        <section className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-4">
          <div className="border-b border-[#252D38] pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-[#F0F3F7]">
                Tournament Directory
              </h2>
              <p className="text-xs text-[#929DAC]">
                Select target to upload questions or delete competition.
              </p>
            </div>
            <span className="font-mono text-xs text-[#B6FF3B]">
              {competitions.length} rounds
            </span>
          </div>

          {competitions.length === 0 ? (
            <div className="rounded-md border border-[#252D38] bg-[#111722]/50 p-4 text-center">
              <p className="text-xs text-[#929DAC]">
                No competitions created yet. Use form on the left to create your first round.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {competitions.map((c) => {
                const isSelected = targetCompId === c.id;
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-[#B6FF3B] bg-[#111722]'
                        : 'border-[#252D38] bg-[#07090D] hover:border-[#929DAC]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          c.status === 'live'
                            ? 'text-[#36F58A] bg-[#36F58A]/10 border border-[#36F58A]/30'
                            : 'text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30'
                        }`}>
                          {c.status}
                        </span>
                        <span className="font-mono text-[10px] text-[#929DAC]">
                          {c.perQuestionTimerSeconds || 15}s / Q
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            resetQuizSession();
                            selectCompetition(c);
                            navigate('/quiz');
                          }}
                          className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-[#B6FF3B]/10 text-[#B6FF3B] border border-[#B6FF3B]/40 hover:bg-[#B6FF3B] hover:text-[#07090D] transition-colors cursor-pointer flex items-center gap-1"
                          title={`Directly enter and test ${c.title}`}
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Test</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetCompId(c.id);
                            selectCompetition(c);
                          }}
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#B6FF3B] text-[#07090D]'
                              : 'bg-[#111722] text-[#929DAC] hover:text-[#F0F3F7] border border-[#252D38]'
                          }`}
                        >
                          {isSelected ? 'Active Target' : 'Select'}
                        </button>
                        <button
                          type="button"
                          title={`Delete ${c.title}`}
                          aria-label={`Delete competition ${c.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompToDelete(c);
                          }}
                          className="p-1 rounded text-[#929DAC] hover:text-[#FF365B] hover:bg-[#FF365B]/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setTargetCompId(c.id);
                        selectCompetition(c);
                      }}
                      className="cursor-pointer mt-1.5"
                    >
                      <p className="font-semibold text-xs text-[#F0F3F7] truncate hover:text-[#B6FF3B] transition-colors">
                        {c.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 font-mono text-[10px] text-[#929DAC]">
                        <span>ID: {c.id}</span>
                        {c.startTime && (
                          <span className="text-[#00E5FF]/80">
                            Start: {new Date(c.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {targetCompId && (
            <div className="rounded-md border border-[#36F58A]/30 bg-[#36F58A]/10 p-3 text-xs text-[#36F58A] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Active Upload Target: {targetCompId}</span>
            </div>
          )}
        </section>
      </div>

      {/* Step 2: Upload Questions (Bulk JSON or Single Form) */}
      <section className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#252D38] pb-4">
          <div className="flex items-center gap-2.5">
            <Upload className="h-5 w-5 text-[#B6FF3B]" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#F0F3F7]">
                02. Upload Quiz Questions to Selected Tournament
              </h2>
              <p className="text-xs text-[#929DAC]">
                Target: {targetCompId || 'No competition selected yet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkJson(SAMPLE_QUESTIONS_JSON)}
              className="rounded-md border border-[#252D38] bg-[#111722] px-3 py-1.5 font-mono text-xs text-[#929DAC] hover:text-[#B6FF3B] transition-colors cursor-pointer"
            >
              Reload Sample JSON
            </button>
          </div>
        </div>

        {/* Bulk Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-[#F0F3F7]">
              FAST BULK JSON UPLOAD (RECOMMENDED)
            </span>
            <span className="font-mono text-xs text-[#B6FF3B]">
              Per-Question Timer: {perQuestionTimer}s default
            </span>
          </div>

          <textarea
            rows={10}
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            className="w-full rounded-lg border border-[#252D38] bg-[#07090D] p-4 font-mono text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
            placeholder="Paste JSON array of questions..."
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-[#929DAC]">
              Paste an array of questions. Each question supports prompt, category, points, options A–D, correctOptionId, and timeLimitSeconds.
            </p>

            <button
              type="button"
              disabled={isBulkUploading || !targetCompId}
              onClick={handleBulkUpload}
              className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-5 py-2.5 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>{isBulkUploading ? 'Uploading to Firestore...' : 'Upload Question Packet'}</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative border-t border-[#252D38] my-6">
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-[#0C1017] px-3 font-mono text-[11px] text-[#929DAC]">
            OR ADD QUESTIONS MANUALLY
          </span>
        </div>

        {/* Single Question Manual Form */}
        <form onSubmit={handleAddSingleQuestion} className="space-y-4 bg-[#111722]/50 rounded-lg p-5 border border-[#252D38]">
          <h3 className="font-display text-sm font-semibold text-[#F0F3F7]">
            Manual Single Question Creator
          </h3>

          <div>
            <label className="block font-mono text-xs text-[#929DAC] mb-1">
              QUESTION PROMPT *
            </label>
            <input
              type="text"
              required
              value={qPrompt}
              onChange={(e) => setQPrompt(e.target.value)}
              placeholder="e.g. What is the standard block size of AES?"
              className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3.5 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-mono text-xs text-[#929DAC] mb-1">
                CATEGORY
              </label>
              <input
                type="text"
                value={qCategory}
                onChange={(e) => setQCategory(e.target.value)}
                placeholder="e.g. Cryptography"
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-[#929DAC] mb-1">
                POINTS
              </label>
              <input
                type="number"
                min={10}
                max={1000}
                value={qPoints}
                onChange={(e) => setQPoints(Number(e.target.value))}
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-[#929DAC] mb-1">
                PER-QUESTION TIMER (SECONDS)
              </label>
              <input
                type="number"
                min={5}
                max={600}
                value={qTimeLimit}
                onChange={(e) => setQTimeLimit(Number(e.target.value))}
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 font-mono text-xs text-[#B6FF3B] font-bold focus:border-[#B6FF3B] focus:outline-none"
              />
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs text-[#929DAC] mb-1">OPTION A *</label>
              <input
                type="text"
                required
                value={qOptA}
                onChange={(e) => setQOptA(e.target.value)}
                placeholder="Option A text..."
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-[#929DAC] mb-1">OPTION B *</label>
              <input
                type="text"
                required
                value={qOptB}
                onChange={(e) => setQOptB(e.target.value)}
                placeholder="Option B text..."
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-[#929DAC] mb-1">OPTION C (OPTIONAL)</label>
              <input
                type="text"
                value={qOptC}
                onChange={(e) => setQOptC(e.target.value)}
                placeholder="Option C text..."
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-[#929DAC] mb-1">OPTION D (OPTIONAL)</label>
              <input
                type="text"
                value={qOptD}
                onChange={(e) => setQOptD(e.target.value)}
                placeholder="Option D text..."
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs text-[#929DAC] mb-1">
              CORRECT OPTION
            </label>
            <select
              value={correctOption}
              onChange={(e) => setCorrectOption(e.target.value)}
              className="w-full sm:w-48 rounded-md border border-[#252D38] bg-[#07090D] px-3 py-2 text-xs font-mono font-bold text-[#36F58A] focus:border-[#B6FF3B] focus:outline-none cursor-pointer"
            >
              <option value="opt_a">Option A</option>
              <option value="opt_b">Option B</option>
              <option value="opt_c">Option C</option>
              <option value="opt_d">Option D</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSavingQuestion || !targetCompId}
            className="inline-flex items-center gap-2 rounded-md bg-[#36F58A] px-4 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#5affaa] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{isSavingQuestion ? 'Saving Question...' : 'Save Question to Competition'}</span>
          </button>
        </form>
      </section>

      {/* Step 4: Tournament Winners & Competitor Contact Directory */}
      <section className="rounded-xl border border-[#252D38] bg-[#0C1017] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252D38] pb-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-[#B6FF3B]" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#F0F3F7]">
                Tournament Winners & Competitor Directory
              </h2>
              <p className="text-xs text-[#929DAC]">
                Verified contact details (WhatsApp number & Email) of quiz participants to facilitate contacting winners and prize distribution.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-[#929DAC]">
            {filteredLeaderboard.length} RECORDED COMPETITORS
          </span>
        </div>

        {filteredLeaderboard.length === 0 ? (
          <div className="rounded-lg border border-[#252D38] bg-[#07090D] p-8 text-center space-y-2">
            <Trophy className="mx-auto h-8 w-8 text-[#929DAC]/50" />
            <p className="text-sm font-semibold text-[#F0F3F7]">No competition scores recorded yet</p>
            <p className="text-xs text-[#929DAC] max-w-md mx-auto">
              When competitors complete a quiz, their ranked scores, legal names, WhatsApp phone numbers, and email addresses will appear here so you can easily contact the winners.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#252D38] text-[#929DAC] font-mono text-[11px]">
                  <th className="py-2.5 px-3">RANK</th>
                  <th className="py-2.5 px-3">COMPETITOR</th>
                  <th className="py-2.5 px-3">SCORE</th>
                  <th className="py-2.5 px-3">WHATSAPP CONTACT</th>
                  <th className="py-2.5 px-3">EMAIL ADDRESS</th>
                  <th className="py-2.5 px-3 text-right">DIRECT ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D38]">
                {filteredLeaderboard.map((entry) => {
                  const contact = winnerContacts[entry.participantId] || {};
                  const phone = contact.whatsappNumber || entry.whatsappNumber || '';
                  const cleanPhone = phone.replace(/\D/g, '');
                  const email = contact.email || entry.email || '';
                  return (
                    <tr key={entry.participantId} className="hover:bg-[#111722]/50">
                      <td className="py-3 px-3 font-mono font-bold">
                        {entry.rank === 1 ? (
                          <span className="text-[#B6FF3B]">🏆 #1</span>
                        ) : entry.rank === 2 ? (
                          <span className="text-[#F0F3F7]">🥈 #2</span>
                        ) : entry.rank === 3 ? (
                          <span className="text-[#FF883B]">🥉 #3</span>
                        ) : (
                          <span className="text-[#929DAC]">#{entry.rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {entry.avatarUrl ? (
                            <img
                              src={entry.avatarUrl}
                              alt="Avatar"
                              className="h-8 w-8 rounded-full border border-[#B6FF3B]/60 object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full border border-[#252D38] bg-[#111722] flex items-center justify-center font-mono text-xs text-[#B6FF3B]">
                              {entry.displayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-[#F0F3F7]">{entry.displayName}</p>
                            {entry.username && (
                              <p className="font-mono text-[10px] text-[#929DAC]">@{entry.username}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#B6FF3B]">
                        {entry.score} PTS
                      </td>
                      <td className="py-3 px-3">
                        {phone ? (
                          <span className="font-mono text-xs text-[#36F58A]">
                            {phone}
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-[#929DAC] italic">
                            Not provided
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-[#929DAC]">
                        {email || 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(entry.displayName)},%20congratulations%20on%20your%20performance%20in%20the%20Null%20Origin%20Cybersecurity%20Competition!`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded bg-[#36F58A]/15 border border-[#36F58A]/50 px-2.5 py-1 text-[11px] font-semibold text-[#36F58A] hover:bg-[#36F58A]/25 transition-colors cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <Phone className="h-3 w-3" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          {entry.email && (
                            <a
                              href={`mailto:${entry.email}?subject=Null%20Origin%20Quiz%20Tournament%20Award&body=Dear%20${encodeURIComponent(entry.displayName)},%0A%0ACongratulations%20on%20your%20result%20in%20our%20cybersecurity%20quiz%20competition!`}
                              className="inline-flex items-center gap-1.5 rounded bg-[#111722] border border-[#252D38] px-2.5 py-1 text-[11px] font-medium text-[#F0F3F7] hover:border-[#B6FF3B] transition-colors cursor-pointer"
                              title="Send Email"
                            >
                              <Mail className="h-3 w-3" />
                              <span>Email</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteLeaderboardEntry(entry.participantId)}
                            className="inline-flex items-center gap-1 rounded bg-[#FF365B]/10 border border-[#FF365B]/30 px-2 py-1 text-[11px] font-medium text-[#FF365B] hover:bg-[#FF365B]/20 transition-colors cursor-pointer"
                            title="Purge record"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Purge</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete Competition Confirmation Modal */}
      <ModalDialog
        isOpen={!!compToDelete}
        onClose={() => !isDeletingComp && setCompToDelete(null)}
        title="Delete Competition"
        subtitle="Permanent removal from tournament directory"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-[#FF365B]/30 bg-[#FF365B]/10 p-3.5">
            <AlertTriangle className="h-5 w-5 text-[#FF365B] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-[#929DAC]">
              <p className="font-semibold text-[#FF365B]">
                This action is permanent and cannot be undone.
              </p>
              <p>
                Are you sure you want to delete tournament{' '}
                <span className="font-semibold text-[#F0F3F7]">
                  "{compToDelete?.title}"
                </span>{' '}
                (<span className="font-mono text-[#B6FF3B]">{compToDelete?.id}</span>)?
              </p>
              <p>
                The competition record will be removed from Cloud Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isDeletingComp}
              onClick={() => setCompToDelete(null)}
              className="rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 font-mono text-xs text-[#929DAC] hover:text-[#F0F3F7] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingComp}
              onClick={handleDeleteCompetition}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#FF365B] px-4 py-2 font-mono text-xs font-semibold text-[#07090D] hover:bg-[#ff5775] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeletingComp ? 'Deleting from Cloud...' : 'Confirm Permanent Delete'}</span>
            </button>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
};
