/**
 * sw.js: service worker. Makes the app work offline.
 *
 * On install it downloads every file listed in FILES into a cache. After that, requests
 * are answered from the cache first and the network only as a fallback ("cache-first").
 *
 * IMPORTANT for contributors: when you add, rename or delete a file under web/, update
 * FILES below, and bump VERSION whenever any cached file changes. Otherwise users keep
 * seeing the old version. Old caches are deleted automatically on activate.
 */
const VERSION = "v5";
const CACHE = "sheet2quiz-" + VERSION;
const FILES = [
  "./", "./index.html", "./manifest.webmanifest", "./css/style.css",
  "./js/theme.js", "./js/app.js", "./js/engine.js", "./js/parse.js", "./js/db.js",
  "./js/ui.js", "./js/icons.js", "./js/router.js",
  "./js/views/home.js", "./js/views/setup.js", "./js/views/quiz.js", "./js/views/results.js", "./js/views/history.js",
  "./vendor/papaparse.min.js", "./vendor/read-excel-file.min.js",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
