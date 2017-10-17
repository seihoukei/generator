"use strict"

class Game {
	constructor(data) {
		this.boost = 1
		Object.assign(this, data.data)
		
		this.setTargetFPS(this.targetFPS || settings.targetGameFPS || 60)

		if (data.elementData) {
			for (let elementData of data.elementData) {
				if (!elementData.name || this[elementData.name]) 
					continue
				
				this[elementData.name] = new elementData.class (elementData.data, {
					game : this
				})
			}
		}
				
		if (!this.autoSaveSlot || !this.load(this.autoSaveSlot))
			this.reset()
	}
	
	setTargetFPS(value) {
		this.targetFPS = value
		this.frameTime = 1000 / this.targetFPS
	}
	
	reset(saveData) {
		
		//Reset engine values
		this.canUpdate = false
		this.offline = true
		
		this.updatesPlanned = new Set()
		this.activeData = new Set()
		this.unlocks = new Set()

		let timerData = saveData && saveData.timers || {}
		
		this.timers = {
			//engine timers
			autoSave : new Timer(),
			change : new Timer(),
			gameUpdate : new Timer(),
			guiUpdate :  new Timer(),
			
			//game timers
			emit : new Timer({
				savable : true, 
				boostable : true,
				value : timerData["emit"] || 0, 
			}),
		}
		
		//Regenerate data
		if (this.data)
			delete this.data
		
		this.data = this.initData(gameData)
		
		this.generator = new Generator({
			game : this
		})
		
		if (saveData) {
			for (let resource of Object.values(this.data)) {
				let data = saveData.resources[resource.name]
				if (data) {
					resource.loadSaveData(data)
					this.updatesPlanned.add(resource)
				}
			}		
		}
			
		for (let chamber of this.generator.chambers)
			chamber.updatePosition(false)
		
		//Regenerate GUI
		if (this.gui) 
			this.gui.destroy()
			
		this.gui = new Gui(gameData.guiData, {
			game : this
		})

		//Update		
		for (let resource of Object.values(this.data)) {
			this.updatesPlanned.add(resource)
		}
			
		if (saveData && saveData.time)
			this.data.offlinium.add(Math.max(0, (Date.now() - saveData.time) * 1e-3 - 60))

		this.update(true)		
		this.gui.update(true)		
		
		if (saveData && saveData.unlocks)
			for (let unlock of saveData.unlocks)
				this.unlock(unlock)
		
		//Activate tab
		this.gui.tabs.show(saveData && saveData.gameTab || "generator", false)

		this.offline = false
	}
	
	initData(data) {
		let result = {}
		if (!data)
			return result
		
		let chambers = [...data.chambers]
		
		for (let chamber of chambers)
			chamber.class = GeneratorChamber
		
		
		let baseData = [...data.resources, ...chambers]
		let chamberResources = [...data.chamberResources]
		for (let resourceData of chamberResources) {
			for (let chamber of chambers) {
				let resource = {}
				Object.assign(resource, resourceData)
				resource.name = camelJoin(chamber.name, resource.name)
				resource.chamber = chamber
				baseData.push(resource)
			}
		}
		
		for (let resource of baseData) {
			if (!resource.name) 
				continue
			let item = new resource.class (resource, {
				game : this,
				dependants : new Set(),
				displays : new Set(),
			})
			result[resource.name] = item
		}
		
		function scrapResources(x) {
			if (!x)
				return []
			
			if (typeof(x) != "object")
				return []
			
			return Object.keys(x)
		}
		
		let first, last
		for (let resource of Object.values(result)) {
			if (resource.class == GeneratorChamber) {
				resource.data = {}
				
				for (let {name} of gameData.chamberResources)
					resource.data[name] = result[camelJoin(resource.name,name)]

				if (!first)
					first = resource
				if (last)
					last.next = resource
				resource.next = first
				last = resource
			}
		}
			
		for (let resource of Object.values(result)) {
			let dependencies = [
				...(resource.dependencies || []),
				...scrapResources(resource.displayRequirements),
				...scrapResources(resource.requirements),
				...scrapResources(resource.cost)
			]
			resource.dependencies = {self : resource}

			for (let name of dependencies) {
				let targetName = name
				if (name[0] == "_")
					targetName = camelJoin(resource.chamber?resource.chamber.name:resource.name, name.slice(1))
					
				let target = result[targetName]
				
				if (!target) {
					console.log (`Unknown dependency : ${resource.name} > ${targetName}, ignored`)
					continue
				}
				
				if (target && resource.dependants.has(target)) {
					console.log (`Looped dependencies : ${resource.name} + ${target.name}, ignored`)
					continue
				}

				resource.dependencies[name] = target
				target.dependants.add(resource)
			}
		}
		
		for (let resource of Object.values(result)) {
			if (resource.valueFunction) 
				resource.value = resource.valueFunction(resource.dependencies)
		}

		return result
	}
	
	resetData(prefix) {
		for (let resource of Object.values(this.data)) {
			if (resource.class.name.substr(0,prefix.length) == prefix) {
				resource.reset()
			}
		}
	}
	
	load (slot) {
		let saveData = localStorage[slot]
		
		if (!saveData)
			return false

		saveData = JSON.parse(decompressSave(saveData))
		
		if (saveData.version < 3) {
			this.reset()
			game.gui.notify("error", "Save outdated", "Your save was SEVERELY outdated and could not be compatibly loaded. The game is in early development, and is not released for public, things like this are bound to happen. Thanks for showing your interest.")
		} else {
			this.reset(saveData)
		}
		
		return true
	}
	
	save (slot) {
		let saveData = {
			resources : {}
		}
		
		for (let resource of Object.values(this.data)) {
			let data = resource.getSaveData()
			if (Object.entries(data).length)
				saveData.resources[resource.name] = data
		}
		
		saveData.unlocks = [...this.unlocks]
		saveData.version = this.version
		saveData.gameTab = this.gui.tabs.activeTab?this.gui.tabs.activeTab.name:"generator"
		
		let now = new Date()
		saveData.timeString = `${now.toDateString()} ${now.toTimeString().split(" ")[0]}`
		saveData.time = Date.now()
		
		saveData.timers = {}

		for (let [name, timer] of Object.entries(this.timers))
			if (timer.savable)
				saveData.timers[name] = timer.value
		
		localStorage[slot] = compressSave(JSON.stringify(saveData))

	}
	
	update(forced) {
		if (!this.canUpdate && !forced)
			return false
		
		while (this.updatesPlanned.size) {
			for (let resource of this.updatesPlanned) {
				resource.update()
				this.updatesPlanned.delete(resource)
			}
		}
		
		this.canUpdate = false
		return true
	}
	
	updateChanges() {
		
		for (let resource of Object.values(this.data))
			resource.getChangeSpeed(this.timers.change.value)
		
		this.timers.change.value = 0
	}
	
	advance(time = this.frameTime) {
		this.boost = this.data.offlinium.value > 0 ? this.data.offliniumPower.value : 1
		
		if (this.data.offlinium.value > 0) {
			this.data.offlinium.add(-time * 1e-3 * (this.boost - 1))
		}

		for (let timer of Object.values(this.timers))
			timer.tick(time, this.boost)
		
		for (let resource of this.activeData) {
			resource.timeLeft -= time * this.boost
			if (resource.timeLeft < 0) {
				resource.timeLeft = 0
				resource.active = false
				this.activeData.delete(resource)
			}
		}
		
		this.generator.advance(time * this.boost)

		if (this.timers.guiUpdate.value * settings.targetGuiFPS >= 990) {
			this.timers.guiUpdate.value = 0
			this.gui.canUpdate = true
		}
		
		if (this.timers.gameUpdate.value * settings.targetGameFPS >= 990) {
			this.timers.gameUpdate.value = 0
			this.canUpdate = true
		}
		
		if (this.timers.autoSave.value > 10000) {
			this.timers.autoSave.value = 0
			this.save(this.autoSaveSlot)
		}
		
		if (this.timers.change.value > 1000) {
			this.updateChanges()
		}
		
		if (dev) dev.dataFrames++
	}
	
	timeSkip(time) {

		this.offline = true
		
		let offlineData = []

		for (let resource of Object.values(this.data))
				offlineData.push({
					name : resource.name,
					startValue : resource.value
				})
		
		let ticks = time / this.frameTime
				
		for (let i = 0; i < ticks; i++) {
			this.advance(this.frameTime)
			if (i & 0b1111 == 0b1111)
				this.update()
		}		

		let output = []
		for (let data of offlineData) {
			let resource = this.data[data.name]
			data.output = resource.value - data.startValue
			if (resource.seen && data.output)
				output.push(`${resource.displayName || data.name}: ${resource.displayString(data.output)}`)
		}
		
		this.offline = false

		if (time > 1000 && output.length)
			this.gui.notify("timeSkip",`Production for ${timeString(time)}:`,output.join(', '))
		
	}
	
	checkResources(resources, pay) {
		if (!resources)
			return true
		
		for (let [name, value] of Object.entries(resources)) {
			let resource = this.data[name]
			
			if (!resource || resource.value < value)
				return false
			
			if (pay)
				resource.add(-value)
		}
		
		return true
	}

	unlock(name) {
		if (this.unlocks.has(name))
			return false
		
		console.log("unlocking", name)
		
		switch (name) {
			case "plan" : 
				for (let button of this.gui.dialogs.tabs.get("plan").displayButtons)
					button.reveal()
				break
		}
		
		this.unlocks.add(name)
		return true
	}	
}

class Generator {
	constructor (...data) {
		Object.assign(this, ...data)
		
		this.chambers = new Set()
		
		for (let resource of Object.values(this.game.data)) {
			if (resource.class == GeneratorChamber) {
				resource.data = {}
				this.chambers.add(resource)
				resource.generator = this
			}
		}
		
		for (let resource of gameData.chamberResources) {
			for (let chamber of this.chambers)
				chamber.data[resource.name] = this.game.data[camelJoin(chamber.name,resource.name)]
		}
		
		this.particles = new Set()
		this.extraData =  {
			generator : this,
			game : this.game
		}
	}
	
	shootParticle(...data) {
		let particle = new Particle(...data, this.extraData)
		
		if (!particle.mass) 
			return false
		
		this.particles.add(particle)
		
		if (this.visible)
			this.tab.animateParticle(particle)
		
		return true
	}
	
	advance (time = this.game.frameTime) {
		this.visible = !this.game.offline && this.tab && (this.game.gui.tabs.activeTab == this.tab)
		
		while (this.game.timers.emit.value > 10) {
			this.game.timers.emit.value -= 10
			
			for (let chamber of this.chambers) {
				if (Math.random() > chamber.data.stability.value) {
					if (chamber.shootParticle({
						mass : chamber.data.autoSplitCost.value
					})) this.game.data.autoSplits.add(1)
				}
				if (Math.random() < chamber.data.photonChance.value)
					chamber.shootPhoton()
			}
		}
		
		if (this.game.data.moveSpeed.value > 0) {
			this.game.data.movePhase.add(this.game.data.moveSpeed.value)

			for (let chamber of this.chambers) {
				chamber.updatePosition(true)
			}
		}
		
		for (let particle of this.particles)
			particle.advance(time, this.visible)
	}
	
	reset() {
		this.game.resetData("Generator")
		this.game.save("resetSave")
		this.game.load("resetSave")
	}
}

class Particle {
	constructor (...data) {
		this.timeTotal = 2000
		this.time = 0
		this.position = 0
		this.mass = 1
		this.power = 1
		this.points = 30
		Object.assign(this, ...data)
		
		if (this.speed) this.timeTotal /= this.speed
		
		if (this.origin && this.origin.value < this.mass && !this.tryMax) {
			this.mass = 0
			return
		}
		
		this.size = softCap(1.75 * this.mass ** 0.2, 4.5)

		if (this.origin && this.target) {
			this.path = this.createCurve({
				p1 : this.origin,
				p2 : this.target,
				minAngle : -Math.PI/10,
				maxAngle : Math.PI/2,
				minSpeed : 10,
				maxSpeed : 50,
				size : this.size,
				points : this.points
			})
		} else {
			this.path = this.createLine({
				p1 : this.origin,
				p2 : this.target,
				size : this.size,
				distance : 100,
				points : this.points
			})
		}
		
		if (this.origin) {
			this.origin.add(-this.mass)
			this.origin.shotParticles += this.mass
		} else if (this.target) {
			this.target.shotParticles += this.mass
		}

		this.production = this.mass * this.power * this.game.data.generatorBoost.value * 1e-9
		this.segmentTime = this.timeTotal / this.points
		
		this.animationTime = this.timeTotal / this.game.boost
		this.segment = 0		
	}
	
	createCurve(data) {
		let dx = data.p2.x - data.p1.x
		let dy = data.p2.y - data.p1.y
		let angle = Math.atan2(dy, dx)
		let angle1 = angle - randomRange(data.minAngle, data.maxAngle)
		let angle2 = angle + randomRange(data.minAngle, data.maxAngle) + Math.PI
		let speed1 = randomRange(data.minSpeed, data.maxSpeed)
		let speed2 = randomRange(data.minSpeed, data.maxSpeed)
		let points = [{
			x : data.p1.x + Math.cos(angle1) * (data.p1.radius * 0.8 - data.size),
			y : data.p1.y + Math.sin(angle1) * (data.p1.radius * 0.8 - data.size),
		},{
			x : data.p1.x + Math.cos(angle1) * (data.p1.radius * 0.8 - data.size + speed1),
			y : data.p1.y + Math.sin(angle1) * (data.p1.radius * 0.8 - data.size + speed1),
		},{
			x : data.p2.x + Math.cos(angle2) * (data.p2.radius * 0.8 - data.size + speed2),
			y : data.p2.y + Math.sin(angle2) * (data.p2.radius * 0.8 - data.size + speed2),
		},{
			x : data.p2.x + Math.cos(angle2) * (data.p2.radius * 0.8 - data.size),
			y : data.p2.y + Math.sin(angle2) * (data.p2.radius * 0.8 - data.size),
		}]
		
		let lastPoint = points[0]
		let path = []
		let lastPosition = 0
		
		for (let i = 1; i <= data.points; i++) {
			let position = i / data.points
			let nextPoint = {
				x : points[0].x * (1 - position) ** 3 +
					points[1].x * 3 * position * (1 - position) ** 2 +
					points[2].x * 3 * (1 - position) * position ** 2 +
					points[3].x * position ** 3,
				y : points[0].y * (1 - position) ** 3 +
					points[1].y * 3 * position * (1 - position) ** 2 +
					points[2].y * 3 * (1 - position) * position ** 2 +
					points[3].y * position ** 3
			}
			dx = nextPoint.x - lastPoint.x
			dy = nextPoint.y - lastPoint.y
			let length = Math.hypot(dx, dy)
			path.push({
				points : [lastPoint, nextPoint],
				endPosition : position,
				length
			})
			lastPoint = nextPoint
			lastPosition = position
		}
		
		return path
	}
	
	createLine(data) {
		let point = data.p1 || data.p2 || {
			x : randomRange(-50, 50),
			y : randomRange(-50, 50)
		}
		let angle = Math.random() * Math.PI * 2
		let nowhere = {
			x : point.x + Math.cos(angle) * data.distance,
			y : point.y + Math.sin(angle) * data.distance,
		}
		let somewhere = {
			x : point.x + Math.cos(angle) * (point.radius - data.size),
			y : point.y + Math.sin(angle) * (point.radius - data.size),
		}

		let start = data.p1 ? somewhere : nowhere
		let finish = data.p2 ? somewhere : nowhere

		let dx = (finish.x - start.x) / (data.points || 1)
		let dy = (finish.y - start.y) / (data.points || 1)
		let length = Math.hypot(dx, dy)
		let step = 1 / (data.points || 1)
		
		let path = []
		let oldPoint = start
		let position = 0
		
		for (let i = 1; i <= data.points; i++) {
			position += step
			let point = {
				x : oldPoint.x + dx,
				y : oldPoint.y + dy
			}
			path.push({
				points : [oldPoint, point],
				endPosition : position,
				length
			})
			
			oldPoint = point
		}
		
		return path
	}
	
	advance (time = this.game.frameTime) {
		let position = 1
		
		if (this.time + time > this.timeTotal) {
			time = this.timeTotal - this.time
			this.time = this.timeTotal
		} else {
			position = Math.min(1, this.time / this.timeTotal)
			this.time += time
		}
		
		let fullFragment = false
		let distance = 0
		let travelTime = 0
		
		while (this.segment < this.path.length && this.path[this.segment].endPosition <= position) {			
			distance += this.path[this.segment].length
			travelTime += this.segmentTime
			this.segment++
		}

		if (travelTime)
			this.produceOutput(distance, travelTime)

		if (position >= 1 || this.segment >= this.path.length) {
			this.land()
		}		
	}
	
	land() {
		this.generator.particles.delete(this)

		if (this.origin) {
			this.origin.shotParticles -= this.mass
		} else if (this.target) {
			this.target.shotParticles -= this.mass
		}
		
		if (!this.target) return
		
		this.target.accept(this)
	}
	
	produceOutput(distance, time) {
		this.game.data.energy.add(this.production * distance ** 2 / time)
		if (this.origin && !this.target) {
			this.game.data.light.add(this.production * distance * 1e-3)
		}
	}
}

class GameObject {
	constructor (...data) {
		this.savables = []
		this.seen = false
		this.value = 0
		Object.assign(this, ...data)
		
		this.addSavable("seen", this.seen)
		
		this.oldValue = this.value
		this.savedValue = this.value
		this.changeSpeed = 0
	}	
	
	getChangeSpeed(time) {
		if (!time) 
			return
		
		this.oldChange = this.changeSpeed
		this.changeSpeed = (this.value - this.savedValue) * 1000 / time
		this.updateDisplays()
				
		this.savedValue = this.value
	}
	
	addSavable(name, value) {
		this[name] = value
		
		this.savables.push({
			name, value
		})
	}
	
	reset() {
		for (let {name, value} of this.savables) {
			this[name] = value
		}
	}
	
	getSaveData() {
		let saveData = {}
		for (let savable of this.savables) {
			if (this[savable.name] != savable.value)
				saveData[savable.name] = this[savable.name]
		}
		return saveData
	}
	
	loadSaveData(saveData) {
		if (!saveData) saveData = {}
		for (let savable of this.savables) {
			if (saveData[savable.name] !== undefined)
				this[savable.name] = saveData[savable.name]
			else
				this[savable.name] = savable.value
		}
		
		this.savedValue = this.value
		this.changeSpeed = 0

		if (this.onLoad)
			this.onLoad()

	}
	
	update() {
		if (this.valueFunction)
			this.value = this.valueFunction(this.dependencies)
		
		if (this.info) {
			for (let info of Object.values(this.info))
				info.value = info.valueFunction(this.dependencies)
		}
		
		if (!this.seen && (
			this.displayRequirement && this.displayRequirement(this.dependencies) || 
			this.displayRequirements && this.game.checkResources(this.displayRequirements)
		))
			this.reveal()

		if (this.value != this.oldValue) {
			for (let dependant of this.dependants)
				this.game.updatesPlanned.add(dependant)
		}

		this.updateDisplays()
		
		this.oldValue = this.value
	}
	
	addDisplay(display) {
		this.displays.add(display)
		
		if (this.onAddDisplay)
			this.onAddDisplay(display)
	}
	
	removeDisplay(display) {
		this.displays.delete(display)
	}
	
	reveal(forced) {
		if (this.seen && !forced)
			return
		
		this.seen = true

		for (let dependant of this.dependants) {
			if (dependant.onRevealDependency) 
				dependant.onRevealDependency(this)
		}
		
		this.updateDisplays(true)		
	}
	
	updateDisplays(forced) {
		for (let display of this.displays)
			if (forced || display.styles || this.value != this.oldValue || this.changeSpeed != this.oldChange)
				this.game.gui.updatesPlanned.add(display)
	}
}

class Stat extends GameObject {
	constructor (...data) {
		super(...data)
	}
}

class Resource extends GameObject {
	constructor (...data) {
		super(...data)
		this.addSavable("value", this.value)
	}

	add(value = 1, allowNegative = false) {
		if (!value) 
			return
		
		this.value += value
		
		if (this.value < 0 && !allowNegative) 
			this.value = 0
		
		this.game.updatesPlanned.add(this)
	}

	set(value = 0) {
		this.add(value - this.value)
	}
}

class Chamber extends Resource {
	constructor (...data) {
		super(...data)
		this.addSavable("shotParticles", 0)
		this.updatePosition(false)

		this.addSavable("x", this.x || 0)
		this.addSavable("y", this.y || 0)
	}
	
	spreadParticles(mass, amount = 10, data) {
		for (let i = 0; i < amount; i++) {
			this.shootParticle({
				mass : mass / amount
			}, data)
		}
	}
	
	spreadPhotons(mass, amount = 10, data) {
		for (let i = 0; i < amount; i++) {
			this.shootPhoton({
				mass : mass / amount
			}, data)
		}
	}
	
	shootParticle (...data) {
		return this.game.generator.shootParticle({
			origin : this,
			target : this.next,
			mass : this.data.splitCost.value,
			power : this.data.splitPower.value,
			speed : this.game.data.particleSpeed.value,
		}, ...data)
	}
	
	shootPhoton (...data) {
		return this.game.generator.shootParticle({
			origin : this,
			mass : Math.random(),
			power : this.data.splitPower.value * 100,
			speed : this.game.data.particleSpeed.value,
		}, ...data)
	}
	
	fullMass() {
		return (this.value + this.shotParticles)
	}
	
	updatePosition(produceEnergy) {
		let lastX = this.x || 0
		let lastY = this.y || 0
		let phase = Math.cos(Math.max(0, this.game.data?this.game.data.movePhase.value - this.phaseShift:0))
//		phase = phase > 0 ? 1 - (1 - phase) ** 2 : (1 + phase) ** 2 - 1
		
		let shift = this.orbitRadius * phase
		
		this.x = this.x0 + this.cos * shift
		this.y = this.y0 + this.sin * shift
		
		for (let display of this.displays) {
			if (display.updatePosition)
				display.updatePosition()
		}
		
		let dx = this.x - lastX || 0
		let dy = this.y - lastY || 0
		
		if (this.game.data && produceEnergy) {
			this.game.data.energy.add(Math.hypot(dx, dy) * this.value * this.game.data.generatorBoost.value)
		}
	}
	
	onLoad () {
		this.value += this.shotParticles
		this.shotParticles = 0
	}
	
	accept (particle) {
		let mass = particle.mass
		let power = particle.power
		let value = this.value
		
		while (mass > 1) {
			mass -= 1
			let add = massCap(power, value, this.game.data.massCapStep.value)
			value += add
			if (add - 1 < 1e-4)
				break
		}
		
		value += mass * massCap(power, value, this.game.data.massCapStep.value)
		
		this.add(value - this.value)
		
		if (particle.mass >= 1 && Math.random() < this.data.chainChance.value) {
			if (this.shootParticle({
				mass : (0.5 + 0.5 * Math.random()) * particle.mass
			})) this.data.autoSplits.add(1)
		}
	}
}

class GameAction extends Resource {
	constructor (...data) {
		super(...data)
		this.displayString = this.displayString || (x => x?x.toString():"")
		this.canAfford = false
		this.active = false
		this.leveled = true
		this.bought = false
		this.calculateCosts()
		
		if (this.duration) {
			this.addSavable("timeLeft", 0)
		}
	}
	
	onRevealDependency(resource) {
		if (this.calculatedCost && this.calculatedCost[resource.name] || this.calculatedRequirements && this.calculatedRequirements[resource.name])
			for (let display of this.displays) {
				display.highlight("updated")
			}
	}
	
	calculateCosts() {
		this.calculatedCost = getCurrentCost(this.cost, this.value)
		this.calculatedRequirements = getCurrentCost(this.requirements, this.value)
		if (this.canAfford)
			this.canAfford = this.game.checkResources(this.calculatedCost) && this.game.checkResources(this.calculatedRequirements)
		
		this.game.updatesPlanned.add(this)
	}
	
	add(x) {
		super.add(x)
		this.bought = this.max && (this.value >= this.max)
		
		this.calculateCosts()	
		
		if (this.calculatedRequirements && this.calculatedRequirements.generatorLevel > this.game.data.generatorLevel.value)
			this.bought = true
		
	}
	
	update() {
		if (this.seen) {
			this.canAfford = this.game.checkResources(this.calculatedCost) && this.game.checkResources(this.calculatedRequirements)
		}
		super.update()
	}
	
	buy(free) {
		if (this.active || this.value >= this.max || this.bought)
			return false
		
		if (!free && (!this.seen || !this.canAfford))
			return false
		
		if (!free)
			this.game.checkResources(this.calculatedCost, true)
		
		this.add(1)
		
		if (this.action)
			this.action(this.dependencies)
		
		if (this.duration) {
			this.activate(this.duration)
		}
		
		return true
	}
	
	activate(time) {
		if (!time) 
			return
		
		this.active = true
		this.timeLeft = time
		this.game.activeData.add(this)

		for (let display of this.displays)
			if (display.animateProgress)
				display.animateProgress()
	}
	
	onAddDisplay(display) {
		if (this.duration && this.timeLeft && display.animateProgress)
			display.animateProgress()		
	}

	onLoad() {
		this.calculateCosts()

		if (this.duration && this.timeLeft > 0) {
			this.activate(this.timeLeft)
		}

		this.bought = (this.max && this.value >= this.max) || (this.calculatedRequirements && this.calculatedRequirements.generatorLevel > this.game.data.generatorLevel.value)
	}
}

class Achievement extends GameAction {
	update() {
		super.update()
		if (this.canAfford) {
			if (this.buy()) 
				this.gui.notify("achievement", `${this.displayName} ${(this.max && this.max > 1)?this.value:""}`, this.description)
		}
	}
}

class Timer {
	constructor (...data) {
		this.value = 0
		Object.assign(this, ...data)
	}
	
	tick(x, boost = 1) {
		this.value += x * (this.boostable ? boost : 1)
	}
	
	reset() {
		this.value = 0
	}
}

class GlobalStat extends Stat {}
class GlobalResource extends Resource {}
class GlobalUpgrade extends GameAction {}

class GeneratorChamber extends Chamber {}
class GeneratorStat extends Stat {}
class GeneratorResource extends Resource {}
class GeneratorUpgrade extends GameAction {}
class GeneratorInteraction extends GameAction {}
class GeneratorInfluence extends GameAction {}