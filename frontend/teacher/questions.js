// Teacher Attempt Review & Audit Log Page (questions.js)

let currentAttempt = null;
let currentExam = null;
let currentAudit = null;

async function loadAttemptPage() {
  const attemptId = getActiveAttemptId();
  const data = await apiGetAttempt(attemptId);
  currentAttempt = data.attempt;
  currentExam = data.exam;

  renderStudentHeader();
  populateQuestionDropdown();
  renderTimingAnalytics();
  await loadAndRenderAudit();
}

function formatDuration(totalSecs) {
  const safe = Math.max(0, Math.round(totalSecs || 0));
  const mins = Math.floor(safe / 60);
  const secs = String(safe % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function renderTimingAnalytics() {
  if (!currentAttempt || !currentExam) return;

  const questions = currentExam.questions || [];
  const timings = currentAttempt.timings || {};
  const activeSecs = questions.reduce((sum, q) => sum + (Number(timings[q.id]) || 0), 0);
  const elapsedSecs = typeof currentAttempt.elapsedSeconds === "number"
    ? currentAttempt.elapsedSeconds
    : activeSecs;

  document.getElementById("timing-summary").textContent =
    `Elapsed ${formatDuration(elapsedSecs)} · Active on questions ${formatDuration(activeSecs)}`;

  const maxSecs = Math.max(60, ...questions.map((q) => Number(timings[q.id]) || 0));
  const barsEl = document.getElementById("timing-bars");

  barsEl.innerHTML = questions.map((q) => {
    const secs = Number(timings[q.id]) || 0;
    const widthPct = Math.min(100, Math.round((secs / maxSecs) * 100));
    return `
      <div class="time-bar">
        <span>Q${q.id}</span>
        <div class="bar-background">
          <div class="bar-fill" style="width: ${widthPct}%"></div>
        </div>
        <span>${formatDuration(secs)}</span>
      </div>
    `;
  }).join("");

  const midMins = (maxSecs / 120).toFixed(1).replace(/\.0$/, "");
  const fullMins = (maxSecs / 60).toFixed(1).replace(/\.0$/, "");
  document.getElementById("timing-scale").innerHTML = `
    <span>0</span>
    <span>${midMins} min</span>
    <span>${fullMins} min</span>
  `;

  document.getElementById("timing-footer").textContent =
    `All ${questions.length} question${questions.length === 1 ? "" : "s"} shown`;
}

function renderStudentHeader() {
  if (!currentAttempt) return;

  document.getElementById("student-name").textContent = currentAttempt.studentName;
  document.getElementById("student-details").innerHTML = `
    <p>${currentAttempt.studentId} · ${currentAttempt.className} / ${currentAttempt.examCode} · Attempt ${currentAttempt.attemptId}</p>
    <p>Started ${currentAttempt.startedAt} · Ends ${currentAttempt.endsAt}</p>
  `;

  const statusBox = document.getElementById("attempt-status-box");
  const statusTitle = document.getElementById("attempt-status-title");
  const statusSub = document.getElementById("attempt-status-sub");

  const questions = currentExam?.questions || [];
  const answeredCount = questions.filter((q) => (currentAttempt.answers?.[q.id] || "").trim().length > 0).length;

  if (currentAttempt.status === "SUBMITTED") {
    statusBox.classList.add("submitted");
    statusTitle.textContent = `✓ Submitted & locked · ${currentAttempt.submittedAt}`;
    statusSub.textContent = `${answeredCount} / ${questions.length} answered · Method: ${currentAttempt.submitMethod || "Submitted"}.`;
  } else {
    statusBox.classList.remove("submitted");
    const mins = String(Math.floor(currentAttempt.remainingSeconds / 60)).padStart(2, "0");
    const secs = String(currentAttempt.remainingSeconds % 60).padStart(2, "0");
    statusTitle.textContent = `In progress · ${mins}:${secs} remaining`;
    statusSub.textContent = `${answeredCount} / ${questions.length} answered · All changes saved at ${currentAttempt.lastSavedAt}.`;
  }
}

function populateQuestionDropdown() {
  const select = document.getElementById("inspect-question");
  const questions = currentExam?.questions || [];

  select.innerHTML = questions.map((q) => {
    return `<option value="${q.id}">Q${q.id} · ${q.title}</option>`;
  }).join("");

  // Default to last question (Q12) if present
  if (questions.length > 0) {
    select.value = String(questions[questions.length - 1].id);
  }

  select.addEventListener("change", () => {
    showSelectedQuestion(Number(select.value));
  });

  showSelectedQuestion(Number(select.value));
}

function showSelectedQuestion(questionId) {
  const questions = currentExam?.questions || [];
  const question = questions.find((q) => q.id === questionId) || questions[0];
  if (!question) return;

  const answer = (currentAttempt.answers?.[question.id] || "").trim();
  const wordCount = answer ? answer.split(/\s+/).length : 0;

  document.getElementById("question-prompt").textContent = question.text;
  document.getElementById("student-answer-text").textContent = answer || "(No answer entered yet)";
  document.getElementById("saved-time-meta").textContent =
    `Draft saved ${currentAttempt.lastSavedAt} · ${wordCount} words`;

  const unanswered = questions.filter((q) => !(currentAttempt.answers?.[q.id] || "").trim()).map((q) => `Q${q.id}`);
  document.getElementById("unanswered-meta").textContent =
    `${unanswered.length > 0 ? unanswered.join(", ") + " unanswered" : "All questions answered"} · Q${question.id} shown`;
}

async function loadAndRenderAudit() {
  const attemptId = currentAttempt?.attemptId || getActiveAttemptId();
  currentAudit = await apiGetAudit(attemptId);

  const eventsEl = document.getElementById("audit-events");
  const flagHeading = document.getElementById("flag-status-heading");
  const reviewBtn = document.getElementById("mark-reviewed-btn");

  const flagCount = currentAudit.events.filter((ev) => ev.isFlag).length;

  if (flagCount === 0) {
    flagHeading.textContent = "0 review flags · Clean session";
    flagHeading.className = "flag-warning flag-reviewed";
  } else if (currentAudit.reviewed) {
    flagHeading.textContent = `${flagCount} review flag${flagCount > 1 ? "s" : ""} · Reviewed`;
    flagHeading.className = "flag-warning flag-reviewed";
    reviewBtn.textContent = "✓ Marked as reviewed";
    reviewBtn.classList.add("reviewed");
  } else {
    flagHeading.textContent = `${flagCount} review flag${flagCount > 1 ? "s" : ""} · Not yet reviewed`;
    flagHeading.className = "flag-warning";
    reviewBtn.textContent = "Mark event reviewed";
    reviewBtn.classList.remove("reviewed");
  }

  eventsEl.innerHTML = currentAudit.events.map((ev) => {
    return `<p class="${ev.isFlag ? "event-flag" : ""}">${ev.text}</p>`;
  }).join("");
}

// Mark review flag as reviewed
document.getElementById("mark-reviewed-btn").addEventListener("click", async () => {
  const attemptId = currentAttempt?.attemptId || getActiveAttemptId();
  currentAudit = await apiPostAudit(attemptId, { action: "review" });
  await loadAndRenderAudit();
});

// Refresh audit log live
document.getElementById("refresh-audit-btn").addEventListener("click", async () => {
  await loadAttemptPage();
});

// Export CSV or JSON file
document.getElementById("download-btn").addEventListener("click", () => {
  if (!currentAttempt) return;

  const format = document.querySelector('input[name="format"]:checked')?.value || "CSV";
  const includeAnswers = document.getElementById("inc-answers").checked;
  const includeAudit = document.getElementById("inc-audit").checked;

  let content = "";
  let mime = "text/plain";
  let ext = "txt";

  if (format === "JSON") {
    const payload = {
      attemptId: currentAttempt.attemptId,
      student: `${currentAttempt.studentName} (${currentAttempt.studentId})`,
      examCode: currentAttempt.examCode,
      status: currentAttempt.status,
      ...(includeAnswers ? { answers: currentAttempt.answers } : {}),
      ...(includeAudit ? { auditLog: currentAudit } : {})
    };
    content = JSON.stringify(payload, null, 2);
    mime = "application/json";
    ext = "json";
  } else {
    const rows = [
      ["Student", currentAttempt.studentName, currentAttempt.studentId],
      ["Exam", currentAttempt.examCode, currentAttempt.status],
      []
    ];
    if (includeAnswers) {
      rows.push(["Question", "Answer"]);
      (currentExam?.questions || []).forEach((q) => {
        rows.push([`Q${q.id}: ${q.title}`, `"${(currentAttempt.answers?.[q.id] || "").replace(/"/g, '""')}"`]);
      });
      rows.push([]);
    }
    if (includeAudit && currentAudit) {
      rows.push(["Audit Event"]);
      currentAudit.events.forEach((ev) => rows.push([`"${ev.text}"`]));
    }
    content = rows.map((r) => r.join(",")).join("\n");
    mime = "text/csv";
    ext = "csv";
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentAttempt.attemptId}-report.${ext}`;
  a.click();
  URL.revokeObjectURL(url);

  document.getElementById("export-note").textContent =
    `✓ Downloaded ${currentAttempt.attemptId}-report.${ext}`;
});

loadAttemptPage();
