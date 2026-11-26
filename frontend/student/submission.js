// Pre-Submission Review Page (submission.js)

let currentAttempt = null;
let currentExam = null;
let secs = 31;

async function initSubmissionPage() {
  const data = await apiGetAttempt(getActiveAttemptId());
  currentAttempt = data.attempt;
  currentExam = data.exam;

  if (!currentAttempt || !currentExam) return;

  if (currentAttempt.status === "SUBMITTED") {
    window.location.href = "sub_confirm.html";
    return;
  }

  document.getElementById("sub-exam-meta").textContent = `${currentExam.code} · ${currentExam.title}`;
  document.getElementById("sub-student-meta").textContent = `${currentAttempt.studentName} · ${currentAttempt.studentId}`;
  document.getElementById("sub-save-time").textContent = `✓ All changes saved at ${currentAttempt.lastSavedAt}`;

  const questions = currentExam.questions || [];
  const answered = questions.filter((q) => (currentAttempt.answers?.[q.id] || "").trim().length > 0);
  const unanswered = questions.filter((q) => !(currentAttempt.answers?.[q.id] || "").trim()).map((q) => `Q${q.id}`);
  const flagged = (currentAttempt.flaggedQuestions || []).map((id) => `Q${id}`);

  document.getElementById("summary-list").innerHTML = `
    <li><strong>${answered.length} / ${questions.length}</strong> questions answered</li>
    <li>${unanswered.length} unanswered${unanswered.length > 0 ? " · " + unanswered.join(", ") : ""}</li>
    <li>Latest draft saved at ${currentAttempt.lastSavedAt}</li>
    <li>${flagged.length} question${flagged.length === 1 ? "" : "s"} marked for review${flagged.length > 0 ? " · " + flagged.join(", ") : ""}</li>
  `;

  secs = Math.max(10, currentAttempt.remainingSeconds || 31);
  setInterval(async () => {
    secs--;
    const m = String(Math.floor(Math.max(0, secs) / 60)).padStart(2, "0");
    const s = String(Math.max(0, secs) % 60).padStart(2, "0");
    document.getElementById("sub-timer-heading").textContent = `${m}:${s} remaining · Timer continues`;

    if (secs <= 0) {
      await apiSubmitAttempt(currentAttempt.attemptId, "Automatic · Time expired", currentAttempt.answers);
      window.location.href = "sub_confirm.html";
    }
  }, 1000);
}

document.getElementById("confirm-submit-btn").addEventListener("click", async () => {
  if (!currentAttempt) return;
  await apiSubmitAttempt(currentAttempt.attemptId, "Manual · Confirmed by student", currentAttempt.answers);
  window.location.href = "sub_confirm.html";
});

initSubmissionPage();
