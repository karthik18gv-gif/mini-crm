// =========================================================
// Mini CRM — Admin Dashboard logic
// =========================================================

const token = localStorage.getItem('crm_token');
if (!token) {
  window.location.href = '/admin/login.html';
}

const adminData = JSON.parse(localStorage.getItem('crm_admin') || '{}');
document.getElementById('adminName').textContent = adminData.username ? `Signed in as ${adminData.username}` : '';

/* ---------- Authenticated fetch wrapper ---------- */
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_admin');
    window.location.href = '/admin/login.html';
    throw new Error('Session expired');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

/* ---------- Logout ---------- */
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_admin');
  window.location.href = '/admin/login.html';
});

/* ---------- View switching (Overview / Leads) ---------- */
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const views = { overview: document.getElementById('view-overview'), leads: document.getElementById('view-leads') };
const viewTitle = document.getElementById('viewTitle');

sidebarLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.dataset.view;
    sidebarLinks.forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
    Object.entries(views).forEach(([key, el]) => { el.style.display = key === target ? 'block' : 'none'; });
    viewTitle.textContent = target === 'overview' ? 'Overview' : 'Leads';
    if (target === 'leads') loadLeads();
    if (target === 'overview') loadAnalytics();
  });
});

/* =========================================================
   OVERVIEW / ANALYTICS
   ========================================================= */
async function loadAnalytics() {
  try {
    const data = await api('/api/analytics');

    document.getElementById('statTotal').textContent = data.total;
    document.getElementById('statNew').textContent = data.statusCounts.new;
    document.getElementById('statContacted').textContent = data.statusCounts.contacted;
    document.getElementById('statConverted').textContent = data.statusCounts.converted;
    document.getElementById('statConversion').textContent = `${data.conversionRate}%`;

    renderTrendChart(data.last7Days);
    renderSourceBreakdown(data.bySource, data.total);
  } catch (err) {
    console.error(err);
  }
}

function renderTrendChart(last7Days) {
  const container = document.getElementById('trendChart');
  container.innerHTML = '';

  // Build a full 7-day range (including zero-count days) for a consistent chart
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = last7Days.find((row) => row.day === key);
    days.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), count: found ? found.count : 0 });
  }

  const max = Math.max(...days.map((d) => d.count), 1);
  days.forEach((d) => {
    const bar = document.createElement('div');
    bar.className = 'trend-bar';
    bar.style.height = `${Math.max((d.count / max) * 100, 4)}%`;
    bar.innerHTML = `<span>${d.count}</span><small>${d.label}</small>`;
    container.appendChild(bar);
  });
  container.style.marginBottom = '20px';
}

function renderSourceBreakdown(bySource, total) {
  const container = document.getElementById('sourceBreakdown');
  container.innerHTML = '';

  if (!bySource.length) {
    container.innerHTML = '<p class="notes-empty">No leads yet.</p>';
    return;
  }

  bySource.forEach((row) => {
    const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
    const el = document.createElement('div');
    el.className = 'source-row';
    el.innerHTML = `
      <span class="source-label">${row.source}</span>
      <div class="source-bar-track"><div class="source-bar-fill" style="width:${pct}%"></div></div>
      <span class="source-count">${row.count}</span>
    `;
    container.appendChild(el);
  });
}

/* =========================================================
   LEADS TABLE — search, filter, sort, pagination
   ========================================================= */
let currentPage = 1;
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const sourceFilter = document.getElementById('sourceFilter');
const sortOrder = document.getElementById('sortOrder');

let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => { currentPage = 1; loadLeads(); }, 300);
});
[statusFilter, sourceFilter, sortOrder].forEach((el) => {
  el.addEventListener('change', () => { currentPage = 1; loadLeads(); });
});

async function loadLeads() {
  const tbody = document.getElementById('leadsTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Loading leads...</td></tr>';

  const params = new URLSearchParams({
    search: searchInput.value.trim(),
    status: statusFilter.value,
    source: sourceFilter.value,
    sort: sortOrder.value,
    page: currentPage,
    limit: 10,
  });

  try {
    const data = await api(`/api/leads?${params.toString()}`);
    renderLeadsTable(data.leads);
    renderPagination(data.pagination);
    populateSourceFilterOnce(data.leads);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">${err.message}</td></tr>`;
  }
}

let sourceFilterPopulated = false;
function populateSourceFilterOnce(leads) {
  if (sourceFilterPopulated) return;
  const sources = [...new Set(leads.map((l) => l.source))];
  sources.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    sourceFilter.appendChild(opt);
  });
  if (sources.length) sourceFilterPopulated = true;
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leadsTableBody');
  tbody.innerHTML = '';

  if (!leads.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No leads match your filters.</td></tr>';
    return;
  }

  leads.forEach((lead) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Name">${escapeHtml(lead.name)}</td>
      <td data-label="Email">${escapeHtml(lead.email)}</td>
      <td data-label="Source">${escapeHtml(lead.source)}</td>
      <td data-label="Status"><span class="status-badge status-${lead.status}">${lead.status}</span></td>
      <td data-label="Received">${formatDate(lead.created_at)}</td>
      <td data-label=""></td>
    `;
    tr.addEventListener('click', () => openLeadModal(lead.id));
    tbody.appendChild(tr);
  });
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  container.innerHTML = '';
  if (pagination.totalPages <= 1) return;

  for (let i = 1; i <= pagination.totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === pagination.page) btn.classList.add('active');
    btn.addEventListener('click', () => { currentPage = i; loadLeads(); });
    container.appendChild(btn);
  }
}

/* =========================================================
   LEAD DETAIL MODAL — view, status update, notes, delete
   ========================================================= */
const modal = document.getElementById('leadModal');
let activeLeadId = null;

const STATUS_OPTIONS = ['new', 'contacted', 'converted', 'lost'];

async function openLeadModal(id) {
  activeLeadId = id;
  try {
    const { lead, notes } = await api(`/api/leads/${id}`);

    document.getElementById('modalName').textContent = lead.name;
    document.getElementById('modalEmail').textContent = lead.email;
    document.getElementById('modalPhone').textContent = lead.phone || '—';
    document.getElementById('modalSource').textContent = lead.source;
    document.getElementById('modalCreated').textContent = formatDate(lead.created_at, true);
    document.getElementById('modalMessage').textContent = lead.message || 'No message provided.';

    const statusSelect = document.getElementById('modalStatus');
    statusSelect.innerHTML = STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === lead.status ? 'selected' : ''}>${s}</option>`).join('');

    renderNotes(notes);
    modal.style.display = 'flex';
  } catch (err) {
    alert(err.message);
  }
}

function renderNotes(notes) {
  const list = document.getElementById('notesList');
  if (!notes.length) {
    list.innerHTML = '<p class="notes-empty">No follow-up notes yet.</p>';
    return;
  }
  list.innerHTML = notes.map((n) => `
    <div class="note-item">
      <time>${formatDate(n.created_at, true)}</time>
      ${escapeHtml(n.note)}
    </div>
  `).join('');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
function closeModal() { modal.style.display = 'none'; activeLeadId = null; }

document.getElementById('modalStatus').addEventListener('change', async (e) => {
  try {
    await api(`/api/leads/${activeLeadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: e.target.value }),
    });
    openLeadModal(activeLeadId); // refresh notes (status-change is auto-logged)
    loadLeads();
    loadAnalytics();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('noteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('noteInput');
  const note = input.value.trim();
  if (!note) return;

  try {
    await api(`/api/leads/${activeLeadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    input.value = '';
    openLeadModal(activeLeadId);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('deleteLeadBtn').addEventListener('click', async () => {
  if (!confirm('Delete this lead permanently? This cannot be undone.')) return;
  try {
    await api(`/api/leads/${activeLeadId}`, { method: 'DELETE' });
    closeModal();
    loadLeads();
    loadAnalytics();
  } catch (err) {
    alert(err.message);
  }
});

/* ---------- Helpers ---------- */
function formatDate(str, withTime = false) {
  const d = new Date(str.replace(' ', 'T') + 'Z');
  return withTime
    ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Init ---------- */
loadAnalytics();
