var CACHE_NAME = "pvc-tracker-v5";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
          return response;
        })
        .catch(function () {
          return caches.match("./index.html");
        });
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function (clientsArr) {
      for (var i = 0; i < clientsArr.length; i++) {
        if ("focus" in clientsArr[i]) return clientsArr[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});

// Best-effort: se il browser supporta la Periodic Background Sync, la app tenta
// di registrarla (vedi app.js). La maggior parte dei browser Android la onora
// solo se la PWA è installata e usata di frequente; nessuna garanzia di sveglia esatta.
self.addEventListener("periodicsync", function (event) {
  if (event.tag === "pvc-reminder-check") {
    event.waitUntil(
      self.registration.showNotification("Diario PVC", {
        body: "Controlla se hai registrato la giornata di oggi.",
        icon: "icons/icon-192.png"
      })
    );
  }
});
