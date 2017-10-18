"use strict"

const cacheName = "generatorIdle_v3"

const cacheToNetwork = [
	'https://fonts.googleapis.com/css?family=Open+Sans:300,400',
	'favicon.ico',
	'icon.png'
]

const networkToCache = [
				'index.html',
				
				'serviceWorker.js',
				'game.js',
				'utility.js',
				'gameGui.js',
				'gameEngine.js',
				'gameWorker.js',
				'resourceData.js',
				
				'manifest.json',
				'game.css',
]

let cacheFirst = new Set(cacheToNetwork)

self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(cacheName).then(cache => cache.addAll([...cacheToNetwork, ...networkToCache]))
	)
})

self.addEventListener('fetch', event => {
	if (cacheFirst.has(event.request.url)) {
		event.respondWith(
			caches.open(cacheName)
				.then(cache => cache.match(event.request))
				.then(response => (response || fetch(event.request)))
		)
	} else {
		event.respondWith(
			caches.open(cacheName)
				.then(cache => fetch(event.request)
					.then(response => cache.put(event.request, response.clone())
						.then(() => response))
					.catch(() => cache.match(event.request))
			)
		)
	}
})