/* VaultRecords – theme (light/dark) and text direction (LTR/RTL). Loaded in <head> to avoid a flash. */
(function () {
  var root = document.documentElement;
  function get(k, v) { try { return localStorage.getItem(k) || v; } catch (e) { return v; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  root.dataset.theme = get('vr_theme', matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  root.dir = get('vr_dir', 'ltr');
  /* Stop the header from visibly jumping while the page loads.
     - the fallback "Dark" text on the toggle is hidden from the first paint (only the icon shows)
     - the menu mode is switched on immediately, so the nav is not shown and then collapsed
     - header controls stay invisible (their space is reserved) until every script has finished
       adding the menu button, bell and icons, so they appear once, already in place. */
  root.classList.add('js-menu', 'hd-wait');
  var hide = document.createElement('style');
  hide.textContent = '#tTheme{font-size:0}.hd-wait .hd .wrap{visibility:hidden}';
  document.head.appendChild(hide);
  function ready() {
    if (!document.querySelector('.menu-btn')) root.classList.remove('js-menu'); /* no menu on this page */
    requestAnimationFrame(function () { root.classList.remove('hd-wait'); });
  }
  document.addEventListener('DOMContentLoaded', function () { setTimeout(ready, 0); });
  setTimeout(function () { root.classList.remove('hd-wait'); }, 1500); /* safety net */
  document.addEventListener('DOMContentLoaded', function () {
    var bt = document.getElementById('tTheme'), bd = document.getElementById('tDir');
    if (!bt || !bd) return;
    var svg = function (p) { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:auto">' + p + '</svg>'; };
    var SUN = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>');
    var MOON = svg('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>');
    function label() {
      var dark = root.dataset.theme === 'dark';
      bt.innerHTML = dark ? SUN : MOON; /* shows the mode you will switch to */
      bt.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      bt.title = dark ? 'Light mode' : 'Dark mode';
      bd.textContent = root.dir === 'rtl' ? 'LTR' : 'RTL';
    }
    bt.onclick = function () { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; set('vr_theme', root.dataset.theme); label(); };
    bd.onclick = function () { root.dir = root.dir === 'rtl' ? 'ltr' : 'rtl'; set('vr_dir', root.dir); label(); };
    label();
  });
})();