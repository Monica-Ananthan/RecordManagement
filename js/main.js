/* VaultRecords – shared data layer, auth guard and public-page behaviour. No backend: everything lives in localStorage. */
const KEY = 'vaultRecordsData', SKEY = 'vaultRecordsSession', RKEY = 'vaultRecordsRemember';
const DEMO_EMAIL = 'client@vaultrecords.com', DEMO_PW = 'Demo123';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => (!d || d === 'Permanent') ? (d || '–') : new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
function ago(ts) {
  const m = Math.max(0, Math.round((Date.now() - new Date(ts)) / 6e4));
  return m < 1 ? 'Just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : fmtDate(ts.slice(0, 10));
}
function toast(t) {
  const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t;
  document.body.appendChild(d); setTimeout(() => d.remove(), 2800);
}

/* ---------- central data ---------- */
const iso = d => new Date(Date.now() - d * 864e5).toISOString();
const dt = d => iso(d).slice(0, 10);

function seed() {
  const b = (n, desc, dept, location, status, age, destroy) => ({ id: 'BX-' + n, desc, dept, location, status, created: dt(age), destroy });
  return {
    company: { name: 'Acme Corporation', contact: 'Dana Whitfield', email: 'client@vaultrecords.com', phone: '(555) 014-2290', address: '410 Market Street, Suite 12', notify: { email: true, sms: false, weekly: true }, tfa: false },
    boxes: [
      b(10482, 'Accounts payable 2023', 'Finance', 'A-04-12', 'In storage', 26, '2033-12-31'),
      b(10481, 'Employee records, terminated 2019–2021', 'HR', 'B-11-02', 'Retrieval requested', 39, '2030-06-30'),
      b(10480, 'Client contracts 2020–2021', 'Legal', 'C-02-07', 'In storage', 55, '2031-01-01'),
      b(10479, 'Patient intake forms 2022', 'Operations', 'D-08-20', 'Checked out', 78, '2032-03-15'),
      b(10478, 'Tax returns 2016–2018', 'Finance', 'A-05-03', 'Pending destruction', 128, '2026-12-31'),
      b(10477, 'Board minutes 2010–2015', 'Legal', 'C-01-01', 'In storage', 142, 'Permanent'),
      b(10476, 'Vendor invoices 2020', 'Finance', 'A-06-09', 'In storage', 190, '2027-12-31'),
      b(10475, 'Marketing assets archive', 'Marketing', 'E-03-04', 'In storage', 210, '2028-06-30'),
      b(10474, 'Facilities maintenance logs', 'Operations', 'D-02-15', 'In storage', 231, '2029-09-30'),
      b(10473, 'IT procurement records', 'IT', 'B-07-11', 'In storage', 255, '2030-02-28')
    ],
    retrievals: [
      { id: 'RT-20312', box: 'BX-10481', type: 'Deliver – rush same day', priority: 'Rush', needed: dt(-1), notes: '', status: 'In progress', created: dt(1) },
      { id: 'RT-20311', box: 'BX-10479', type: 'Deliver – next business day', priority: 'Standard', needed: dt(12), notes: '', status: 'Completed', created: dt(14) }
    ],
    scans: [
      { id: 'SC-30088', box: 'BX-10480', format: 'Searchable PDF', pages: 2400, turnaround: 'Standard (5–7 days)', status: 'In progress', created: dt(4) },
      { id: 'SC-30087', box: 'BX-10476', format: 'Searchable PDF', pages: 1180, turnaround: 'Standard (5–7 days)', status: 'Completed', created: dt(30) }
    ],
    invoices: [
      { id: 'INV-4105', date: dt(8), desc: 'September storage, retrieval and scanning', amount: 486.5, status: 'Due' },
      { id: 'INV-4091', date: dt(45), desc: 'Rush retrieval and certified destruction', amount: 128.4, status: 'Overdue' },
      { id: 'INV-4098', date: dt(38), desc: 'August storage and retrieval', amount: 472, status: 'Paid' },
      { id: 'INV-4086', date: dt(68), desc: 'July storage and retrieval', amount: 472, status: 'Paid' }
    ],
    documents: [
      { id: 'DOC-501', name: 'Vendor invoices 2020.pdf', box: 'BX-10476', type: 'Scan', pages: 1180, added: dt(28) },
      { id: 'DOC-500', name: 'Board minutes 2010–2015.pdf', box: 'BX-10477', type: 'Scan', pages: 312, added: dt(90) },
      { id: 'DOC-499', name: 'Storage agreement 2026.pdf', box: '', type: 'Contract', pages: 14, added: dt(200) },
      { id: 'DOC-498', name: 'Certificate of destruction – March.pdf', box: '', type: 'Certificate', pages: 2, added: dt(160) }
    ],
    activity: [
      { id: 'a5', type: 'retrieval', message: 'Retrieval request created for BX-10481', timestamp: iso(1) },
      { id: 'a4', type: 'scanning', message: 'Scanning request created for BX-10480', timestamp: iso(4) },
      { id: 'a3', type: 'billing', message: 'Invoice INV-4105 issued', timestamp: iso(8) },
      { id: 'a2', type: 'inventory', message: 'Box BX-10482 added to inventory', timestamp: iso(26) },
      { id: 'a1', type: 'billing', message: 'Invoice INV-4098 paid', timestamp: iso(36) }
    ]
  };
}
let _mem = null;
function initializeData() { try { if (localStorage.getItem(KEY) === null) localStorage.setItem(KEY, JSON.stringify(seed())); } catch (e) {} }
function loadData() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return d; } catch (e) {} return _mem || (_mem = seed()); }
function saveData(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { _mem = d; } }
/* Mutates the data object; the caller saves once. */
function addActivity(d, type, message) {
  d.activity.unshift({ id: 'a' + Date.now() + Math.random().toString(36).slice(2, 5), type, message, timestamp: new Date().toISOString() });
  d.activity = d.activity.slice(0, 50);
}
function calculateDashboardStats(d) {
  const open = s => s !== 'Completed' && s !== 'Cancelled';
  const byDept = {};
  d.boxes.forEach(b => byDept[b.dept] = (byDept[b.dept] || 0) + 1);
  const limit = new Date(); limit.setFullYear(limit.getFullYear() + 1);
  return {
    totalBoxes: d.boxes.length,
    inStorage: d.boxes.filter(b => b.status === 'In storage').length,
    activeRetrievals: d.retrievals.filter(r => open(r.status)).length,
    activeScans: d.scans.filter(r => open(r.status)).length,
    outstanding: d.invoices.filter(i => i.status !== 'Paid').reduce((a, i) => a + i.amount, 0),
    unpaidCount: d.invoices.filter(i => i.status !== 'Paid').length,
    byDept,
    reviewDue: d.boxes.filter(b => b.destroy !== 'Permanent' && new Date(b.destroy) <= limit).length
  };
}

/* ---------- auth ---------- */
const getSession = () => { try { return JSON.parse(localStorage.getItem(SKEY)); } catch (e) { return null; } };
function logout() { try { localStorage.removeItem(SKEY); } catch (e) {} location.href = 'login.html'; }

document.addEventListener('DOMContentLoaded', () => {
  initializeData();
  const s = getSession(), body = document.body;
  if (body.dataset.protected !== undefined && !s) { location.replace('login.html'); return; }
  if (body.dataset.page === 'login' && s) { location.replace('dashboard.html'); return; }
  body.style.visibility = 'visible';
  const nl = $('#navLogin'); if (nl && s) { nl.textContent = 'Dashboard'; nl.href = 'dashboard.html'; }
  $$('[data-logout]').forEach(x => x.onclick = logout);
  $$('[data-demo]').forEach(x => x.onclick = () => toast('Demo only: ' + x.dataset.demo + ' sign-in is not connected.'));

  const lf = $('#lf');
  if (lf) {
    let rem = ''; try { rem = localStorage.getItem(RKEY) || ''; } catch (e) {}
    if (rem) { $('#u').value = rem; $('#rm').checked = true; }
    const msg = (t, ok) => { const m = $('#lmsg'); m.textContent = t; m.className = 'msg ' + (ok ? 'ok' : 'er'); };
    $('#fill').onclick = () => { $('#u').value = DEMO_EMAIL; $('#p').value = DEMO_PW; $('#tc').checked = true; msg('Demo credentials filled in. Press Sign in.', true); };
    lf.onsubmit = e => {
      e.preventDefault();
      if ($('#u').value.trim().toLowerCase() !== DEMO_EMAIL || $('#p').value !== DEMO_PW) return msg('That email or password is not correct. Use the demo credentials below the form.');
      if (!$('#tc').checked) return msg('Accept the Terms & Conditions to continue.');
      try {
        localStorage.setItem(SKEY, JSON.stringify({ email: DEMO_EMAIL, at: Date.now() }));
        if ($('#rm').checked) localStorage.setItem(RKEY, DEMO_EMAIL); else localStorage.removeItem(RKEY);
      } catch (err) {}
      msg('Signed in. Redirecting to your dashboard…', true);
      setTimeout(() => location.href = 'dashboard.html', 350);
    };
  }
  const cf = $('#cf');
  if (cf) cf.onsubmit = e => { e.preventDefault(); cf.reset(); toast('Message sent. We reply within one business day.'); };

  const prog = () => { const h = document.documentElement, m = h.scrollHeight - h.clientHeight; $('#prog').style.width = (m > 0 ? h.scrollTop / m * 100 : 0) + '%'; };
  addEventListener('scroll', prog, { passive: true }); addEventListener('resize', prog); prog();
});

/* ---------- scroll reveal: content fades and slides in every time it enters the viewport ---------- */
function initReveal() {
  try {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    const SEL = '.bn-in,.sh,.fr>*,.cards>.card,.price>.card,.tlh>li,.fx,.cta,.two>*,.grid2>*,.legal-g>*,.stats,.panel,.tw,.top,.tb,.ft-g>div';
    let els = [...new Set($$(SEL))];
    els = els.filter(e => !els.some(a => a !== e && a.contains(e)));
    if (!els.length) return;
    els.forEach(e => e.classList.add('rv'));
    document.documentElement.classList.add('js-rv');
    // Reveal a little inside the viewport edge; reset only once the element is fully out of view,
    // so nothing ever disappears while still visible (no flicker).
    // elements that appear together are staggered; a lone element appears with no delay
    const enter = new IntersectionObserver(es => es.filter(x => x.isIntersecting).forEach((x, i) => {
      x.target.style.setProperty('--d', Math.min(i, 4) * 80 + 'ms'); x.target.classList.add('in');
    }), { rootMargin: '0px 0px -8% 0px' });
    const leave = new IntersectionObserver(es => es.forEach(x => !x.isIntersecting && x.target.classList.remove('in')));
    els.forEach(e => { enter.observe(e); leave.observe(e); });
  } catch (err) {}
}
document.addEventListener('DOMContentLoaded', initReveal);

/* ---------- login: show / hide password ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const t = $('#pwt'); if (!t) return;
  t.onclick = () => {
    const p = $('#p'), show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    t.setAttribute('aria-pressed', show); t.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    $('use', t).setAttribute('href', show ? '#i-eyeoff' : '#i-eye');
  };
});

/* ---------- responsive menu: hamburger on small screens (public nav and portal sidebar) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const bar = $('.hd .wrap'), nav = $('.nv'), side = $('.side'), target = nav || side;
  if (!bar || !target) return;
  document.documentElement.classList.add('js-menu');
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'menu-btn';
  const ICON = { menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>' };
  const hd = $('.hd'), setHH = () => document.documentElement.style.setProperty('--hh', Math.round(hd.getBoundingClientRect().bottom) + 'px');
  const set = open => {
    if (open) setHH();
    target.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open); btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    btn.innerHTML = `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${open ? ICON.close : ICON.menu}</svg>`;
  };
  set(false);
  btn.onclick = () => set(!target.classList.contains('open'));
  side ? bar.prepend(btn) : bar.append(btn);
  target.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', e => e.key === 'Escape' && set(false));
  addEventListener('resize', () => innerWidth > 900 && set(false));
  addEventListener('scroll', () => target.classList.contains('open') && setHH(), { passive: true });
  // on phones the login / sign-out controls move into the menu
  const nl = $('#navLogin');
  if (nav && nl) { const a = document.createElement('a'); a.className = 'nv-x'; a.href = nl.getAttribute('href'); a.textContent = nl.textContent; nav.append(a); }
  if (side) { const o = document.createElement('a'); o.className = 'nv-x'; o.href = '#'; o.textContent = 'Sign out'; o.onclick = e => { e.preventDefault(); logout(); }; side.append(o); }
});

/* ---------- FAQ: smooth open / close ---------- */
document.addEventListener('DOMContentLoaded', () => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches || !Element.prototype.animate) return;
  $$('.faq details').forEach(d => {
    const s = $('summary', d);
    s.addEventListener('click', e => {
      e.preventDefault();
      if (d._a && d._a.playState === 'running') return;
      const from = d.offsetHeight, closing = d.open, edge = d.offsetHeight - d.clientHeight;
      let to;
      if (closing) to = s.offsetHeight + edge; else { d.open = true; to = d.offsetHeight; }
      d.style.overflow = 'hidden';
      d._a = d.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 400, easing: 'cubic-bezier(.16,1,.3,1)' });
      d._a.onfinish = d._a.oncancel = () => { if (closing) d.open = false; d.style.overflow = ''; };
    });
  });
});
