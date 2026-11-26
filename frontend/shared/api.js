// Shared API + Firebase Firestore + localStorage helper for EduAssess

const KEYS = {
  EXAMS: "eduassess_exams",
  ATTEMPTS: "eduassess_attempts",
  AUDIT: "eduassess_audit",
  PREFS: "eduassess_prefs"
};

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

// Initialize Firebase Firestore if firebase-config.js has real keys
let firestoreDb = null;
function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;
  const cfg = window.FIREBASE_CONFIG;
  if (
    typeof firebase === "undefined" ||
    !cfg ||
    !cfg.apiKey ||
    cfg.apiKey.startsWith("YOUR_")
  ) {
    return null;
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(cfg);
  }
  firestoreDb = firebase.firestore();
  return firestoreDb;
}

function getActiveAttemptId() {
  const prefs = readLocal(KEYS.PREFS, { activeAttemptId: "ATT-1042-01" });
  return prefs.activeAttemptId || "ATT-1042-01";
}

function setActiveAttemptId(attemptId) {
  const prefs = readLocal(KEYS.PREFS, {});
  prefs.activeAttemptId = attemptId;
  writeLocal(KEYS.PREFS, prefs);
}

// Fetch all exams (Firestore -> fallback to /api/exams + localStorage)
async function apiGetExams() {
  const db = getFirestoreDb();
  if (db) {
    const snapshot = await db.collection("exams").get();
    const exams = snapshot.docs.map((doc) => doc.data());
    exams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    writeLocal(KEYS.EXAMS, exams);
    return exams;
  }

  const localExams = readLocal(KEYS.EXAMS, null);
  try {
    const res = await fetch("/api/exams");
    if (!res.ok) throw new Error("Failed to load exams");
    const data = await res.json();

    const serverExams = data.exams || [];
    if (localExams && localExams.length > 0) {
      const codes = new Set(serverExams.map((e) => e.code));
      localExams.forEach((le) => {
        if (!codes.has(le.code)) serverExams.unshift(le);
      });
    }
    writeLocal(KEYS.EXAMS, serverExams);
    return serverExams;
  } catch {
    return localExams || [];
  }
}

// Lookup single exam by code
async function apiFindExamByCode(code) {
  const cleanCode = code.trim().toUpperCase();
  const db = getFirestoreDb();
  if (db) {
    const doc = await db.collection("exams").doc(cleanCode).get();
    if (!doc.exists) {
      throw new Error(`No exam found with code "${cleanCode}".`);
    }
    return doc.data();
  }

  const exams = await apiGetExams();
  const found = exams.find((e) => e.code.toUpperCase() === cleanCode);
  if (found) return found;

  const res = await fetch(`/api/exams?code=${encodeURIComponent(cleanCode)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Exam not found");
  return data.exam;
}

// Create and publish (or save draft) exam
async function apiCreateExam(examPayload) {
  const cleanCode = examPayload.code.trim().toUpperCase();
  const examDoc = {
    examId: `exam-${Date.now()}`,
    createdAt: Date.now(),
    inProgressCount: 0,
    submittedCount: 0,
    notStartedCount: 30,
    ...examPayload,
    code: cleanCode
  };

  const db = getFirestoreDb();
  if (db) {
    await db.collection("exams").doc(cleanCode).set(examDoc);
    const exams = readLocal(KEYS.EXAMS, []);
    const idx = exams.findIndex((e) => e.code === cleanCode);
    if (idx >= 0) exams[idx] = examDoc;
    else exams.unshift(examDoc);
    writeLocal(KEYS.EXAMS, exams);
    return examDoc;
  }

  const res = await fetch("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(examDoc)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not save exam");

  const exams = readLocal(KEYS.EXAMS, []);
  const idx = exams.findIndex((e) => e.code === data.exam.code);
  if (idx >= 0) exams[idx] = data.exam;
  else exams.unshift(data.exam);
  writeLocal(KEYS.EXAMS, exams);
  return data.exam;
}

// Start an exam attempt
async function apiStartAttempt(examCode) {
  const cleanCode = examCode.trim().toUpperCase();
  const attemptId = `ATT-${Date.now()}`;
  const db = getFirestoreDb();

  if (db) {
    const exam = await apiFindExamByCode(cleanCode);
    const nowStr = new Date().toTimeString().slice(0, 8);
    const answers = {};
    (exam.questions || []).forEach((q) => {
      answers[q.id] = "";
    });

    const attempt = {
      attemptId,
      examCode: exam.code,
      examTitle: exam.title,
      studentId: "ST-1042",
      studentName: "Maya Patel",
      className: exam.className || "Class 10-B",
      startedAt: nowStr,
      endsAt: `${exam.durationMins} mins from start`,
      submittedAt: null,
      submitMethod: null,
      receiptId: `EA-${Date.now().toString().slice(-6)}`,
      status: "IN_PROGRESS",
      remainingSeconds: (exam.durationMins || 30) * 60,
      lastSavedAt: nowStr,
      flaggedQuestions: [],
      answers
    };

    const audit = {
      reviewed: false,
      events: [{ time: nowStr, type: "START", text: `${nowStr} · Attempt started` }]
    };

    await db.collection("attempts").doc(attemptId).set(attempt);
    await db.collection("auditLogs").doc(attemptId).set(audit);

    setActiveAttemptId(attemptId);
    const attempts = readLocal(KEYS.ATTEMPTS, {});
    attempts[attemptId] = attempt;
    writeLocal(KEYS.ATTEMPTS, attempts);
    return { attempt, exam };
  }

  const res = await fetch("/api/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", examCode: cleanCode, attemptId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not start attempt");

  setActiveAttemptId(data.attempt.attemptId);
  const attempts = readLocal(KEYS.ATTEMPTS, {});
  attempts[data.attempt.attemptId] = data.attempt;
  writeLocal(KEYS.ATTEMPTS, attempts);
  return data;
}

// Load attempt and its exam
async function apiGetAttempt(attemptId = getActiveAttemptId()) {
  const db = getFirestoreDb();
  if (db) {
    const attemptDoc = await db.collection("attempts").doc(attemptId).get();
    if (!attemptDoc.exists) throw new Error("Attempt not found");
    const attempt = attemptDoc.data();
    const exam = await apiFindExamByCode(attempt.examCode);
    return { attempt, exam };
  }

  const localAttempts = readLocal(KEYS.ATTEMPTS, {});
  const localExams = readLocal(KEYS.EXAMS, []);

  try {
    const res = await fetch(`/api/attempts?attemptId=${encodeURIComponent(attemptId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Attempt not found");

    const cached = localAttempts[attemptId];
    const attempt = cached && cached.status === "SUBMITTED" ? cached : (cached || data.attempt);
    const exam = localExams.find((e) => e.code === attempt.examCode) || data.exam;

    localAttempts[attemptId] = attempt;
    writeLocal(KEYS.ATTEMPTS, localAttempts);
    return { attempt, exam };
  } catch {
    const attempt = localAttempts[attemptId];
    const exam = localExams.find((e) => e.code === attempt?.examCode) || localExams[0];
    return { attempt, exam };
  }
}

// Auto-save answers
async function apiSaveAttempt(attemptId, payload) {
  const nowStr = new Date().toTimeString().slice(0, 8);
  const db = getFirestoreDb();
  if (db) {
    const update = { ...payload, lastSavedAt: nowStr };
    await db.collection("attempts").doc(attemptId).set(update, { merge: true });
    const doc = await db.collection("attempts").doc(attemptId).get();
    return doc.data();
  }

  const localAttempts = readLocal(KEYS.ATTEMPTS, {});
  if (localAttempts[attemptId]) {
    localAttempts[attemptId] = { ...localAttempts[attemptId], ...payload, lastSavedAt: nowStr };
    writeLocal(KEYS.ATTEMPTS, localAttempts);
  }

  try {
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", attemptId, ...payload })
    });
    const data = await res.json();
    if (res.ok && data.attempt) {
      localAttempts[attemptId] = data.attempt;
      writeLocal(KEYS.ATTEMPTS, localAttempts);
      return data.attempt;
    }
  } catch {
    // Fallback to localStorage copy
  }
  return localAttempts[attemptId];
}

// Submit & lock attempt
async function apiSubmitAttempt(attemptId, method, answers) {
  const nowStr = new Date().toTimeString().slice(0, 8);
  const db = getFirestoreDb();
  if (db) {
    const update = {
      status: "SUBMITTED",
      submittedAt: nowStr,
      remainingSeconds: 0,
      submitMethod: method || "Manual · Confirmed by student"
    };
    if (answers) update.answers = answers;
    await db.collection("attempts").doc(attemptId).set(update, { merge: true });
    const doc = await db.collection("attempts").doc(attemptId).get();
    return doc.data();
  }

  const localAttempts = readLocal(KEYS.ATTEMPTS, {});
  if (localAttempts[attemptId]) {
    localAttempts[attemptId].status = "SUBMITTED";
    localAttempts[attemptId].submittedAt = nowStr;
    localAttempts[attemptId].submitMethod = method;
    if (answers) localAttempts[attemptId].answers = answers;
    writeLocal(KEYS.ATTEMPTS, localAttempts);
  }

  try {
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", attemptId, method, answers })
    });
    const data = await res.json();
    if (res.ok && data.attempt) {
      localAttempts[attemptId] = data.attempt;
      writeLocal(KEYS.ATTEMPTS, localAttempts);
      return data.attempt;
    }
  } catch {
    // Fallback to localStorage copy
  }
  return localAttempts[attemptId];
}

// Get audit log for an attempt
async function apiGetAudit(attemptId = getActiveAttemptId()) {
  const db = getFirestoreDb();
  if (db) {
    const doc = await db.collection("auditLogs").doc(attemptId).get();
    return doc.exists ? doc.data() : { reviewed: false, events: [] };
  }

  const localAudits = readLocal(KEYS.AUDIT, {});
  try {
    const res = await fetch(`/api/audit?attemptId=${encodeURIComponent(attemptId)}`);
    const data = await res.json();
    if (res.ok && data.audit) {
      const merged = localAudits[attemptId]?.events?.length > data.audit.events.length
        ? localAudits[attemptId]
        : data.audit;
      localAudits[attemptId] = merged;
      writeLocal(KEYS.AUDIT, localAudits);
      return merged;
    }
  } catch {
    // Fallback to localStorage
  }
  return localAudits[attemptId] || { reviewed: false, events: [] };
}

// Record tab-switch event or mark reviewed
async function apiPostAudit(attemptId, payload) {
  const db = getFirestoreDb();
  if (db) {
    const ref = db.collection("auditLogs").doc(attemptId);
    const doc = await ref.get();
    const audit = doc.exists ? doc.data() : { reviewed: false, events: [] };
    const nowStr = new Date().toTimeString().slice(0, 8);

    if (payload.action === "review") {
      audit.reviewed = true;
      audit.events.push({
        time: nowStr,
        type: "REVIEWED",
        text: `${nowStr} · Teacher marked review events as reviewed`
      });
    } else {
      const awaySeconds = Number(payload.awaySeconds) || 5;
      const leaveTime = payload.leaveTime || nowStr;
      audit.reviewed = false;
      audit.events.push(
        { time: leaveTime, type: "TAB_LEFT", text: `${leaveTime} · Tab left · review event`, isFlag: true },
        { time: nowStr, type: "TAB_RETURN", text: `${nowStr} · Returned after ${awaySeconds} seconds` }
      );
    }
    await ref.set(audit);
    return audit;
  }

  const res = await fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, ...payload })
  });
  const data = await res.json();
  if (res.ok && data.audit) {
    const localAudits = readLocal(KEYS.AUDIT, {});
    localAudits[attemptId] = data.audit;
    writeLocal(KEYS.AUDIT, localAudits);
    return data.audit;
  }
  throw new Error(data.error || "Audit update failed");
}

// Reset all demo data
async function apiResetDemo() {
  localStorage.removeItem(KEYS.EXAMS);
  localStorage.removeItem(KEYS.ATTEMPTS);
  localStorage.removeItem(KEYS.AUDIT);
  localStorage.removeItem(KEYS.PREFS);
  await fetch("/api/reset", { method: "POST" });
}
