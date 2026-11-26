const { resetStore } = require("./_store");

module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const store = resetStore();
  return res.status(200).json({ message: "Demo data reset", examsCount: store.exams.length });
};
