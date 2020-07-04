console.log("Service worker ready");

// Resources I want to cache
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    'index.js',
    '/manifest.webmanifest',
    '/styles.css',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/service-worker.js'
]

// store all assets in static cache
const CACHE_NAME = 'static-cache-v2';
// this one is for data that comes back from server (need this to populate so that user can view previous transactions offline )
const DATA_CACHE_NAME = 'data-cache-v1';

// install service worker for the first time and immediately cache all files
self.addEventListener("install", function (evt) {
    // open cache and store all files
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Your files were pre-cached successfully!");
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// base activate
self.addEventListener("activate", function (evt) {
    evt.waitUntil(
        // keys method returns a promise that resolves to an array of Cache keys.
        caches.keys().then(keyList => {
            return Promise.all(
                keyList.map(key => {
                    if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                        console.log("Removing old cache data", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

// fetch data from api or cache dependent on connection
self.addEventListener("fetch", function (evt) {
    // first checks if making an api call
    if (evt.request.url.includes("/api/")) {
        evt.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(evt.request)
                    .then(response => {
                        // If the response was good, clone it and store it in the cache.
                        if (response.status === 200) {
                            cache.put(evt.request.url, response.clone());
                        }
                        return response;
                    })
                    .catch(err => {
                        console.log('NO NETWORK CONNECTION')
                        // Network request failed, try to get it from the cache.
                        return cache.match(evt.request);
                    });
            }).catch(err => console.log(err))
        );
        return;
    }
    // if not an api call default respond with cache data
    evt.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(evt.request).then(response => {
                return response || fetch(evt.request);
            });
        })
    );
});

// option for fetch request to use cache until return server, want to come back to this..
// let networkDataReceived = false;
// const networkUpdate = fetch('/api')
//     .then(res => {
//         return res.json()
//     }).then(data => {
//         networkDataReceived = true;
//         updatePage(data)
//     })

// // need to edit route here most likely
// caches.match('/api')
//     .then(res => {
//         return res.json()
//     }).then(data => {
//         if (!networkDataReceived) {
//             updatePage(data)
//         }
//     }).catch(function(){
//         return networkUpdate;
//     })