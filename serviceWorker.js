"use strict"

const cacheName = "generatorIdle"

const cacheToNetwork = [
	'https://fonts.googleapis.com/css?family=Open+Sans:300,400',
	'favicon.ico'
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
				
				'game.css',
]

let cacheFirst = new Set(cacheToNetwork)

self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(cacheName).then(cache => {
			return cache.addAll([...cacheToNetwork, ...networkToCache])
		})
	)
})


self.addEventListener('fetch', event => {
	if (cacheFirst.has(event.request.url)) {
		event.respondWith(
			fetch(event.request).catch(() =>{
				return caches.match(event.request)
			})
		)
	} else {
		event.respondWith(
			caches.match(event.request).then(response => {
				return response || fetch(event.request)
			})
		)
	}
})