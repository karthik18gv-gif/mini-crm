const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['new', 'contacted', 'converted', 'lost'];
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* =========================================================
   PUBLIC: capture a lead from a website contact form
   POST /api/leads
   body: { name, email, phone, source, message }
   ========================================================= */
router.post('/', (req, res) => {
  const { name, email, phone, source, message } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });

  const stmt = db.prepare(`
    INSERT INTO leads (name, email, phone, source, message, status)
    VALUES (?, ?, ?, ?, ?, 'new')
  `);
  const info = stmt.run(
    name.trim(),
    email.trim().toLowerCase(),
    (phone || '').trim(),
    (source || 'website').trim(),
    (message || '').trim()
  );

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ message: 'Thanks! Your message has been received.', lead });
});

/* All routes below require a logged-in admin */
router.use(requireAuth);

/* =========================================================
   GET /api/leads
   Query params: search, status, source, sort (newest|oldest), page, limit
   ========================================================= */
router.get('/', (req, res) => {
  const { search = '', status = '', source = '', sort = 'newest', page = 1, limit = 20 } = req.query;

  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('(LOWER(name) LIKE @search OR LOWER(email) LIKE @search)');
    params.search = `%${search.toLowerCase()}%`;
  }
  if (status && VALID_STATUSES.includes(status)) {
    conditions.push('status = @status');
    params.status = status;
  }
  if (source) {
    conditions.push('LOWER(source) = @source');
    params.source = source.toLowerCase();
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (pageNum - 1) * limitNum;

  const total = db.prepare(`SELECT COUNT(*) AS c FROM leads ${whereClause}`).get(params).c;

  const leads = db.prepare(`
    SELECT * FROM leads
    ${whereClause}
    ${orderClause}
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit: limitNum, offset });

  res.json({
    leads,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
  });
});

/* =========================================================
   GET /api/leads/:id  — lead detail + its notes
   ========================================================= */
router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  const notes = db.prepare('SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ lead, notes });
});

/* =========================================================
   PATCH /api/leads/:id/status — update lead status
   body: { status: 'new'|'contacted'|'converted'|'lost' }
   ========================================================= */
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  db.prepare(`UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(status, req.params.id);

  // Auto-log the status change as a system note for a clean audit trail
  db.prepare('INSERT INTO notes (lead_id, note) VALUES (?, ?)')
    .run(req.params.id, `Status changed: "${lead.status}" → "${status}".`);

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json({ lead: updated });
});

/* =========================================================
   PUT /api/leads/:id — edit lead core details
   ========================================================= */
router.put('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  const { name, email, phone, source } = req.body;
  if (email && !isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });

  db.prepare(`
    UPDATE leads SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      source = COALESCE(?, source),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(name?.trim(), email?.trim().toLowerCase(), phone?.trim(), source?.trim(), req.params.id);

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json({ lead: updated });
});

/* =========================================================
   DELETE /api/leads/:id
   ========================================================= */
router.delete('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ message: 'Lead deleted.' });
});

/* =========================================================
   POST /api/leads/:id/notes — add a follow-up note
   body: { note }
   ========================================================= */
router.post('/:id/notes', (req, res) => {
  const { note } = req.body;
  if (!note || !note.trim()) return res.status(400).json({ error: 'Note text is required.' });

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  const info = db.prepare('INSERT INTO notes (lead_id, note) VALUES (?, ?)').run(req.params.id, note.trim());
  const created = db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid);

  db.prepare(`UPDATE leads SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);

  res.status(201).json({ note: created });
});

module.exports = router;
