// Live Student Exam Runner (exam_view.js)
// Handles countdown timer, auto-save, tab-switch audit logging, and deadline auto-submit

let attempt = null;
let exam = null;
let currentIndex = 0;
let remainingSeconds = 42;
let timerInterval = null;
let saveTimeout = null;
let tabLeftTimestamp = null;
let isLocked = false;

async function initExamRunner() {
  const attemptId = getActiveAttemptId();
  const data = await apiGetAttempt(attemptId);
  attempt = data.attempt;
  exam = data.exam;

  if (!attempt || !exam) return;

  // If already submitted, lock and go to receipt
  if (attempt.status === "SUBMITTED") {
    window.location.href = "sub_confirm.html";
    return;
  }

  remainingSeconds = typeof attempt.remainingSeconds === "number" && attempt.remainingSeconds > 0
    ? attempt.remainingSeconds
    : (exam.durationMins || 30) * 60;

  if (!attempt.timings) attempt.timings = {};
  if (typeof attempt.elapsedSeconds !== "number") attempt.elapsedSeconds = 0;
  if (typeof attempt.tabSwitchCount !== "number") attempt.tabSwitchCount = 0;

  currentIndex = 0;

  document.getElementById("exam-title").textContent = exam.title;
  document.getElementById("session-details").textContent =
    `${exam.code} · ${attempt.studentName} · ${attempt.studentId} · Started ${attempt.startedAt} · ${exam.date}`;

  renderQuestion();
  renderPalette();
  startCountdownTimer();
}

function renderQuestion() {
  const questions = exam.questions;
  const q = questions[currentIndex];
  if (!q) return;

  document.getElementById("question-meta").textContent =
    `Question ${currentIndex + 1} of ${questions.length} · Short answer · ${q.points} point${q.points === 1 ? "" : "s"}`;
  document.getElementById("question-prompt").textContent = q.text;

  const textarea = document.getElementById("answer-input");
  textarea.value = attempt.answers?.[q.id] || "";
  updateWordCount(textarea.value);

  const isFlagged = (attempt.flaggedQuestions || []).includes(q.id);
  const flagBtn = document.getElementById("flag-q-btn");
  flagBtn.textContent = isFlagged ? "★ Flagged for review" : "Flag for review";

  document.getElementById("prev-q-btn").disabled = currentIndex === 0;
  document.getElementById("next-q-btn").disabled = currentIndex === questions.length - 1;
}

function renderPalette() {
  const questions = exam.questions;
  const gridEl = document.getElementById("question-grid");
  const flaggedSet = new Set(attempt.flaggedQuestions || []);

  let answeredCount = 0;
  const unansweredNums = [];
  const flaggedNums = [];

  gridEl.innerHTML = questions.map((q, idx) => {
    const hasAnswer = (attempt.answers?.[q.id] || "").trim().length > 0;
    const isFlagged = flaggedSet.has(q.id);
    const isCurrent = idx === currentIndex;

    if (hasAnswer) answeredCount++;
    else unansweredNums.push(`Q${q.id}`);
    if (isFlagged) flaggedNums.push(`Q${q.id}`);

    let cls = "q-pill";
    if (isCurrent) cls += " current";
    else if (isFlagged) cls += " flagged";
    else if (hasAnswer) cls += " answered";

    return `<button type="button" class="${cls}" data-idx="${idx}">${q.id}${hasAnswer ? " ✓" : ""}</button>`;
  }).join("");

  // Click question pill to switch
  gridEl.querySelectorAll(".q-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentIndex = Number(btn.dataset.idx);
      renderQuestion();
      renderPalette();
    });
  });

  document.getElementById("progress-count").innerHTML =
    `<strong>Questions · ${answeredCount} of ${questions.length}</strong><br />answered`;

  const alertsEl = document.getElementById("palette-alerts");
  alertsEl.innerHTML = `
    <p><strong>${unansweredNums.length > 0 ? unansweredNums.join(", ") + " unanswered" : "All questions answered"}</strong></p>
    ${flaggedNums.length > 0 ? `<p><strong>${flaggedNums.join(", ")} marked for review</strong></p>` : ""}
  `;

  const noticeTitle = document.getElementById("submit-notice-title");
  noticeTitle.textContent = unansweredNums.length > 0
    ? `Ready to submit? ${unansweredNums.length} question${unansweredNums.length === 1 ? " is" : "s are"} unanswered.`
    : "All questions answered! Ready to review & submit.";
}

function updateWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById("word-save-meta").textContent =
    `${words} / 100 words · ✓ Saved at ${attempt.lastSavedAt || "now"}`;
}

// Auto-save whenever student types
document.getElementById("answer-input").addEventListener("input", (e) => {
  if (isLocked || !exam) return;
  const q = exam.questions[currentIndex];
  const value = e.target.value;

  attempt.answers[q.id] = value;
  updateWordCount(value);
  renderPalette();

  document.getElementById("save-status").textContent = "Saving draft...";

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const updated = await apiSaveAttempt(attempt.attemptId, {
      answers: attempt.answers,
      flaggedQuestions: attempt.flaggedQuestions,
      remainingSeconds,
      timings: attempt.timings,
      elapsedSeconds: attempt.elapsedSeconds
    });
    if (updated) attempt = updated;
    document.getElementById("save-status").textContent = `✓ All changes saved · ${attempt.lastSavedAt}`;
    updateWordCount(value);
  }, 350);
});

// Previous / Next / Flag / Jump buttons
document.getElementById("prev-q-btn").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
    renderPalette();
  }
});

document.getElementById("next-q-btn").addEventListener("click", () => {
  if (currentIndex < exam.questions.length - 1) {
    currentIndex++;
    renderQuestion();
    renderPalette();
  }
});

document.getElementById("flag-q-btn").addEventListener("click", async () => {
  const q = exam.questions[currentIndex];
  const list = new Set(attempt.flaggedQuestions || []);
  if (list.has(q.id)) list.delete(q.id);
  else list.add(q.id);

  attempt.flaggedQuestions = Array.from(list);
  renderQuestion();
  renderPalette();
  await apiSaveAttempt(attempt.attemptId, { flaggedQuestions: attempt.flaggedQuestions });
});

document.getElementById("jump-unanswered-btn").addEventListener("click", () => {
  const idx = exam.questions.findIndex((q) => !(attempt.answers?.[q.id] || "").trim());
  if (idx >= 0) {
    currentIndex = idx;
    renderQuestion();
    renderPalette();
  }
});

// Live Countdown Timer + Per-Question Timing + Hard Deadline Lock
function startCountdownTimer() {
  updateTimerUI();
  timerInterval = setInterval(async () => {
    if (isLocked) return;
    remainingSeconds--;
    attempt.elapsedSeconds = (attempt.elapsedSeconds || 0) + 1;

    // Record active seconds on the current question while tab is visible
    const currentQ = exam.questions[currentIndex];
    if (currentQ && !document.hidden) {
      attempt.timings[currentQ.id] = (attempt.timings[currentQ.id] || 0) + 1;
    }

    // Periodically sync timings every 5 seconds
    if (attempt.elapsedSeconds % 5 === 0) {
      apiSaveAttempt(attempt.attemptId, {
        timings: attempt.timings,
        elapsedSeconds: attempt.elapsedSeconds,
        remainingSeconds
      }).catch(() => {});
    }

    updateTimerUI();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      await lockAndAutoSubmit("Automatic · Time expired");
    }
  }, 1000);
}

function updateTimerUI() {
  const safeSecs = Math.max(0, remainingSeconds);
  const mins = String(Math.floor(safeSecs / 60)).padStart(2, "0");
  const secs = String(safeSecs % 60).padStart(2, "0");
  document.getElementById("timer-value").textContent = `${mins}:${secs}`;

  const bar = document.getElementById("status-bar");
  bar.classList.remove("time-low", "time-critical");
  if (safeSecs <= 15) {
    bar.classList.add("time-critical");
  } else if (safeSecs <= 60) {
    bar.classList.add("time-low");
  }
}

// Demo helper button to set timer to 10s so deadline auto-submit can be demonstrated live
document.getElementById("demo-fast-timer").addEventListener("click", () => {
  remainingSeconds = 10;
  updateTimerUI();
});

async function lockAndAutoSubmit(method = "Automatic · Time expired") {
  isLocked = true;
  clearInterval(timerInterval);
  document.getElementById("answer-input").disabled = true;
  document.getElementById("save-status").textContent = `${method} · Locking & submitting...`;

  await apiSaveAttempt(attempt.attemptId, {
    timings: attempt.timings,
    elapsedSeconds: attempt.elapsedSeconds,
    remainingSeconds: 0,
    tabSwitchCount: attempt.tabSwitchCount
  }).catch(() => {});

  await apiSubmitAttempt(attempt.attemptId, method, attempt.answers);
  window.location.href = "sub_confirm.html";
}

// Anti-cheating Tab Focus Loss Detection (Auto-submit after 3 tab switches)
document.addEventListener("visibilitychange", async () => {
  if (isLocked || !attempt) return;

  if (document.hidden) {
    tabLeftTimestamp = Date.now();
  } else if (tabLeftTimestamp) {
    const awaySeconds = Math.max(1, Math.round((Date.now() - tabLeftTimestamp) / 1000));
    const leaveTime = new Date(tabLeftTimestamp).toTimeString().slice(0, 8);
    tabLeftTimestamp = null;

    attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;

    try {
      await apiSaveAttempt(attempt.attemptId, { tabSwitchCount: attempt.tabSwitchCount });
      await apiPostAudit(attempt.attemptId, { awaySeconds, leaveTime });
    } catch {
      // Ignore network hiccup
    }

    if (attempt.tabSwitchCount >= 3) {
      await lockAndAutoSubmit("Automatic · Exceeded 3 tab switches");
      return;
    }

    document.getElementById("tab-warning-text").textContent =
      `Warning ${attempt.tabSwitchCount} of 3: You were away for ${awaySeconds} second${awaySeconds === 1 ? "" : "s"}. At 3 tab switches, your exam will auto-submit.`;
    document.getElementById("tab-warning-modal").classList.add("visible");
  }
});

document.getElementById("resume-exam-btn").addEventListener("click", () => {
  document.getElementById("tab-warning-modal").classList.remove("visible");
});

initExamRunner();
