"use strict"

let dev = {
	meanFps : () => {
		let time = performance.now() - dev.start
		console.log(1000 * dev.dataFrames / time, "data fps")
		console.log(1000 * dev.frames / time, "video fps")
	},
	testCase : () => {
		game.data.particleAcceleration.set(2)
		game.data.allUnstability.set(10)
	}
}

let game, worker, settings = {}

window.onload = (event) => {
	
	settings = {}
	for (let setting of gameData.settings) {
		settings[setting.name] = setting.default
	}
	
	if (localStorage.settings)
		Object.assign(settings,JSON.parse(localStorage.settings))

	game = new Game({
		data : {
			version : 3,
			targetFPS : settings.targetGameFPS,
			lastTick : performance.now(),
			autoSaveSlot : "autoSave"
		}
	})

	function animationFrame() {
		if (dev) {
			let startTime = performance.now()
			let updates = game.gui.updatesPlanned.size
			if (game.gui.update()) {
				dev.frames++
				let workTime = performance.now() - startTime
				dev.guiWorkTime += workTime
				dev.guiMeanTime = dev.guiWorkTime / dev.frames
				if (workTime > game.frameTime)
					console.log("Processing gui (", updates, ") took ", workTime.toFixed(2), "ms, mean time ", dev.guiMeanTime.toFixed(2), "ms")
			}
			let time = performance.now() - dev.lastFPS
			if (time >= 1000) {
				dev.lastFPS = performance.now()
				dev.dvFPS.textContent = `FPS : ${((dev.frames-dev.lastFrames)*1000/time).toFixed(2)} (${((dev.dataFrames-dev.lastDataFrames)*1000/time).toFixed(2)})`
				dev.lastFrames = dev.frames
				dev.lastDataFrames = dev.dataFrames
			}
		}
		
		requestAnimationFrame(animationFrame)
	}
	
	worker = new Worker ("./gameWorker.js")
	
	let readyMessage = {
		name : "ready"
	}
	
	worker.onmessage = (event) => {
		let data = event.data

		switch (data.name) {
			case "advance":
				
				if (!game.offline) {
					let time = performance.now()
					let updates = 0		
					if (data.time > 10000) {
						game.data.offlinium += data.time * 1e-3					
						data.time = game.frameTime
					}
					
					game.advance(data.time)
					updates = game.updatesPlanned.size
					game.update()
					
					if (dev) {
						let workTime = performance.now() - time
						dev.workTime += workTime
						dev.meanTime = dev.workTime / dev.dataFrames
						if (workTime > game.frameTime)
							console.log("Processing ", data.time.toFixed(2), "ms (",updates,"=>",game.gui.updatesPlanned.size,") took ", workTime.toFixed(2), "ms, mean time ", dev.meanTime.toFixed(2), "ms")
					}
				}
				
				worker.postMessage(readyMessage)
				break
		}
	}

	if (dev) {
		dev.start = performance.now()
		dev.lastFPS = dev.start
		dev.lastDataFrames = 0
		dev.lastFrames = 0
		dev.dataFrames = 0
		dev.workTime = 0
		dev.guiWorkTime = 0
		dev.frames = 0
		document.body.appendChild(dev.dvFPS = createElement("div", {class : "fps"}))
	}
		
	worker.postMessage({
		name : "start",
		frameTime : game.frameTime
	})

	requestAnimationFrame(animationFrame)
}