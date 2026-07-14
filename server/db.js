// =========================================================
// Database layer — SQLite via better-sqlite3
// Chosen for zero-config setup: no external DB server needed
// to run or grade this project. Swappable for MySQL/MongoDB
// later (see README "Swapping the database" section).
// =========================================================
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'crm.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- SCHEMA ----------
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','lost')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_notes_lead ON notes(lead_id);
`);

// ---------- SEED DEFAULT ADMIN (idempotent) ----------
function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@karthikgv.dev';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (username, email, password_hash) VALUES (?, ?, ?)')
      .run(username, email, hash);
    console.log(`✔ Seeded default admin user "${username}" (change the password after first login).`);
  }
}
seedAdmin();

// ---------- SEED SAMPLE LEADS (only if table empty, for demo/grading convenience) ----------
function seedSampleLeads() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM leads').get().c;
  if (count > 0) return;

  const insertLead = db.prepare(`
    INSERT INTO leads (name, email, phone, source, message, status, created_at)
    VALUES (@name, @email, @phone, @source, @message, @status, @created_at)
  `);
  const insertNote = db.prepare(`INSERT INTO notes (lead_id, note, created_at) VALUES (?, ?, ?)`);

  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  };

  const sample = [
    { name: 'Ananya Rao', email: 'ananya.rao@example.com', phone: '9900011122', source: 'website', message: 'Interested in a portfolio website for my design studio.', status: 'new', created_at: daysAgo(0) },
    { name: 'Rahul Mehta', email: 'rahul.mehta@example.com', phone: '9900022233', source: 'referral', message: 'Need a CRM for my small consulting business.', status: 'contacted', created_at: daysAgo(1) },
    { name: 'Priya Nair', email: 'priya.nair@example.com', phone: '9900033344', source: 'linkedin', message: 'Looking for a developer to build an e-commerce site.', status: 'converted', created_at: daysAgo(3) },
    { name: 'Suresh Kumar', email: 'suresh.kumar@example.com', phone: '9900044455', source: 'website', message: 'Wants a quote for a hostel management system.', status: 'new', created_at: daysAgo(1) },
    { name: 'Divya Shetty', email: 'divya.shetty@example.com', phone: '9900055566', source: 'instagram', message: 'Interested in freelance web development services.', status: 'contacted', created_at: daysAgo(5) },
    { name: 'Vikram Joshi', email: 'vikram.joshi@example.com', phone: '9900066677', source: 'referral', message: 'Needs a cloud migration consultation.', status: 'lost', created_at: daysAgo(9) },
    { name: 'Meera Iyer', email: 'meera.iyer@example.com', phone: '9900077788', source: 'website', message: 'Building a citizen-services web app for her NGO.', status: 'converted', created_at: daysAgo(12) },
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      const info = insertLead.run(row);
      if (row.status !== 'new') {
        insertNote.run(info.lastInsertRowid, `Initial follow-up call completed. Lead marked as "${row.status}".`, row.created_at);
      }
    }
  });
  insertMany(sample);
  console.log('✔ Seeded sample leads for demo/testing purposes.');
}
seedSampleLeads();

module.exports = db;
