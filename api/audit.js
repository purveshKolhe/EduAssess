const { getStore } = require("./_store");

function formatClock(date = new Date()) {
  return date.toTimeString().slice(0, 8);
}

module.exports = (req, res) => {
  const store = getStore();
  const attemptId = req.query?.attemptId || req.body?.attemptId || "ATT-1042-01";

  if (!store.auditLogs[attemptId]) {
    store.auditLogs[attemptId] = { reviewed: false, events: [] };
  }

  // GET /api/audit?attemptId=ATT-1042-01
  if (req.method === "GET") {
    return res.status(200).json({
      attemptId,
      audit: store.auditLogs[attemptId]
    });
  }

  // POST /api/audit -> log tab switch OR mark events reviewed
  if (req.method === "POST") {
    const body = req.body || {};
    const audit = store.auditLogs[attemptId];
    const nowStr = formatClock();

    if (body.action === "review") {
      audit.reviewed = true;
      audit.events.push({
        time: nowStr,
        type: "REVIEWED",
        text: `${nowStr} · Teacher marked review events as reviewed`
      });
      return res.status(200).json({ attemptId, audit });
    }

    // Record a tab-left + return event from student browser
    const awaySeconds = Number(body.awaySeconds) || 5;
    const leaveTime = body.leaveTime || nowStr;

    audit.reviewed = false;
    audit.events.push(
      {
        time: leaveTime,
        type: "TAB_LEFT",
        text: `${leaveTime} · Tab left · review event`,
        isFlag: true
      },
      {
        time: nowStr,
        type: "TAB_RETURN",
        text: `${nowStr} · Returned after ${awaySeconds} seconds`
      }
    );

    return res.status(201).json({ attemptId, audit });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
