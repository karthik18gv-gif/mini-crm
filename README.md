# Mini CRM — Client Lead Management System

Built for **Future Interns — Full Stack Web Development, Task 2 (2026)**.

A working full-stack CRM: a public lead-capture website + a secure admin dashboard to track, filter and follow up on leads until they convert.

**Author:** Karthik G V

---

## 📖 What this is

Whenever someone fills out a contact form on a business website, someone needs to see that lead, follow up, and track whether it converts. This project is that system, end to end:

- A **public site** (`/`) with a real contact form that creates a lead
- A **secure admin dashboard** (`/admin`) where only a logged-in admin can view/manage leads
- A **REST API** (Node.js + Express) handling all business logic
- A **SQLite database** storing leads and their follow-up notes

## ✨ Features

**Core (required by the task):**
- ✅ Lead listing — name, email, source, status, received date
- ✅ Lead status pipeline — `new → contacted → converted` (+ `lost`)
- ✅ Follow-up notes per lead, with full timestamped history
- ✅ Secure admin access — JWT-based login, all CRM routes protected server-side

**Bonus (also implemented):**
- ✅ Search leads by name/email
- ✅ Filter by status and by source
- ✅ Sort by newest/oldest
- ✅ Pagination
- ✅ Timestamp tracking on every lead and note (created + updated)
- ✅ Analytics dashboard — total leads, breakdown by status, conversion rate %, 7-day trend chart, breakdown by lead source
- ✅ Automatic audit-trail note whenever a status changes
- ✅ Edit lead details, delete lead
- ✅ Fully responsive UI (mobile-friendly sidebar + table)

  ## netlify link
  task2-mini-crm-781.netlify.app

## 🗂️ Project Structure

```
mini-crm/
├── server/
│   ├── server.js          # Express app entry point
│   ├── db.js               # SQLite schema + seeding (admin + demo leads)
│   ├── seed.js              # Standalone "npm run seed" script
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware
│   └── routes/
│       ├── auth.js          # POST /api/auth/login, GET /api/auth/me
│       ├── leads.js         # Lead CRUD, status updates, notes
│       └── analytics.js     # GET /api/analytics
├── public/
│   ├── index.html           # Public site with contact form (lead capture)
│   ├── admin/
│   │   ├── login.html
│   │   └── dashboard.html   # Overview + Leads views, lead detail modal
│   ├── css/style.css
│   └── js/
│       ├── public.js         # Contact form submission
│       ├── auth.js           # Login handling
│       └── dashboard.js      # Dashboard: fetch, render, filter, modal logic
├── package.json
├── .env.example
└── README.md
```

## 🛠️ Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | HTML / CSS / vanilla JavaScript | No build step — runs anywhere, easy to grade/run instantly |
| Backend | Node.js + Express | Matches the task's recommended stack; clean REST API |
| Database | SQLite (`better-sqlite3`) | Zero external setup — the whole app runs with just `npm install && npm start`, no MongoDB/MySQL server required to grade it |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` password hashing | Stateless, standard, secure |

> The task also lists MongoDB/MySQL as options. This build uses SQLite so the project is fully self-contained and runs with zero external services — see **"Swapping the database"** below if you'd like to migrate to MongoDB or MySQL for production.

## 🚀 Setup & Run Locally

**Requirements:** Node.js 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
# Open .env and set a real JWT_SECRET (any long random string) and change ADMIN_PASSWORD if you like

# 3. Start the server (this also creates crm.db automatically on first run,
#    seeds a default admin account, and adds a few sample leads for testing)
npm start

# App is now running at:
#   Public site   → http://localhost:5000/
#   Admin login   → http://localhost:5000/admin/login.html
```

**Default demo login:** `admin` / `admin123` (from `.env.example` — change this before deploying publicly).

For auto-restart during development: `npm run dev` (uses `nodemon`).

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/leads` | Public | Submit a new lead (from the contact form) |
| GET | `/api/leads` | Admin | List leads — supports `?search=&status=&source=&sort=&page=&limit=` |
| GET | `/api/leads/:id` | Admin | Get one lead + its notes |
| PUT | `/api/leads/:id` | Admin | Edit lead details |
| PATCH | `/api/leads/:id/status` | Admin | Update lead status (auto-logs a note) |
| DELETE | `/api/leads/:id` | Admin | Delete a lead |
| POST | `/api/leads/:id/notes` | Admin | Add a follow-up note |
| POST | `/api/auth/login` | Public | Log in, returns a JWT |
| GET | `/api/auth/me` | Admin | Verify current session |
| GET | `/api/analytics` | Admin | Dashboard stats (totals, status breakdown, conversion rate, 7-day trend, source breakdown) |

All admin routes require `Authorization: Bearer <token>` — the dashboard handles this automatically after login.

## 🔄 How data flows (frontend → database → dashboard)

1. A visitor fills the form on `/` → `POST /api/leads` → row inserted into the `leads` table with status `new`.
2. Admin logs in at `/admin/login.html` → `POST /api/auth/login` verifies the password hash and returns a signed JWT, stored in `localStorage`.
3. The dashboard (`/admin/dashboard.html`) calls `GET /api/leads` and `GET /api/analytics` with that token to render the table and stats.
4. Clicking a row opens a detail modal (`GET /api/leads/:id`) where the admin can change status (`PATCH .../status`) or add a note (`POST .../notes`) — both update the database immediately and the UI refreshes.

## 🔁 Swapping the database (MongoDB / MySQL)

The `server/db.js` file is the only place that touches the database directly (plain SQL via `better-sqlite3`). To migrate:
- **MongoDB:** replace `db.js` with a Mongoose connection + `Lead` and `Note` schemas; update the `db.prepare(...).run/get/all` calls in `routes/leads.js` and `routes/analytics.js` with the equivalent Mongoose queries.
- **MySQL:** swap `better-sqlite3` for `mysql2`, keep the same table structure (already ANSI-SQL compatible), and change `?`/named param syntax as needed.

The route logic and frontend do not need to change — they only depend on the shape of the returned `lead`/`note` objects.

## ✅ Task Checklist (Future Interns — Task 2)

- [x] Backend system to handle leads (Express REST API)
- [x] Frontend dashboard to view and manage leads
- [x] Database to store lead information (SQLite)
- [x] Secure access — JWT admin login, all CRM routes protected
- [x] Lead listing (name, email, source, status)
- [x] Status updates (new → contacted → converted, + lost)
- [x] Notes & follow-ups per lead
- [x] Search & filter leads (bonus)
- [x] Timestamp tracking (bonus)
- [x] Simple analytics — totals, conversions, trend (bonus)
- [ ] Deploy and add a live demo link here
- [ ] Push to a public GitHub repository
- [ ] Share a demo/screenshots on LinkedIn tagging Future Interns

## 🌐 Deployment Notes

This is a standard Node/Express app — deploy on **Render**, **Railway**, or **Fly.io** (all have free tiers that support persistent disks needed for the SQLite file). Set the environment variables from `.env.example` in your host's dashboard. Avoid platforms with fully ephemeral/read-only filesystems unless you migrate to MongoDB Atlas or a managed MySQL instance first, since the SQLite file needs to persist between requests.

## 📄 License

Free to use and adapt as your own project.
