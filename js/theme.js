/* Runs in <head>, before first paint, so the page never flashes the wrong theme.
   Kept tiny and dependency-free. js/core.js applies the same rule later and keeps it in sync. */
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('sillykuest.v2') || '{}'), t = (s.set && s.set.theme) || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#1A1741' : '#E8E6FF');
  } catch (e) {}
})();
