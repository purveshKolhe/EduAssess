const { getStore } = require("./_store");

module.exports = (req, res) => {
  const store = getStore();

  // GET /api/exams or GET /api/exams?code=BIO-CELL-01
  if (req.method === "GET") {
    const code = (req.query?.code || "").trim().toUpperCase();
    if (code) {
      const exam = store.exams.find((e) => e.code.toUpperCase() === code);
      if (!exam) {
        return res.status(404).json({ error: `No exam found with code "${code}".` });
      }
      return res.status(200).json({ exam });
    }
    return res.status(200).json({ exams: store.exams });
  }

  // POST /api/exams -> Create and publish a new exam
  if (req.method === "POST") {
    const body = req.body || {};
    const title = (body.title || "").trim();
    const durationMins = Number(body.durationMins);

    if (!title) {
      return res.status(400).json({ error: "Enter an exam title before publishing." });
    }
    if (!durationMins || durationMins < 1) {
      return res.status(400).json({ error: "Set a duration of at least 1 minute to publish this exam." });
    }

    const code = (body.code || `BIO-${Math.floor(100 + Math.random() * 900)}`).trim().toUpperCase();
    const existingIndex = store.exams.findIndex((e) => e.code.toUpperCase() === code);

    const questions = Array.isArray(body.questions) && body.questions.length > 0
      ? body.questions
      : [
          { id: 1, title: "Concept check", text: `Explain the key principles covered in ${title}.`, points: 5 },
          { id: 2, title: "Application", text: "Provide one real-world example and justify your reasoning.", points: 5 }
        ];

    const newExam = {
      examId: `exam-${Date.now()}`,
      code,
      title,
      className: body.className || "Class 10-B · 30 students",
      date: body.date || "23 Oct 2026",
      opensAt: body.opensAt || "09:00",
      lastEntryAt: body.lastEntryAt || "09:30",
      durationMins,
      status: body.status === "DRAFT" ? "DRAFT" : "LIVE",
      trackTabSwitch: body.trackTabSwitch !== false,
      inProgressCount: 0,
      submittedCount: 0,
      notStartedCount: 30,
      questions
    };

    if (existingIndex >= 0) {
      store.exams[existingIndex] = newExam;
    } else {
      store.exams.unshift(newExam);
    }

    return res.status(201).json({ exam: newExam });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
