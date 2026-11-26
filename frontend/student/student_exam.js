// Student Join Exam Page (student_exam.js)

let selectedExam = null;
const feedbackEl = document.getElementById("join-feedback");
const startBtn = document.getElementById("start-exam-btn");

function showJoinFeedback(msg, type) {
  feedbackEl.textContent = msg;
  feedbackEl.className = `feedback-banner ${type}`;
}

function renderExamDetails(exam) {
  selectedExam = exam;
  document.getElementById("exam-title").textContent = exam.title;
  document.getElementById("exam-status-tag").textContent =
    exam.status === "LIVE" ? `AVAILABLE TO START · ${exam.code}` : `${exam.status} · ${exam.code}`;
  document.getElementById("exam-instructor").textContent = `Dr. Aisha Shah · ${exam.className}`;

  const qCount = exam.questions ? exam.questions.length : 0;
  const totalPoints = (exam.questions || []).reduce((sum, q) => sum + (q.points || 1), 0);

  document.getElementById("exam-specs-list").innerHTML = `
    <li>${exam.date} · India Standard Time</li>
    <li>Entry window: ${exam.opensAt}–${exam.lastEntryAt}</li>
    <li>Duration: ${exam.durationMins} minutes from your start</li>
    <li>${qCount} questions · ${totalPoints} points</li>
    <li>One attempt · Tab switches logged for review</li>
  `;

  startBtn.textContent = `Start exam · ${exam.durationMins} minutes`;
  startBtn.disabled = exam.status !== "LIVE";
}

// Find exam by code
document.getElementById("find-exam-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("exam-code").value.trim().toUpperCase();
  if (!code) {
    showJoinFeedback("Enter an exam code to look up your exam.", "error");
    return;
  }

  try {
    const exam = await apiFindExamByCode(code);
    renderExamDetails(exam);
    if (exam.status !== "LIVE") {
      showJoinFeedback(`Exam "${exam.title}" is currently ${exam.status} and cannot be started.`, "error");
    } else {
      showJoinFeedback(`✓ Found "${exam.title}" (${exam.code}). Ready to start.`, "success");
    }
  } catch (err) {
    selectedExam = null;
    startBtn.disabled = true;
    showJoinFeedback(err.message, "error");
  }
});

// Start exam attempt
startBtn.addEventListener("click", async () => {
  if (!selectedExam) {
    showJoinFeedback("Find a valid exam first using its exam code.", "error");
    return;
  }

  const agreed = document.getElementById("agree-rules").checked;
  if (!agreed) {
    showJoinFeedback("Please tick the checkbox confirming you understand the timer and tab-switch policy.", "error");
    return;
  }

  try {
    await apiStartAttempt(selectedExam.code);
    window.location.href = "exam_view.html";
  } catch (err) {
    showJoinFeedback(err.message, "error");
  }
});
