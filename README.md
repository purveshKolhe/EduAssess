# EduAssess

EduAssess is a proctored online examination web dashboard with anti-cheating audit logs and real-time timer analytics, built for our 4-week OJT project (`PST_PD_006`).

- **Team:** Tanisha Pravin Rajgire & Purvesh Vasantrao Kolhe
- **Mentor:** Madhushri Tangali

## Implemented Features

1. **Teacher — Exam List & Creation (`frontend/teacher/audit_log.html`, `setting.html`)**
   - View and filter Live, Draft, and Closed exams.
   - Create and publish new exams with validation (title, exam code, duration, start window, and custom question).
2. **Student — Timed Exam Runner (`frontend/student/student_exam.html`, `exam_view.html`)**
   - Join an exam by code (e.g., `BIO-CELL-01` or a newly created code).
   - Live countdown timer (`setInterval`) with hard deadline lock and automatic submission at `00:00`.
   - Instant auto-save across questions, word counter, and question review flags.
   - Client-side tab-focus detection (`visibilitychange`) that warns the student and appends an event to the teacher's audit log.
3. **Teacher — Attempt Inspection, Audit Log & Export (`frontend/teacher/questions.html`)**
   - Inspect saved answers per question, review chronological tab-switch events, mark flags as reviewed, and download a CSV/JSON snapshot.

## Running Locally

No external `npm` packages are required (uses built-in Node.js modules):

```bash
node server.js
```

Open `http://localhost:3000` in your browser.

## Deploying on Vercel

Push this folder to GitHub and import the repository in Vercel. Vercel automatically serves `index.html` and runs the serverless JavaScript API routes inside `/api/` (`exams.js`, `attempts.js`, `audit.js`, `reset.js`).

> **Demo Limitation:** Proctoring uses simplified client-side browser visibility signals on sample data and is not tamper-proof identity or camera verification.
