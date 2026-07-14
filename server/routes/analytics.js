const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/analytics — summary stats for the dashboard
router.get('/', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS c FROM leads').get().c;

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) AS count FROM leads GROUP BY status
  `).all();

  const statusCounts = { new: 0, contacted: 0, converted: 0, lost: 0 };
  byStatus.forEach((row) => { statusCounts[row.status] = row.count; });

  const bySource = db.prepare(`
    SELECT source, COUNT(*) AS count FROM leads GROUP BY source ORDER BY count DESC
  `).all();

  const conversionRate = total > 0 ? Math.round((statusCounts.converted / total) * 1000) / 10 : 0;

  // Leads received per day for the last 7 days (for a simple trend chart)
  const last7Days = db.prepare(`
    SELECT date(created_at) AS day, COUNT(*) AS count
    FROM leads
    WHERE created_at >= datetime('now', '-6 days')
    GROUP BY day
    ORDER BY day ASC
  `).all();

  res.json({
    total,
    statusCounts,
    bySource,
    conversionRate,
    last7Days
  });
});

module.exports = router;
