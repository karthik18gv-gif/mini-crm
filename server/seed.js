require('dotenv').config();
// Simply requiring db.js runs schema creation + idempotent seeding.
require('./db');
console.log('✔ Database is ready (schema created, admin + sample leads seeded if not already present).');
