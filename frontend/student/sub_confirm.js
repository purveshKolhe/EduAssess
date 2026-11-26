// Submission Confirmation Receipt Page (sub_confirm.js)

async function initReceiptPage() {
  const { attempt, exam } = await apiGetAttempt(getActiveAttemptId());
  if (!attempt || !exam) return;

  const submittedAt = attempt.submittedAt || new Date().toTimeString().slice(0, 8);
  const method = attempt.submitMethod || "Submitted";

  document.getElementById("receipt-banner-sub").textContent =
    `Submitted at ${submittedAt} IST (${method}). Your answers are locked and no saved work was lost.`;

  document.getElementById("receipt-course").textContent = exam.title;

  document.getElementById("receipt-details").innerHTML = `
    <div class="receipt-row"><dd><strong>Exam:</strong> ${exam.code}</dd></div>
    <div class="receipt-row"><dd><strong>Student:</strong> ${attempt.studentName} · ${attempt.studentId}</dd></div>
    <div class="receipt-row"><dd><strong>Attempt:</strong> ${attempt.attemptId}</dd></div>
    <div class="receipt-row"><dd><strong>Started:</strong> ${exam.date}, ${attempt.startedAt} IST</dd></div>
    <div class="receipt-row"><dd><strong>Submitted:</strong> ${exam.date}, ${submittedAt} IST</dd></div>
    <div class="receipt-row"><dd><strong>Method:</strong> ${method}</dd></div>
    <div class="receipt-row"><dd><strong>Receipt ID:</strong> ${attempt.receiptId}</dd></div>
    <div class="receipt-row"><dd><strong>Status:</strong> Received &amp; Locked by EduAssess</dd></div>
  `;

  const questions = exam.questions || [];
  const answered = questions.filter((q) => (attempt.answers?.[q.id] || "").trim().length > 0);
  const unanswered = questions.filter((q) => !(attempt.answers?.[q.id] || "").trim()).map((q) => `Q${q.id}`);

  document.getElementById("submitted-list").innerHTML = `
    <li><strong>${answered.length} of ${questions.length}</strong> saved answers included</li>
    <li>${unanswered.length > 0 ? unanswered.join(", ") + " unanswered" : "0 unanswered questions"}</li>
    <li>Latest save included: ${attempt.lastSavedAt} IST</li>
    <li>Attempt state: Read-only (locked)</li>
  `;
}

initReceiptPage();
