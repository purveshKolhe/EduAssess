const { getStore } = require("./_store");

function formatClock(date = new Date()) {
  return date.toTimeString().slice(0, 8);
}

module.exports = (req, res) => {
  const store = getStore();

  // GET /api/attempts?attemptId=ATT-1042-01
  if (req.method === "GET") {
    const attemptId = req.query?.attemptId || "ATT-1042-01";
    const attempt = store.attempts[attemptId] || Object.values(store.attempts)[0];
    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }
    const exam = store.exams.find((e) => e.code === attempt.examCode) || store.exams[0];
    return res.status(200).json({ attempt, exam });
  }

  // POST /api/attempts -> start | save | submit
  if (req.method === "POST") {
    const body = req.body || {};
    const action = body.action || "save";
    const attemptId = body.attemptId || "ATT-1042-01";

    // Start a new attempt for a given exam code
    if (action === "start") {
      const code = (body.examCode || "BIO-CELL-01").trim().toUpperCase();
      const exam = store.exams.find((e) => e.code.toUpperCase() === code) || store.exams[0];

      // Reuse default ATT-1042-01 if joining BIO-CELL-01, or create fresh attempt
      if (exam.code === "BIO-CELL-01" && store.attempts["ATT-1042-01"] && store.attempts["ATT-1042-01"].status === "IN_PROGRESS") {
        return res.status(200).json({ attempt: store.attempts["ATT-1042-01"], exam });
      }

      const nowStr = formatClock();
      const answers = {};
      exam.questions.forEach((q) => {
        answers[q.id] = "";
      });

      const newAttempt = {
        attemptId,
        examCode: exam.code,
        examTitle: exam.title,
        studentId: "ST-1042",
        studentName: "Maya Patel",
        className: "Class 10-B",
        startedAt: nowStr,
        endsAt: `${exam.durationMins} mins from start`,
        submittedAt: null,
        submitMethod: null,
        receiptId: `EA-20261023-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "IN_PROGRESS",
        remainingSeconds: exam.durationMins * 60,
        lastSavedAt: nowStr,
        flaggedQuestions: [],
        timings: {},
        answers
      };

      store.attempts[attemptId] = newAttempt;
      store.auditLogs[attemptId] = {
        reviewed: false,
        events: [{ time: nowStr, type: "START", text: `${nowStr} · Attempt started` }]
      };
      exam.inProgressCount = (exam.inProgressCount || 0) + 1;

      return res.status(201).json({ attempt: newAttempt, exam });
    }

    const attempt = store.attempts[attemptId];
    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    // Enforce submission lock if already submitted
    if (attempt.status === "SUBMITTED") {
      return res.status(409).json({
        error: "Attempt is already submitted and locked.",
        attempt
      });
    }

    const nowStr = formatClock();

    // Auto-save answers & progress
    if (action === "save") {
      if (body.answers && typeof body.answers === "object") {
        attempt.answers = { ...attempt.answers, ...body.answers };
      }
      if (Array.isArray(body.flaggedQuestions)) {
        attempt.flaggedQuestions = body.flaggedQuestions;
      }
      if (typeof body.remainingSeconds === "number") {
        attempt.remainingSeconds = Math.max(0, body.remainingSeconds);
      }
      attempt.lastSavedAt = nowStr;

      return res.status(200).json({ attempt });
    }

    // Submit & lock attempt (manual or automatic timeout)
    if (action === "submit") {
      if (body.answers && typeof body.answers === "object") {
        attempt.answers = { ...attempt.answers, ...body.answers };
      }
      attempt.status = "SUBMITTED";
      attempt.submittedAt = nowStr;
      attempt.remainingSeconds = 0;
      attempt.submitMethod = body.method || "Manual · Confirmed by student";

      const log = store.auditLogs[attemptId] || { reviewed: false, events: [] };
      log.events.push({
        time: nowStr,
        type: "SUBMIT",
        text: `${nowStr} · Attempt submitted (${attempt.submitMethod})`
      });
      store.auditLogs[attemptId] = log;

      const exam = store.exams.find((e) => e.code === attempt.examCode);
      if (exam) {
        exam.inProgressCount = Math.max(0, (exam.inProgressCount || 1) - 1);
        exam.submittedCount = (exam.submittedCount || 0) + 1;
      }

      return res.status(200).json({ attempt });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
