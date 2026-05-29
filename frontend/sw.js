const CACHE_NAME = "greenherb-cache-v1";
const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log("[SW] A fazer cache dos ficheiros da app");
                return cache.addAll(FILES_TO_CACHE);
            })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener("activate", event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log("[SW] A apagar cache antiga:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});