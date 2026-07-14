require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const analyticsRoutes = require('./routes/analytics');

// Fail fast with a clear message if required config is missing
if (!process.env.JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET in your .env file. Copy .env.example to .env and set a value.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ---------- API routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---------- Static frontend ----------
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Mini CRM server running at http://localhost:${PORT}`);
  console.log(`   Public site:     http://localhost:${PORT}/`);
  console.log(`   Admin login:     http://localhost:${PORT}/admin/login.html\n`);
});
