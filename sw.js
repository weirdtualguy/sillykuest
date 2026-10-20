/* SillyKuest service worker: cache everything on first load, then work fully offline.
   Bump VERSION when you change any file so returning users get the update (the app then offers a Reload).
   tests/repo.js checks that this list matches the files index.html loads. */
var VERSION = 'sillykuest-3.1.0';
var FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/fonts.css', 'css/base.css', 'css/shell.css', 'css/lesson.css', 'css/widgets.css', 'css/refine.css',
  'js/theme.js', 'js/core.js', 'js/app.js',
  'js/data/glossary.js', 'js/data/examples.js', 'js/data/reference.js', 'js/data/worlds.js',
  'js/lessons/w1.js', 'js/lessons/w2.js', 'js/lessons/w3.js', 'js/lessons/w4.js', 'js/lessons/w5.js', 'js/lessons/w6.js',
  'js/ui/quiz.js', 'js/ui/steps.js', 'js/ui/widgets.js', 'js/ui/player.js', 'js/ui/screens.js', 'js/ui/vibe.js', 'js/ui/heist.js',
  'assets/icon.svg', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      /* offline and not cached: only a page load gets the app shell; anything else fails honestly */
      return req.mode === 'navigate' ? caches.match('index.html') : Response.error();
    });
  }));
});
