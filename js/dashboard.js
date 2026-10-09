/* VaultRecords – client portal pages. Depends on main.js (data layer). Page chosen via <body data-page>. */
const DEPTS = ['Finance', 'HR', 'Legal', 'Operations', 'IT', 'Marketing'];
const BOX_STATUS = ['In storage', 'Checked out', 'Pending destruction'];
const PILL = { 'In storage': 'ok', Completed: 'ok', Paid: 'ok', 'Checked out': 'in', 'Retrieval requested': 'in', Pending: 'in', 'In progress': 'wn', 'Pending destruction': 'wn', Due: 'wn', Overdue: 'er', Cancelled: 'er' };
const ICONS = {
  view: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.500 6.500 4 4"/>',
  download: '<path d="M12 4v11M7.500 11 12 15.500 16.500 11M5 20h14"/>',
  trash: '<path d="M4 7h16M10 3h4M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  truck: '<path d="M2 6h11v9H2zM13 9h4l4 3v3h-8"/><circle cx="6.500" cy="18" r="1.500"/><circle cx="17.500" cy="18" r="1.500"/>',
  play: '<path d="M8 5.500v13l10-6.500-10-6.500Z"/>',
  check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>'
};
const ib = (i, label, attr, cls = '') => `<button class="ibt ${cls}" ${attr} aria-label="${label}" title="${label}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[i]}</svg></button>`;
const pill = s => `<span class="pill ${PILL[s] || 'in'}">${s}</span>`;
const ic = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const nextNum = (list, start) => Math.max(start - 1, ...list.map(x => parseInt(x.id.replace(/\D/g, ''), 10) || 0)) + 1;
const boxOpts = (d, filter, sel) => d.boxes.filter(filter).map(b => `<option value="${b.id}" ${b.id === sel ? 'selected' : ''}>${b.id} – ${esc(b.desc)}</option>`).join('');
const qp = k => new URLSearchParams(location.search).get(k);

/* ---------- pagination ---------- */
const chev = p => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${p}"/></svg>`;
function pager(total, page, per, go) {
  let el = $('#pager');
  if (!el) { el = document.createElement('div'); el.id = 'pager'; el.className = 'pager'; $('.tw').after(el); }
  if (!total) { el.innerHTML = ''; return; }
  const pages = Math.max(1, Math.ceil(total / per));
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  let btns = '', last = 0;
  nums.forEach(n => { if (n - last > 1) btns += '<span class="pg-d">…</span>'; btns += `<button class="pg${n === page ? ' on' : ''}" data-p="${n}"${n === page ? ' aria-current="page"' : ''}>${n}</button>`; last = n; });
  el.innerHTML = `<span>Showing ${(page - 1) * per + 1}–${Math.min(total, page * per)} of ${total}</span>` + (pages > 1 ? `<nav class="pg-n" aria-label="Pagination"><button class="pg" data-p="${page - 1}" aria-label="Previous page"${page === 1 ? ' disabled' : ''}>${chev('m15 6-6 6 6 6')}</button>${btns}<button class="pg" data-p="${page + 1}" aria-label="Next page"${page === pages ? ' disabled' : ''}>${chev('m9 6 6 6-6 6')}</button></nav>` : '');
  $$('[data-p]', el).forEach(b => b.onclick = () => go(+b.dataset.p));
}
function pageRows(rows, pg, per, redraw) {
  const pages = Math.max(1, Math.ceil(rows.length / per));
  if (pg.n > pages) pg.n = pages;
  pager(rows.length, pg.n, per, p => { pg.n = p; redraw(); });
  return rows.slice((pg.n - 1) * per, pg.n * per);
}

/* ---------- toast confirmation (replaces the browser confirm popup) ---------- */
function confirmToast(msg, yes, label = 'Confirm') {
  $$('.toast.tc').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast tc'; t.setAttribute('role', 'alertdialog');
  t.innerHTML = `<span>${esc(msg)}</span><button type="button" class="tc-y">${label}</button><button type="button" class="tc-n">Keep</button>`;
  document.body.appendChild(t);
  const timer = setTimeout(() => t.remove(), 8000), close = () => { clearTimeout(timer); t.remove(); };
  $('.tc-y', t).onclick = () => { close(); yes(); };
  $('.tc-n', t).onclick = close;
  $('.tc-y', t).focus();
}

function openDlg(title, body, onSubmit, ok) {
  const d = $('#dlg');
  d.innerHTML = `<form id="df"><h3 style="margin-top:0">${title}</h3>${body}<div class="dact"><button type="button" class="btn ghost s" data-close>Close</button>${ok ? `<button class="btn s">${ok}</button>` : ''}</div></form>`;
  d.showModal();
  $('[data-close]', d).onclick = () => d.close();
  $('#df').onsubmit = e => { e.preventDefault(); if (onSubmit && onSubmit(new FormData(e.target)) !== false) d.close(); };
  return d;
}
const field = (id, label, inner) => `<label for="${id}">${label}</label>${inner}`;

/* ---------- dashboard ---------- */
function pDash() {
  const d = loadData(), s = calculateDashboardStats(d);
  $('#welcome').textContent = 'Welcome back, ' + d.company.name;
  const k = (i, l, v, sub) => `<div class="stat kpi"><div><span>${l}</span><b>${v}</b><small>${sub}</small></div></div>`;
  $('#kpis').innerHTML =
    k('box', 'Total boxes', s.totalBoxes, s.inStorage + ' in storage') +
    k('truck', 'Active retrievals', s.activeRetrievals, 'Not yet completed') +
    k('scan', 'Active scanning', s.activeScans, 'Not yet completed') +
    k('card', 'Outstanding balance', money(s.outstanding), s.unpaidCount + (s.unpaidCount === 1 ? ' unpaid invoice' : ' unpaid invoices'));
  const depts = Object.entries(s.byDept).sort((a, b) => b[1] - a[1]);
  $('#storage').innerHTML = depts.map(([n, c]) => `<div class="bar-row"><span>${n}</span><div class="bar"><i style="width:${c / s.totalBoxes * 100}%"></i></div><b>${c}</b></div>`).join('') +
    `<p class="mu sm" style="margin:16px 0 0">${s.reviewDue} ${s.reviewDue === 1 ? 'box reaches' : 'boxes reach'} its destruction date within 12 months.</p>`;
  $('#activity').innerHTML = d.activity.slice(0, 6).map(a => `<li>${esc(a.message)}<small>${ago(a.timestamp)}</small></li>`).join('') || '<li>No activity yet.</li>';
}

/* ---------- inventory ---------- */
function pInv() {
  let q = '', fs = 'All', fd = 'All';
  const pg = { n: 1 };
  const draw = () => {
    const d = loadData();
    const rows = d.boxes.filter(b => (fs === 'All' || b.status === fs) && (fd === 'All' || b.dept === fd) && (b.id + b.desc + b.dept + b.location).toLowerCase().includes(q.toLowerCase()));
    $('#rows').innerHTML = pageRows(rows, pg, 8, draw).map(b => `<tr><td><b>${b.id}</b></td><td>${esc(b.desc)}</td><td>${b.dept}</td><td>${pill(b.status)}</td><td class="acts">${ib('view', 'View', `data-v="${b.id}"`)}${ib('edit', 'Edit', `data-e="${b.id}"`)}${ib('trash', 'Delete', `data-x="${b.id}"`, 'dng')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No boxes match. Clear the search or change a filter.</td></tr>';
    $('#count').textContent = '';
    $$('[data-v]').forEach(x => x.onclick = () => view(x.dataset.v));
    $$('[data-r]').forEach(x => x.onclick = () => location.href = 'retrieval.html?new=1&box=' + x.dataset.r);
    $$('[data-e]').forEach(x => x.onclick = () => form(x.dataset.e));
    $$('[data-x]').forEach(x => x.onclick = () => del(x.dataset.x));
  };
  const view = id => {
    const b = loadData().boxes.find(x => x.id === id);
    openDlg('Box ' + b.id, `<dl class="dl"><dt>Contents</dt><dd>${esc(b.desc)}</dd><dt>Department</dt><dd>${b.dept}</dd><dt>Location</dt><dd>${b.location}</dd><dt>Status</dt><dd>${pill(b.status)}</dd><dt>Added</dt><dd>${fmtDate(b.created)}</dd><dt>Destroy on</dt><dd>${fmtDate(b.destroy)}</dd></dl>
      <p style="margin:18px 0 0;display:flex;gap:8px;flex-wrap:wrap"><a class="btn s" href="retrieval.html?new=1&box=${b.id}">Request retrieval</a><a class="btn ghost s" href="scanning.html?new=1&box=${b.id}">Request scanning</a></p>`);
  };
  const form = id => {
    const d = loadData(), b = id ? d.boxes.find(x => x.id === id) : null;
    openDlg(b ? 'Edit box ' + b.id : 'Add a box',
      field('fd', 'Contents', `<input id="fd" name="desc" required maxlength="80" value="${b ? esc(b.desc) : ''}" placeholder="e.g. Accounts payable 2024">`) +
      field('fp', 'Department', `<select id="fp" name="dept">${DEPTS.map(x => `<option ${b && b.dept === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`) +
      (b ? field('fs', 'Status', `<select id="fs" name="status">${[...new Set([...BOX_STATUS, b.status])].map(x => `<option ${b.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`)
         : field('fr', 'Keep for', `<select id="fr" name="ret"><option value="3">3 years</option><option value="5">5 years</option><option value="7" selected>7 years</option><option value="10">10 years</option><option>Permanent</option></select>`)),
      f => {
        const d2 = loadData();
        if (b) {
          const x = d2.boxes.find(y => y.id === id);
          x.desc = f.get('desc').trim(); x.dept = f.get('dept'); x.status = f.get('status');
          addActivity(d2, 'inventory', `Box ${id} updated`); toast('Box ' + id + ' updated.');
        } else {
          const nid = 'BX-' + nextNum(d2.boxes, 10001), y = f.get('ret'), c = today(), n = d2.boxes.length;
          d2.boxes.unshift({ id: nid, desc: f.get('desc').trim(), dept: f.get('dept'), location: 'ABCDE'[DEPTS.indexOf(f.get('dept')) % 5] + '-' + String(1 + n % 12).padStart(2, '0') + '-' + String(1 + n * 7 % 20).padStart(2, '0'), status: 'In storage', created: c, destroy: y === 'Permanent' ? y : (+c.slice(0, 4) + +y) + c.slice(4) });
          addActivity(d2, 'inventory', `Box ${nid} added to inventory`); toast('Box ' + nid + ' added.');
        }
        saveData(d2); draw();
      }, b ? 'Save changes' : 'Add box');
  };
  const del = id => confirmToast('Delete box ' + id + ' from your inventory?', () => doDel(id), 'Delete');
  const doDel = id => {
    const d = loadData(); d.boxes = d.boxes.filter(b => b.id !== id);
    addActivity(d, 'inventory', `Box ${id} removed from inventory`); saveData(d); toast('Box ' + id + ' deleted.'); draw();
  };
  $('#q').oninput = e => { q = e.target.value; pg.n = 1; draw(); };
  $('#fs').onchange = e => { fs = e.target.value; pg.n = 1; draw(); };
  $('#fd').onchange = e => { fd = e.target.value; pg.n = 1; draw(); };
  $('#add').onclick = () => form();
  draw();
  if (qp('add')) form();
}

/* ---------- retrievals and scanning (same shape) ---------- */
function requestPage(o) {
  const sel = $('#bx'), qbox = qp('box'), pg = { n: 1 };
  const fill = () => {
    const d = loadData(), h = boxOpts(d, o.boxFilter, qbox);
    sel.innerHTML = h || '<option value="">No boxes available</option>';
  };
  const draw = () => {
    const d = loadData();
    $('#rsum').innerHTML = ['Pending', 'In progress', 'Completed'].map(s => `<div class="stat"><span>${s}</span><b>${d[o.key].filter(r => r.status === s).length}</b></div>`).join('');
    fillChrome();
    $('#rows').innerHTML = pageRows(d[o.key], pg, 6, draw).map(r => `<tr><td><b>${r.id}</b></td><td>${r.box}</td>${o.cols(r)}<td>${pill(r.status)}</td><td class="acts">${r.status === 'Pending' || r.status === 'In progress' ? ib(r.status === 'Pending' ? 'play' : 'check', r.status === 'Pending' ? 'Start (demo)' : 'Complete (demo)', `data-adv="${r.id}" data-to="${r.status === 'Pending' ? 'In progress' : 'Completed'}"`) + ib('x', 'Cancel request', `data-can="${r.id}"`, 'dng') : ''}</td></tr>`).join('') || `<tr><td colspan="${o.n}" class="empty">No requests yet. Use the form to create one.</td></tr>`;
    $$('[data-adv]').forEach(x => x.onclick = () => change(x.dataset.adv, x.dataset.to));
    $$('[data-can]').forEach(x => x.onclick = () => confirmToast('Cancel request ' + x.dataset.can + '?', () => change(x.dataset.can, 'Cancelled'), 'Cancel request'));
  };
  const change = (id, st) => {
    const d = loadData(), r = d[o.key].find(x => x.id === id); r.status = st;
    o.onChange(d, r, st); saveData(d); fill(); draw(); toast(`${id} is now ${st.toLowerCase()}.`);
  };
  $('#rf').onsubmit = e => {
    e.preventDefault();
    const d = loadData(), box = sel.value; if (!box) return toast('Choose a box first.');
    const r = o.create(d, box, e.target); d[o.key].unshift(r);
    o.onCreate(d, r); saveData(d); e.target.reset(); pg.n = 1; fill(); draw(); toast(`${r.id} created for ${box}.`);
  };
  fill(); draw();
}
function pRet() {
  requestPage({
    key: 'retrievals', n: 6, boxFilter: b => b.status === 'In storage',
    cols: r => `<td>${esc(r.type)}</td><td>${fmtDate(r.needed)}</td>`,
    create: (d, box, f) => ({ id: 'RT-' + nextNum(d.retrievals, 20313), box, type: $('#rt').value, priority: $('#rp').value, needed: $('#rd').value, notes: $('#rn').value.trim(), status: 'Pending', created: today() }),
    onCreate: (d, r) => { d.boxes.find(b => b.id === r.box).status = 'Retrieval requested'; addActivity(d, 'retrieval', `Retrieval request created for ${r.box}`); },
    onChange: (d, r, st) => {
      const b = d.boxes.find(x => x.id === r.box);
      if (st === 'Completed') { if (b) b.status = 'Checked out'; addActivity(d, 'retrieval', `Retrieval completed for ${r.box}`); }
      if (st === 'Cancelled') { if (b && b.status === 'Retrieval requested') b.status = 'In storage'; addActivity(d, 'retrieval', `Retrieval request cancelled for ${r.box}`); }
      if (st === 'In progress') addActivity(d, 'retrieval', `Retrieval started for ${r.box}`);
    }
  });
}
function pScan() {
  requestPage({
    key: 'scans', n: 6, boxFilter: b => b.status !== 'Pending destruction',
    cols: r => `<td>${r.format}</td><td>${Number(r.pages).toLocaleString()}</td>`,
    create: (d, box) => ({ id: 'SC-' + nextNum(d.scans, 30089), box, format: $('#sfm').value, pages: +$('#spg').value || 0, turnaround: $('#stu').value, status: 'Pending', created: today() }),
    onCreate: (d, r) => addActivity(d, 'scanning', `Scanning request created for ${r.box}`),
    onChange: (d, r, st) => {
      if (st === 'Completed') {
        const b = d.boxes.find(x => x.id === r.box);
        d.documents.unshift({ id: 'DOC-' + nextNum(d.documents, 502), name: (b ? b.desc : r.box) + '.pdf', box: r.box, type: 'Scan', pages: r.pages, added: today() });
        addActivity(d, 'scanning', `Scanning completed for ${r.box}`); addActivity(d, 'document', `Document uploaded from ${r.box}`);
      }
      if (st === 'Cancelled') addActivity(d, 'scanning', `Scanning request cancelled for ${r.box}`);
      if (st === 'In progress') addActivity(d, 'scanning', `Scanning started for ${r.box}`);
    }
  });
}

/* ---------- billing ---------- */
function pBill() {
  const pg = { n: 1 };
  const draw = () => {
    const d = loadData(), s = calculateDashboardStats(d), paid = d.invoices.filter(i => i.status === 'Paid').reduce((a, i) => a + i.amount, 0);
    $('#bsum').innerHTML = `<div class="stat"><span>Outstanding balance</span><b>${money(s.outstanding)}</b></div><div class="stat"><span>Unpaid invoices</span><b>${s.unpaidCount}</b></div><div class="stat"><span>Paid to date</span><b>${money(paid)}</b></div>`;
    $('#rows').innerHTML = pageRows(d.invoices, pg, 6, draw).map(i => `<tr><td><b>${i.id}</b></td><td>${fmtDate(i.date)}</td><td>${esc(i.desc)}</td><td>${money(i.amount)}</td><td>${pill(i.status)}</td><td class="acts">${i.status !== 'Paid' ? `<button class="btn s" data-pay="${i.id}">Pay now</button>` : ''}${ib('download', 'Download invoice', `data-dl="${i.id}"`)}</td></tr>`).join('');
    $$('[data-pay]').forEach(x => x.onclick = () => pay(x.dataset.pay));
    $$('[data-dl]').forEach(x => x.onclick = () => toast('Download started (demo).'));
  };
  const pay = id => {
    const i = loadData().invoices.find(x => x.id === id);
    openDlg('Pay invoice ' + id, `<p class="mu">Amount due: <b style="color:var(--ink)">${money(i.amount)}</b></p>${field('cn', 'Card number', '<input id="cn" inputmode="numeric" value="4242 4242 4242 4242" required>')}<p class="mu sm" style="margin:12px 0 0">Demo payment: no card is charged.</p>`, () => {
      const d = loadData(), x = d.invoices.find(y => y.id === id); x.status = 'Paid'; x.paidOn = today();
      addActivity(d, 'billing', `Invoice ${id} paid`); saveData(d); toast('Payment received. Thank you.'); draw();
    }, 'Pay ' + money(i.amount));
  };
  draw();
}

/* ---------- documents ---------- */
function pDocs() {
  let q = '';
  const pg = { n: 1 };
  const draw = () => {
    const d = loadData(), rows = d.documents.filter(x => (x.name + x.box + x.type).toLowerCase().includes(q.toLowerCase()));
    $('#rows').innerHTML = pageRows(rows, pg, 6, draw).map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${x.type}</td><td>${x.box || '–'}</td><td>${fmtDate(x.added)}</td><td class="acts">${ib('download', 'Download', `data-dl="${x.id}"`)}${ib('trash', 'Delete', `data-x="${x.id}"`, 'dng')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No documents found.</td></tr>';
    $$('[data-dl]').forEach(x => x.onclick = () => toast('Download started (demo).'));
    $$('[data-x]').forEach(x => x.onclick = () => confirmToast('Delete this document?', () => {
      const d2 = loadData(), doc = d2.documents.find(y => y.id === x.dataset.x);
      d2.documents = d2.documents.filter(y => y.id !== doc.id); addActivity(d2, 'document', `Document deleted: ${doc.name}`); saveData(d2); draw(); toast('Document deleted.');
    }, 'Delete'));
  };
  $('#q').oninput = e => { q = e.target.value; pg.n = 1; draw(); };
  $('#up').onclick = () => {
    const d = loadData();
    openDlg('Upload a document', field('un', 'File name', '<input id="un" name="name" required placeholder="e.g. Lease agreement.pdf">') + field('ut', 'Type', '<select id="ut" name="type"><option>Contract</option><option>Certificate</option><option>Report</option><option>Other</option></select>') + field('ub', 'Related box (optional)', `<select id="ub" name="box"><option value="">None</option>${boxOpts(d, () => true)}</select>`) + '<p class="mu sm" style="margin:12px 0 0">Demo upload: only the record is saved, not a file.</p>', f => {
      const d2 = loadData(), name = f.get('name').trim();
      d2.documents.unshift({ id: 'DOC-' + nextNum(d2.documents, 502), name, box: f.get('box'), type: f.get('type'), pages: 1, added: today() });
      addActivity(d2, 'document', `Document uploaded: ${name}`); saveData(d2); draw(); toast('Document uploaded.');
    }, 'Upload');
  };
  draw();
}

/* ---------- settings ---------- */
function pSet() {
  const c = loadData().company;
  $('#sc').value = c.name; $('#sn').value = c.contact; $('#se').value = c.email; $('#sp').value = c.phone; $('#sa').value = c.address;
  $('#n1').checked = c.notify.email; $('#n2').checked = c.notify.sms; $('#n3').checked = c.notify.weekly; $('#tfa').checked = c.tfa;
  $('#sf').onsubmit = e => {
    e.preventDefault();
    const d = loadData();
    d.company = { ...d.company, name: $('#sc').value.trim(), contact: $('#sn').value.trim(), email: $('#se').value.trim(), phone: $('#sp').value.trim(), address: $('#sa').value.trim(), notify: { email: $('#n1').checked, sms: $('#n2').checked, weekly: $('#n3').checked } };
    addActivity(d, 'settings', 'Profile updated'); saveData(d); fillChrome(); toast('Settings saved.');
  };
  $('#tfa').onchange = e => {
    const d = loadData(); d.company.tfa = e.target.checked;
    addActivity(d, 'settings', 'Two-factor authentication ' + (e.target.checked ? 'enabled' : 'disabled')); saveData(d);
    toast('Two-factor authentication ' + (e.target.checked ? 'enabled (demo).' : 'disabled.'));
  };
}

function fillChrome() {
  const d = loadData(), s = getSession();
  $$('.co-name').forEach(x => x.textContent = d.company.name);
  $$('.user-email').forEach(x => x.textContent = s ? s.email : '');
  const st = calculateDashboardStats(d);
  $$('[data-badge]').forEach(x => x.textContent = (x.dataset.badge === 'retrievals' ? st.activeRetrievals : st.activeScans) || '');
}
document.addEventListener('DOMContentLoaded', () => {
  const p = document.body.dataset.page;
  if (!getSession()) return;
  fillChrome();
  ({ dashboard: pDash, inventory: pInv, retrieval: pRet, scanning: pScan, billing: pBill, documents: pDocs, settings: pSet }[p] || (() => {}))();
});

/* ---------- notifications: bell in the portal header, fed by the shared activity log ---------- */
(function () {
  const SEEN = 'vaultRecordsNotifSeen';
  const CSS = `
.nt-btn{position:relative;display:inline-grid;place-items:center}
.nt-b{position:absolute;top:-5px;inset-inline-end:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:var(--acc);color:var(--btnT);font:600 .68rem/18px Inter,sans-serif;text-align:center}
.nt-b[hidden]{display:none}
.nt-p{position:fixed;z-index:60;width:min(360px,calc(100vw - 32px));background:var(--surf);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shH);overflow:hidden;animation:rise .25s cubic-bezier(.16,1,.3,1) both}
.nt-p[hidden]{display:none}
.nt-h{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line);font-weight:600}
.nt-m{background:none;border:0;color:var(--acc);font:500 .82rem Inter,sans-serif;cursor:pointer;padding:0}.nt-m:disabled{opacity:.4;cursor:default}
.nt-l{list-style:none;margin:0;padding:4px 0;max-height:min(360px,60vh);overflow:auto}
.nt-l li{position:relative;display:grid;gap:2px;padding:12px 18px;padding-inline-start:34px;font-size:.9rem}
.nt-l li+li{border-top:1px solid var(--line)}
.nt-l li.nw::before{content:"";position:absolute;inset-inline-start:16px;top:19px;width:7px;height:7px;border-radius:50%;background:var(--acc)}
.nt-l li.nw span{font-weight:500}
.nt-l small{color:var(--mute);font-size:.78rem}.nt-l .nt-e{padding-inline-start:18px;color:var(--mute)}
.nt-f{display:block;text-align:center;padding:12px;border-top:1px solid var(--line);color:var(--acc);font-weight:500;font-size:.88rem;text-decoration:none}.nt-f:hover{background:var(--surf2)}
@media(max-width:640px){.hd .wrap > .sp{gap:6px}.hd .sp .ib{min-width:36px;height:36px;padding:0 8px}}`;
  let btn, badge, panel;
  const seen = () => { try { return localStorage.getItem(SEEN) || ''; } catch (e) { return ''; } };
  function render() {
    const d = loadData(), s = seen(), n = d.activity.filter(a => a.timestamp > s).length;
    badge.textContent = n > 9 ? '9+' : n; badge.hidden = !n;
    btn.setAttribute('aria-label', n ? `Notifications, ${n} unread` : 'Notifications');
    $('.nt-l', panel).innerHTML = d.activity.slice(0, 6).map(a => `<li class="${a.timestamp > s ? 'nw' : ''}"><span>${esc(a.message)}</span><small>${ago(a.timestamp)}</small></li>`).join('') || '<li class="nt-e">You are all caught up.</li>';
    $('.nt-m', panel).disabled = !n;
  }
  const place = () => { panel.style.top = Math.round($('.hd').getBoundingClientRect().bottom + 8) + 'px'; panel.style.insetInlineEnd = '16px'; };
  const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  function init() {
    const sp = $('.hd .sp');
    if (!sp || !getSession()) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ib nt-btn'; btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16v-5a6 6 0 0 1 12 0v5l1.500 2h-15L6 16ZM10 21h4"/></svg><span class="nt-b" hidden></span>';
    badge = $('.nt-b', btn);
    const th = $('#tTheme', sp);
    th ? sp.insertBefore(btn, th) : sp.prepend(btn);
    panel = document.createElement('div');
    panel.className = 'nt-p'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Notifications');
    panel.innerHTML = '<div class="nt-h"><span>Notifications</span><button type="button" class="nt-m">Mark all as read</button></div><ul class="nt-l"></ul><a class="nt-f" href="dashboard.html">View dashboard</a>';
    document.body.appendChild(panel);
    btn.onclick = () => { if (panel.hidden) { render(); place(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); } else close(); };
    $('.nt-m', panel).onclick = () => { try { localStorage.setItem(SEEN, new Date().toISOString()); } catch (e) {} render(); };
    document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close(); });
    document.addEventListener('keydown', e => e.key === 'Escape' && close());
    addEventListener('resize', () => { if (!panel.hidden) place(); });
    addEventListener('storage', render);
    // refresh the badge whenever the shared data is saved (requests, payments, uploads...)
    const _save = saveData;
    saveData = function (d) { _save(d); try { render(); } catch (e) {} };
    render();
  }
  document.addEventListener('DOMContentLoaded', init);
})();