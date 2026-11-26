// Teacher Exams Dashboard (audit_log.js)

let allExams = [];
let currentFilter = "ALL";

async function loadExamsPage() {
  allExams = await apiGetExams();
  updateTabCounts();
  renderExams();
}

function updateTabCounts() {
  const liveCount = allExams.filter((e) => e.status === "LIVE").length;
  const draftCount = allExams.filter((e) => e.status === "DRAFT").length;

  document.querySelector('[data-filter="ALL"]').textContent = `All exams (${allExams.length})`;
  document.querySelector('[data-filter="LIVE"]').textContent = `Live (${liveCount})`;
  document.querySelector('[data-filter="DRAFT"]').textContent = `Drafts (${draftCount})`;
}

function renderExams() {
  const listEl = document.getElementById("exam-list");
  const filtered = currentFilter === "ALL"
    ? allExams
    : allExams.filter((e) => e.status === currentFilter);

  if (filtered.length === 0) {
    listEl.innerHTML = `<p class="loading-text">No exams match this filter.</p>`;
    return;
  }

  listEl.innerHTML = filtered.map((exam) => {
    const qCount = exam.questions ? exam.questions.length : 0;

    if (exam.status === "LIVE") {
      return `
        <div class="exam-card card-live">
          <div class="exam-title-col">
            <h3>${exam.title}</h3>
            <span class="status-pill status-live">LIVE · ${exam.code}</span>
          </div>
          <div class="exam-meta-col">
            <p>${exam.date} · Entry ${exam.opensAt}–${exam.lastEntryAt} IST</p>
            <p>${exam.durationMins} minutes per attempt · ${qCount} questions</p>
            <p>${exam.className}</p>
            <div class="exam-progress">
              <p class="progress-dark">${exam.inProgressCount} in progress · ${exam.submittedCount} submitted</p>
              <p class="progress-dark">${exam.notStartedCount} not started</p>
            </div>
          </div>
          <div class="exam-action-col">
            <a href="questions.html" class="dark-btn">Monitor live →</a>
          </div>
        </div>
      `;
    }

    if (exam.status === "DRAFT") {
      return `
        <div class="exam-card card-draft">
          <div class="exam-title-col">
            <h3>${exam.title}</h3>
            <span class="status-pill status-draft">DRAFT · ${qCount} questions added</span>
          </div>
          <div class="exam-meta-col">
            <p>Code: ${exam.code} · Not yet available to students</p>
          </div>
          <div class="exam-action-col">
            <a href="setting.html" class="outline-btn">Continue editing</a>
          </div>
        </div>
      `;
    }

    return `
      <div class="exam-card card-closed">
        <div class="exam-title-col">
          <h3>${exam.title}</h3>
          <span class="status-pill status-closed">CLOSED · ${exam.date}</span>
        </div>
        <div class="exam-meta-col">
          <p>${exam.submittedCount} / 30 submitted</p>
        </div>
        <div class="exam-action-col">
          <a href="questions.html" class="outline-btn">View results &amp; exports</a>
        </div>
      </div>
    `;
  }).join("");
}

// Tab click listeners
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderExams();
  });
});

loadExamsPage();
