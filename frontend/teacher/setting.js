// Create Exam & Question Builder Logic (setting.js)

const form = document.getElementById("create-exam-form");
const feedbackEl = document.getElementById("form-feedback");
const durationInput = document.getElementById("duration");
const durationHint = document.getElementById("duration-hint");
const dateInput = document.getElementById("exam-date");

// Question builder elements
const countInput = document.getElementById("question-count");
const editorView = document.getElementById("question-editor-view");
const reviewView = document.getElementById("question-review-view");
const qCounterEl = document.getElementById("q-counter");
const qTextInput = document.getElementById("q-text");
const qPointsInput = document.getElementById("q-points");
const prevQBtn = document.getElementById("prev-q-btn");
const nextQBtn = document.getElementById("next-q-btn");
const reviewListEl = document.getElementById("question-review-list");
const reviewHeadingEl = document.getElementById("review-heading");

// Default date input to today (YYYY-MM-DD)
dateInput.value = new Date().toISOString().split("T")[0];

// State for questions
let questions = [];
let currentIdx = 0;

function showFeedback(message, type) {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback-banner ${type}`;
}

// Resize the questions array while keeping existing text
function setQuestionCount(count) {
  const total = Math.max(1, Math.min(100, Number(count) || 1));
  countInput.value = total;

  const updated = [];
  for (let i = 0; i < total; i++) {
    updated.push(
      questions[i] || { id: i + 1, title: `Question ${i + 1}`, text: "", points: 2 }
    );
  }
  questions = updated;
  if (currentIdx >= questions.length) {
    currentIdx = questions.length - 1;
  }
  renderEditor();
}

function saveCurrentQuestion() {
  if (!questions[currentIdx]) return;
  questions[currentIdx].text = qTextInput.value.trim();
  questions[currentIdx].points = Math.max(1, Number(qPointsInput.value) || 1);
}

function showEditorView() {
  reviewView.classList.add("hidden");
  editorView.classList.remove("hidden");
  renderEditor();
}

function showReviewView() {
  saveCurrentQuestion();
  editorView.classList.add("hidden");
  reviewView.classList.remove("hidden");
  renderReviewList();
}

function renderEditor() {
  const q = questions[currentIdx];
  qCounterEl.textContent = `Question ${currentIdx + 1} of ${questions.length}`;
  qTextInput.value = q.text;
  qPointsInput.value = q.points;

  prevQBtn.disabled = currentIdx === 0;
  nextQBtn.textContent =
    currentIdx === questions.length - 1 ? "Review all questions →" : "Next →";
}

function renderReviewList() {
  reviewHeadingEl.textContent = `All questions (${questions.length})`;
  reviewListEl.innerHTML = "";

  questions.forEach((q, idx) => {
    const item = document.createElement("div");
    item.className = "q-review-item";

    const info = document.createElement("div");
    info.className = "q-review-text";
    const textHtml = q.text
      ? q.text
      : `<span class="q-review-empty">(Empty — click Edit to write)</span>`;
    info.innerHTML = `<strong>Q${idx + 1} (${q.points} pts):</strong> ${textHtml}`;

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "outline-btn q-edit-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      currentIdx = idx;
      showEditorView();
      qTextInput.focus();
    });

    item.appendChild(info);
    item.appendChild(editBtn);
    reviewListEl.appendChild(item);
  });
}

// Save as teacher types
qTextInput.addEventListener("input", saveCurrentQuestion);
qPointsInput.addEventListener("input", saveCurrentQuestion);

document.getElementById("apply-count-btn").addEventListener("click", () => {
  saveCurrentQuestion();
  setQuestionCount(countInput.value);
  showEditorView();
});

prevQBtn.addEventListener("click", () => {
  saveCurrentQuestion();
  if (currentIdx > 0) {
    currentIdx--;
    renderEditor();
  }
});

nextQBtn.addEventListener("click", () => {
  saveCurrentQuestion();
  if (currentIdx < questions.length - 1) {
    currentIdx++;
    renderEditor();
  } else {
    showReviewView();
  }
});

document.getElementById("review-all-btn").addEventListener("click", showReviewView);
document.getElementById("back-to-editor-btn").addEventListener("click", showEditorView);

// Update helper text live as duration changes
durationInput.addEventListener("input", () => {
  const mins = Number(durationInput.value) || 0;
  durationHint.textContent = `Each student gets ${mins} minute${mins === 1 ? "" : "s"} from their start time.`;
});

async function handleSaveExam(status) {
  saveCurrentQuestion();

  const title = document.getElementById("exam-title").value.trim();
  const className = document.getElementById("class").value;
  const code = document.getElementById("exam-code").value.trim().toUpperCase();
  const date = dateInput.value;
  const opensAt = document.getElementById("open-time").value;
  const lastEntryAt = document.getElementById("last-entry").value;
  const durationMins = Number(durationInput.value);
  const trackTabSwitch = document.getElementById("track-tab-switch").checked;

  if (!title) {
    showFeedback("Enter an exam title before saving.", "error");
    return;
  }
  if (!code) {
    showFeedback("Enter an exam code so students can join.", "error");
    return;
  }
  if (!date || !opensAt || !lastEntryAt) {
    showFeedback("Select a valid exam date, open time, and last entry time.", "error");
    return;
  }
  if (lastEntryAt <= opensAt) {
    showFeedback("Last entry time must be later than the open time.", "error");
    return;
  }
  if (!durationMins || durationMins < 1) {
    showFeedback("Set a duration of at least 1 minute to publish this exam.", "error");
    return;
  }

  // Ensure every question has text
  const emptyIndex = questions.findIndex((q) => !q.text);
  if (emptyIndex !== -1) {
    currentIdx = emptyIndex;
    showEditorView();
    qTextInput.focus();
    showFeedback(`Question ${emptyIndex + 1} is empty. Please fill in all questions.`, "error");
    return;
  }

  try {
    await apiCreateExam({
      title,
      className,
      code,
      date,
      opensAt,
      lastEntryAt,
      durationMins,
      trackTabSwitch,
      status,
      questions
    });

    showFeedback(
      status === "DRAFT"
        ? `Draft "${title}" saved. Returning to Your exams...`
        : `Exam "${title}" (${code}) published! Returning to Your exams...`,
      "success"
    );

    setTimeout(() => {
      window.location.href = "audit_log.html";
    }, 650);
  } catch (err) {
    showFeedback(err.message, "error");
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  handleSaveExam("LIVE");
});

document.getElementById("save-draft-btn").addEventListener("click", () => {
  handleSaveExam("DRAFT");
});

// Initialize with default question count
setQuestionCount(countInput.value);
