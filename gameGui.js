"use strict"

class Gui {
	constructor (...data) {
		Object.assign(this, ...data)
		if (!this.container) 
			this.container = document.body
		
		this.dvDisplay = createElement("div", {class : this.className?this.className:"game-main"})
		
		this.container.appendChild(this.dvDisplay)
		
		for (let elementData of this.elementData) {
			if (!elementData.name || this[elementData.name]) 
				continue
			
			if (elementData.data) {
				if (!elementData.data.name)
					elementData.data.name = elementData.name
			}
			
			this[elementData.name] = new elementData.class (elementData.data, {
				game : this.game,
				gui : this,
				container : this.dvDisplay,
				parent : this
			})
		}

		this.canUpdate = false
		this.active = false
		this.updatesPlanned = new Set()
	}
	
	update(forced) {
		if (!this.canUpdate && !forced)
			return false
		
		while (this.updatesPlanned.size) {
			for (let display of this.updatesPlanned) {
				display.update()
				this.updatesPlanned.delete(display)
			}
		}
		
		this.canUpdate = false
		return true
	}
		
	destroy() {
		this.dvDisplay.remove()
		delete this.dvDisplay
	}
}

// ------------------------------------------------------------------------------------
// Menu
// ------------------------------------------------------------------------------------
class Menu {
	constructor (...data) {
		Object.assign(this, ...data)
		
		this.dvDisplay = createElement("div", {class : "game-menu"})
		this.dvButton = createElement("div", {class : "game-menu-button"}, "☰")
		
		for (let item of this.items) {
			item.container = this.dvDisplay
			this.dvDisplay.appendChild(item.dvDisplay)
			item.setMenu(this)
		}
		
		this.dvButton.onmouseenter = (event) => {
			this.dvDisplay.style.right = `0`
			this.dvDisplay.style.bottom = `7.5vmin`
			this.dvDisplay.classList.remove("hidden")
		}

		this.container.appendChild(this.dvButton)
		this.container.appendChild(this.dvDisplay)
	}
}

class MenuItem {
	constructor (data) {
		Object.assign(this, data)
		this.dvDisplay = createElement("div", {class : `game-menu-item ${this.items?"nest":""}`})
		this.dvDisplay.appendChild(this.dvName = createElement("div", {class : `game-menu-item-name ${this.items?"nest":""}`}, `${this.displayName}`))
		
		if (this.displayString)
			this.dvDisplay.appendChild(this.dvDisplayInfo = createElement("div",{class : `game-menu-item-info`}, this.displayString()))
		
		if (this.items) {
			this.dvDisplay.appendChild(this.dvNest = createElement("div", {class : `game-menu`}))
			
			for (let item of this.items) {
				this.dvNest.appendChild(item.dvDisplay)
				item.container = this.dvNest
			}
			
			this.dvDisplay.onmouseenter = (event) => {
				this.dvNest.style.right = `${this.container.offsetWidth}px`
				this.dvNest.style.bottom = `0`
				for (let item of this.items) {
					if (item.displayString)
						item.dvDisplayInfo.textContent = `${item.displayString()}`
				}
			}
		} else {
			if (this.action)
				this.dvDisplay.onclick = (event) => {
					this.action()
					this.menu.dvDisplay.classList.add("hidden")
				}
		}
	}
	
	setMenu (menu) {
		this.menu = menu
		if (this.items) 
			for (let item of this.items)
				item.setMenu(menu)
	}
}

class MenuSlotItem extends MenuItem {
	constructor(displayName, saveSlot) {
		super ({
			displayName,
			displayString : (save = localStorage[saveSlot]) => (save?JSON.parse(decompressSave(save)).timeString:"empty"),
			saveSlot
		})		
	}
}

class MenuSaveSlot extends MenuSlotItem {
	action() {
		game.save(this.saveSlot)
	}
}

class MenuLoadSlot extends MenuSlotItem {
	action() {
		game.load(this.saveSlot)
	}
}

// ------------------------------------------------------------------------------------
// Notifications
// ------------------------------------------------------------------------------------
class Notifications {
	constructor (...data) {
		Object.assign (this, ...data)
		this.container.appendChild(this.dvDisplay = createElement("div", {class : `notifications`}))
		this.notifications = new Set()
		if (this.parent) {
			this.parent.notify = (...data) => this.notify(...data)
		}
	}
	
	notify (subClass = "", header = "", text = "") {
		this.notifications.add (new Notification({
			subClass, header, text,
			container : this.dvDisplay,
			parent : this,
			game : this.game
		}))
		if (this.notifications.size > this.max) {
			[...this.notifications.values()].shift().hide()
		}
	}
	
	clear() {
		for (let notification of this.notifications)
			notification.hide()
	}
}

class Notification {
	constructor (...data) {
		Object.assign (this, ...data)

		this.container.appendChild(this.dvDisplay = createElement("div", {class : `notification ${this.subClass}`}))
		this.dvDisplay.appendChild(this.dvLetter = createElement("div", {class : `letter`}, this.header.slice(0,1)))
		this.dvDisplay.appendChild(this.dvHeader = createElement("div", {class : `header`}, this.header))
		this.dvDisplay.appendChild(this.dvText = createElement("div", {class : `text`}, this.text))
		this.dvDisplay.onclick = (event) => {
			this.hide()
		}
		let siblings = new Set()
		
		if (!this.game.offline && !document.hidden) {
			let last = [...this.parent.notifications].slice(-1)[0]
			if (last) {
				last.dvDisplay.animate([{
					marginBottom : "1vmin"
				},{
					marginBottom : "1vmin",
					offset : 0.95
				},{
					marginBottom : "5vmin"
				}], 5000)
			}
			this.dvDisplay.animate ([{
				position : "absolute",
				bottom : 0,
				left : "100vw",
				width : "65vmin",
				maxHeight : "50vmin",
				color : "transparent"
			}, {
				position : "absolute",
				bottom : 0,
				left : "calc(50vw - 32.5vmin)",
				width : "65vmin",
				maxHeight : "50vmin",
				color : "white",
				offset : 0.1
			}, {
				position : "absolute",
				bottom : 0,
				left : "calc(50vw - 32.5vmin)",
				width : "65vmin",
				maxHeight : "50vmin",
				color : "white",
				offset : 0.8
			}, {
				position : "absolute",
				bottom : 0,
				left : "0",
				width : "3vmin",
				maxHeight : "3vmin",
				color : "transparent"
			}], 5000)
			this.dvLetter.animate([{
				height : 0,
				opacity : 0
			},{
				height : 0,
				opacity : 0,
				offset : 0.95
			},{
				opacity : 1,
				height : "3vmin"
			}], 5000)
		}
	}
	
	hide() {
		this.parent.notifications.delete(this)
		this.dvDisplay.onclick = () => {}
		if (!this.game.offline && !document.hidden) {
			this.dvDisplay.animate([{
				opacity : 1,
				maxHeight : getComputedStyle(this.dvDisplay).maxHeight,
				marginBottom : "1vmin"
			},{
				opacity : 0,
				maxHeight : 0,
				marginBottom : "0vmin"
			}], 500)
			setTimeout(() => {
				this.container.removeChild(this.dvDisplay)
				delete this.dvDisplay
			}, 500)
		} else {
				this.container.removeChild(this.dvDisplay)
				delete this.dvDisplay
		}
	}
}

// ------------------------------------------------------------------------------------
// Tooltip
// ------------------------------------------------------------------------------------
class Tooltip {
	constructor (...data) {
		Object.assign(this, ...data)
		this.container.appendChild(this.dvDisplay = createElement("div", {class : `tooltip hidden`}))
		this.elements = []
	}	
	
	build (data) {
		this.destroy()
		
//		console.log(data)
		for (let elementData of data) {
			let element = new elementData.class(elementData, {
				container : this.dvDisplay,
				game : this.game
			})
			this.elements.push(element)
		}
		this.show()
	}
	
	moveTo (x, y) {
		let w = this.dvDisplay.offsetWidth
		let h = this.dvDisplay.offsetHeight
		let width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
		let height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
		
		x = x * (width - w) / width
		y = (y < height / 2 ? y + 5 : y - (h + 5))
		
		this.dvDisplay.style.left = `${x}px`
		this.dvDisplay.style.top = `${y}px`
	}
	
	hide() {
		this.dvDisplay.classList.add("hidden")
	}
	
	show() {
		this.dvDisplay.classList.remove("hidden")
	}
	
	destroy() {
		this.hide()
		let element
		while (element = this.elements.pop()) {
			element.destroy()
		}
	}
}

class TextFragment {
	constructor (...data) {
		Object.assign(this, ...data)
		this.container.appendChild(this.dvDisplay = createElement("div", {class : this.className || `text`}, this.text))
	}
	
	destroy() {
		this.dvDisplay.remove()
	}
}
// ------------------------------------------------------------------------------------
// Tabs and dialogs
// ------------------------------------------------------------------------------------

class Tabs {
	constructor (...data) {
		Object.assign(this, ...data)
		this.tabs = new Map()

		this.dvDisplay = createElement("div", {class : `${this.className || "tab-holder"} ${this.name?this.name:""}`})
		
		if (this.container) {
			this.container.appendChild(this.dvDisplay)
			
			if (this.autoClose)
				this.container.addEventListener("click", (event) => {
					if (this.openingTab) {
						this.openingTab = false
						return
					}
					
					if (this.activeTab && !this.activeTab.dvDisplay.contains(event.target))
						this.hideAll()
				})
		}
		
		if (this.tabData) 
			for (let tabData of this.tabData) {
				this.tabs.set(tabData.name, new (tabData.class || this.tabClass || Tab) (tabData, {
					parent : this,
					container : this.dvDisplay,
					gui : this.gui,
					game : this.game
				}))
			}
	}
	
	show(name, animated = true) {
		this.hideAll(animated)
		
		let tab = this.tabs.get(name)
		
		if (tab) {
			this.activeTab = tab
			tab.show(animated)
		}
	}
	
	hideAll(animated = true) {
		if (!this.activeTab) 
			return
		
		this.activeTab.hide(animated)
		
		delete this.activeTab
	}
	
	buttonFor(name, data) {
		let tab = this.tabs.get(name)
		if (!tab) {
			console.log(`Could not create button for ${name}`)
			return
		}
		
		return tab.makeButton(data)		
	}
}

class TabButton {
	constructor(...data) {
		this.seen = false
		Object.assign(this, ...data)
		
		this.dvDisplay = createElement("div", {class : `${this.className ? this.className : "tab-button"} ${this.tab && this.tab.active?"active":""} ${this.seen?"":"hidden"} ${this.tab.name}`}, this.text?this.text:this.tab.displayName)
		
		if(this.container)
			this.container.appendChild(this.dvDisplay)
	}
	
	reveal (forced) {
		if (this.seen && !forced) 
			return
		
		this.seen = true
		this.dvDisplay.classList.remove("hidden")
		if (this.moveObject)
			this.moveObject.classList.add("moved")
	}
	
	highlight (name, action) {
		this.dvDisplay.addEventListener("mouseenter", action)
		this.dvDisplay.classList.add(name)
	}
	
	resetHighlight (name, action) {
		this.dvDisplay.removeEventListener("mouseenter", action)
		this.dvDisplay.classList.remove(name)
	}
}

class Tab {
	constructor (...data) {
		this.active = false

		Object.assign(this, ...data)

		this.dvDisplay = createElement("div", {class : `${this.className || "tab"} ${this.name?this.name:""} hidden`})
		
		if (!this.container && this.parent)
			this.container = this.parent.dvDisplay || this.parent.container
		
		if (this.container) {
			this.container.appendChild(this.dvDisplay)
		}
		
		this.displayButtons = new Set()
		
		if (this.active)
			this.show(false)
	}
	
	show(animated = true) {
		if (this.parent) {
			if (this.parent.activeTab) 
				this.parent.hideAll(animated)
			
			this.parent.activeTab = this
			this.parent.openingTab = true
		}
		
		this.active = true
		this.dvDisplay.classList.remove("hidden")
		
		if (animated && this.parent && this.parent.showAnimation)
			makeAnimation(this.dvDisplay, this.parent.showAnimation)
		
		for (let button of this.displayButtons)
			button.dvDisplay.classList.add("active")
	}
	
	hide(animated = true) {
		this.active = false
		
		if (animated && this.parent && this.parent.hideAnimation) {
			makeAnimation(this.dvDisplay, this.parent.hideAnimation).onfinish = (event) => {
				if (!this.active)
					this.dvDisplay.classList.add("hidden")
			}	
		} else
			this.dvDisplay.classList.add("hidden")

		for (let button of this.displayButtons)
			button.dvDisplay.classList.remove("active")
	}
	
	switch() {
		if (this.active) {
			if (!this.parent || this.parent.allowNone) 
				this.hide()
		} else
			this.show()
	}
	
	makeButton(data = {}) {
		let button = new TabButton({tab : this}, data)
		
		button.dvDisplay.onclick = (event) => { 
			this.switch() 
		}
		
		this.displayButtons.add(button)
		
		if (this.seen)
			button.reveal(true)
		
		return button		
	}
}

class Dialog extends Tab {
	constructor(...data) {
		super(...data)
		this.dvDisplay.appendChild(this.dvTitleBar = createElement("div", {class : "dialog-title-bar"}))
		this.dvTitleBar.appendChild(this.dvTitle = createElement("div", {class : "dialog-title"}, this.displayName))
		this.dvTitleBar.appendChild(this.dvClose = createElement("div", {class : "dialog-close"}, "╳"))
		
		this.dvClose.onclick = (event) => { 
			this.hide() 
		}
	}
}

// ------------------------------------------------------------------------------------
// Displays
// ------------------------------------------------------------------------------------
class ResourceDisplay {
	constructor(...data) {
		this.forced = false
		
		Object.assign(this, ...data)
		
		if (!this.resource) {
			console.log("Unknown resource for display", ...data)
			return
		}
		
		this.initDisplay()
					
		this.dvDisplay = createElement("div", {class : `${this.className?this.className:"display"} ${this.resource.name} ${this.resource.seen?"":this.forced?"unknown":"hidden"}`})
		if (this.resource.duration) {
			this.dvDisplay.appendChild(this.dvProgress = createElement("div",{class : `progress`}))
		}
		if (!this.noName && this.resource.displayName)
			this.dvDisplay.appendChild(this.dvName = createElement("div", {class : "name"}, this.resource.seen?this.displayName:this.forced?"unknown":this.displayName))
		this.dvDisplay.appendChild(this.dvValue = createElement("div", {class : "value"}, this.resource.seen?this.displayString(this.resource.value):""))

		if (this.showChange)
			this.dvDisplay.appendChild(this.dvChange = createElement("div", {class : "change"}, this.resource.seen?this.displayString(this.resource.changeSpeed):""))
		
		this.resource.addDisplay(this)
		
		this.seen = this.resource.seen
		
		if (this.container)
			this.container.appendChild(this.dvDisplay)
	}
	
	initDisplay() {
		this.displayName = this.displayName || this.resource.displayName || this.resource.name
		this.displayString = this.displayString || this.resource.displayString
	}

	update() {
		if (!this.resource.seen)
			return
		
		if (!this.seen) {
			this.reveal()
		}
		
		if (this.styles)
			for (let style of this.styles) {
				this.dvDisplay.classList.toggle(style.name, style.func(this.resource.dependencies))
			}

		this.dvValue.textContent = this.displayString(this.resource.value)

		if (this.showChange) {
			let changeSpeed = this.resource.changeSpeed
			this.dvChange.classList.toggle("positive", changeSpeed > 0)
			this.dvChange.classList.toggle("negative", changeSpeed < 0)
			this.dvChange.textContent = `(${changeSpeed > 0?"+":""}${this.displayString(changeSpeed)}/s)`
		}
		
		this.seen = this.resource.seen
		
		if (this.progressAnimation && this.resource.duration) {
			if (this.resource.timeLeft)
				this.progressAnimation.currentTime = this.resource.duration - this.resource.timeLeft
			else {
				this.progressAnimation.cancel()
				delete this.progressAnimation
			}
		}
	}
	
	highlight(name) {
		let action = (event) => {
			this.dvDisplay.classList.remove(name)
			this.dvDisplay.removeEventListener("mouseenter", action)
		}
		this.dvDisplay.classList.add(name)
		this.dvDisplay.addEventListener("mouseenter", action)
		
	}
	
	reveal(forced) {
		if (this.seen && !forced)
			return 
		
		if (this.multiDisplay && !this.multiDisplay.seen)
				this.multiDisplay.show()
		
		if (this.onReveal)
			this.onReveal()
		
		this.dvDisplay.classList.remove("unknown")
		this.dvDisplay.classList.remove("hidden")
		if (this.showAnimation)
			makeAnimation(this.dvDisplay,this.showAnimation)
		
		if (this.dvName)
			this.dvName.textContent = this.displayName
	}
	
	destroy() {
		this.dvDisplay.remove()
		
		this.resource.removeDisplay(this)
	}
	
	animateProgress() {
		if (!this.resource.duration || !this.dvProgress) 
			return
		
		this.progressAnimation = this.dvProgress.animate([{
			width : "100%"
		},{
			width : "0%"
		}], this.resource.duration)
		this.progressAnimation.currentTime = this.resource.duration - this.resource.timeLeft
	}
}

class StoreDisplay extends ResourceDisplay {
	constructor(...data) {
		super(...data)
		if (this.resource.max == 1)
			this.dvValue.classList.add("hidden")
		
		if (this.resource.bought)
			this.dvDisplay.classList.add("bought")
		
		if (this.resource.target)
			this.dvDisplay.classList.add(this.resource.target)
		
		this.dvDisplay.onmouseenter = (event) => {
			this.updateTooltip()
		}
		
		this.dvDisplay.onmousemove = (event) => {
			this.game.gui.tooltip.moveTo(event.clientX, event.clientY)
		}
		
		this.dvDisplay.onmouseout = (event) => {
			this.game.gui.tooltip.destroy()
		}
		
		this.dvDisplay.onclick = (event) => {
			if (this.resource.buy()) {
				this.animateBuy()
				this.updateTooltip()
			}
		}
		
		if (this.resource.seen)
			this.reveal()
	}
	
	updateTooltip() {
		let tooltipData = [{
			class : TextFragment,
			className : "title",
			text : this.displayName
		},{
			class : TextFragment,
			className : "obtained",
			text : `(obtained ${pluralize(this.resource.value, ["time","times"])})`
		}]
		
		if (this.resource.displayHint) tooltipData.push({
			class : TextFragment,
			className : "description",
			text : this.resource.displayHint				
		})
		
		if (this.resource.info) {
			for (let [name, info] of Object.entries(this.resource.info)) {
				if (this.resource.bought && info.boughtHide)
					continue
				
				tooltipData.push({
					class : InfoDisplay,
					className : "info",
					resource : this.resource,
					info : name
				})
			}
		}
				
		if (!this.resource.bought) {
			if (this.resource.calculatedRequirements && Object.entries(this.resource.calculatedRequirements).length) tooltipData.push({
				class : MultiCost,
				className : "section",
				title : "Requirements",
				resources : this.resource.calculatedRequirements			
			})
			if (this.resource.calculatedCost && Object.entries(this.resource.calculatedCost).length) tooltipData.push({
				class : MultiCost,
				className : "section",
				title : "Cost",
				resources : this.resource.calculatedCost			
			})
		}
		
		this.game.gui.tooltip.build(tooltipData)
	}
	
	onReveal() {
		this.highlight("new")
		
		if (this.store) {
			this.container.appendChild(this.dvDisplay)
			this.store.highlight("updated")
			this.store.reveal()
		}
	}
	
	animateBuy() {
		if (this.store)
			this.store.prepareAnimation(this)
		
		if (this.resource.bought) {
			this.dvDisplay.classList.add("bought")
		}

		if (this.store)
			this.store.animateBuy(this, this.resource.bought)
	}
}

class ChamberDisplay extends ResourceDisplay {
	constructor(...data) {
		super(...data, {
			className : "chamber",
			noName : true,
			styles : [{
				name : "disabled",
				func : x => x.self.value < x._SplitCost.value
			}]
		})
		
		this.updatePosition()
		
		this.dvDisplay.appendChild(this.dvStats = createElement("div", {class : `stats`}))
		this.dvStats.appendChild(this.dvBottom = createElement("div", {class : `holder bottom`}))
		this.dvStats.appendChild(this.dvCenter = createElement("div", {class : `holder center`}))
		this.dvStats.appendChild(this.dvTop = createElement("div", {class : `holder top`}))
		
		for (let stat of gameData.chamberResources) {
			if (!stat.displayString)
				continue
			let name = camelJoin(this.name, stat.name)
			let resource = this.game.data[name]
			if (!resource) 
				continue
			
			let display = new ResourceDisplay({
				container : resource.subClass && resource.subClass == "top" ? this.dvTop : this.dvBottom,
				resource : resource
			})
							
		}
		
		this.dvDisplay.onclick = (event) => {
			if (this.resource.value < this.resource.data.splitCost.value)
				return
			
			this.resource.shootParticle()
			this.game.data.splits.add()
		}
		
		this.lastSeenValue = this.resource.value
	}
	
	updatePosition() {
		this.sheduledMove = true
		if (this.game.gui)
			this.game.gui.updatesPlanned.add(this)
	}
	
	update() {
		super.update()
		
		if (this.sheduledMove) {
			let oldLeft = this.dvDisplay.style.left
			let oldTop = this.dvDisplay.style.top
			let newLeft = this.dvDisplay.style.left = `calc(50% + ${this.resource.x}vmin)`
			let newTop = this.dvDisplay.style.top = `calc(50% + ${this.resource.y}vmin)`
			if (oldLeft && oldTop && settings.animationSmoothing && settings.targetGuiFPS < 30) {
				if (this.animation)
					this.animation.cancel()
				this.animation = this.dvDisplay.animate([{
					left : oldLeft,
					top : oldTop,
				},{
					left : newLeft,
					top : newTop
				}], 1000 / settings.targetGuiFPS)
			}
			this.sheduledMove = false
		}

		if (settings.animatePlops && this.resource.value < this.lastSeenValue)
			this.dvDisplay.animate([{
				transform: "translate(-50%, -50%) scale(1.1,1.1)"
			},{
				transform : "translate(-50%, -50%) scale(1,1)"
			}], 100)		
			
		if (settings.animatePlops && this.resource.value > this.lastSeenValue)
			this.dvDisplay.animate([{
				transform: "translate(-50%, -50%) scale(0.9,0.9)"
			},{
				transform : "translate(-50%, -50%) scale(1,1)"
			}], 100)		
			
		this.lastSeenValue = this.resource.value
	}
}

class InfoDisplay extends ResourceDisplay {
	initDisplay() {
		this.infoData = this.resource.info[this.info]
		this.displayName = this.infoData.displayName || this.info
		this.displayString = x => (this.infoData.displayString ? this.infoData.displayString(this.infoData.value) : this.infoData.value)
	}
}

class CostDisplay extends ResourceDisplay {
	constructor (...data) {
		super(...data)
		this.value = this.value || 1
		this.displayString = x => this.resource.displayString(this.value)
		this.dvDisplay.appendChild(this.dvPercent = createElement("div", {class : "percent"}))
		
		this.update()
	}
	
	updatePercentage() {
		if (!this.resource.seen || this.resource.leveled) {
			this.percentText = ""
			return
		}
		
		if (this.value > this.resource.value) {
			this.percentText = `(have ${(100 * this.resource.value / this.value).toFixed(1)}%)`
			return
		}
		
		this.percentText = `(uses ${(100 * this.value / this.resource.value).toFixed(1)}%)`
	}
	
	update() {
		super.update()
		
		this.updatePercentage()
		this.dvPercent.textContent = this.percentText
	}
}

class MultiCost {
	constructor (...data) {
		Object.assign(this, ...data)
		
		this.dvDisplay = createElement("div", {class : `${this.className?this.className:"holder"} ${this.name || ""}`})
		if (this.title)
			this.dvDisplay.appendChild(this.dvTitle = createElement("div", {class : `title`}, this.title))
		
		this.displays = new Set()
		
		for (let [name, value] of Object.entries(this.resources)) {
			let resource = this.game.data[name]
			if (!resource) {
				console.log("Can't display "+name, data)
				continue
			}
			
			let display = new CostDisplay ({
				container : this.dvDisplay,
				resource : resource,
				styles : [{
					name : "expensive",
					func : x => x.self.value < value
				}],
				forced : true,
				value
			})
			
			this.displays.add(display)
		}
		
		if (this.container)
			this.container.appendChild(this.dvDisplay)
	}
	
	destroy() {
		for (let display of this.displays)
			display.destroy()
		
		this.dvDisplay.remove()
	}
}

class MultiDisplay {
	constructor(...data) {
		Object.assign(this, ...data)

		this.dvDisplay = createElement("div", {class : `${this.className?this.className:"holder"} ${this.name || ""}`})
		this.displays = new Set()
		
		this.seen = false
		
		for (let name of this.resourceList) {
			let resource = this.game.data[name]
			if (!resource) {
				console.log("Can't display "+name, data)
				continue
			}
			
			if (resource.seen)
				this.seen = true
			
			let display = new (data.displayClass || ResourceDisplay) ({
				container : this.dvDisplay,
				resource : resource,
				showAnimation : this.elementShowAnimation,
				showChange : this.showChange,
				multiDisplay : this
			})
			
			this.displays.add(display)
		}
		
		if (!this.seen)
			this.dvDisplay.classList.add("hidden")

		if (this.container)
			this.container.appendChild(this.dvDisplay)
	}
	
	show() {
		if (this.seen) return
		
		this.seen = true
		this.dvDisplay.classList.remove("hidden")
		if (this.showAnimation)
			makeAnimation(this.dvDisplay, this.showAnimation)
	}
	
	destroy() {
		for (let display of this.displays)
			display.destroy()
		
		this.dvDisplay.remove()
	}
}

// ------------------------------------------------------------------------------------
// Specific dialogs
// ------------------------------------------------------------------------------------
class ImportDialog extends Dialog {
	constructor (...data) {
		super(...data)
		
		this.dvDisplay.appendChild(this.taText = createElement("textarea", {class : `import-area`}))
		this.dvDisplay.appendChild(this.dvButtons = createElement("div", {class : `buttons`}))
		this.dvButtons.appendChild(this.dvDecode = createElement("div", {class : `button`}, "Transcode"))
		this.dvButtons.appendChild(this.dvExport = createElement("div", {class : `button`}, "Export ▲"))
		this.dvButtons.appendChild(this.dvImport = createElement("div", {class : `button`}, "Import ▼"))	
		
		this.dvDecode.onclick = (event) => {
			try {
			if (this.taText.value.slice(-1) == "}")
				this.taText.value = btoa(compressSave(JSON.stringify(JSON.parse(this.taText.value))))
			else
				this.taText.value = JSON.stringify(JSON.parse(decompressSave(atob(this.taText.value))), null, 2)
			} catch(e) {
				console.log("Invalid data")
			}
		}
		
		this.dvExport.onclick = (event) => {
			this.game.save("exportData")
			this.taText.value = localStorage.exportData
		}

		this.dvImport.onclick = (event) => {
			localStorage.importData = this.taText.value
			this.game.load("importData")
			this.hide()
		}
	}
}

class BuyDialog extends Dialog {
	constructor (...data) {
		super(...data)
		this.dvDisplay.appendChild(this.dvStore = createElement("div", {class : `store`}))
		this.dvDisplay.appendChild(this.dvBought = createElement("div", {class : `store bought`}))
		
		this.items = new Set()
		
		for (let resource of Object.values(this.game.data)) {
			if (resource.class == this.buyClass) {
				if (resource.seen)
					this.seen = true
				
				
				let display = new StoreDisplay({
					container : resource.bought?this.dvBought:this.dvStore,
					store : this,
					game : this.game,
					styles : resource.bought?null:[{
						name : "unavailable",
						func : x => !x.self.canAfford
					}],
					showAnimation: {
						animation : [{
							backgroundColor : "rgba(0,0,0,255)",
							maxHeight : 0,
							opacity : 0
						},{
							backgroundColor : "rgba(255,255,0,1)",
							maxHeight : "5vmin",
							opacity : 0.4
						},{
							backgroundColor : Symbol.for("calculate"),
							maxHeight : "10vmin",
							opacity : 1
						}],
						time : 500
					},
					resource
				})
				
				this.items.add(display)
			}
		}
		
		if (this.seen) 
			this.reveal(true)
	}
	
	highlight(name) {
		if (this.active) 
			return
		
		let action = (event) => {
			for (let button of this.displayButtons)
				button.resetHighlight(name, action)
		}
		for (let button of this.displayButtons)
			button.highlight(name, action)
	}
	
	reveal(forced) {
		if (this.seen && !forced) 
			return
		
		this.seen = true
		this.highlight("new")
		
		for (let button of this.displayButtons) {
			button.reveal(forced)
		}
	}
	
	prepareAnimation (element) {
		this.animationData = {}
		for (let item of this.items) {
			let data = {
				x : item.dvDisplay.offsetLeft,
				y : item.dvDisplay.offsetTop
			}
			if (item == element)
				data.style = getComputedStyle(item.dvDisplay)
			this.animationData[item.resource.name] = data
		}
	}
	
	animateBuy(element, bought) {
		if (bought) {
			element.container = this.dvBought
			this.dvBought.appendChild(element.dvDisplay)
		}
		
		if (!this.animationData)
			return
		
		if (this.game.offline || document.hidden)
			return

		for (let item of this.items) {
			let data = this.animationData[item.resource.name]
			if (!data) continue
			if (item != element) {
				item.dvDisplay.animate([{
					transform : `translate(${data.x - item.dvDisplay.offsetLeft}px,${data.y - item.dvDisplay.offsetTop}px)`
				},{
					transform : `translate(0,0)`
				}],200)
			}
		}
		let data = this.animationData[element.resource.name]
		
		let startLeft = data.x - element.dvDisplay.offsetLeft
		let startTop = data.y - element.dvDisplay.offsetTop
		
		let startColor = data.style.backgroundColor
		let endColor = getComputedStyle(this.dvDisplay).backgroundColor
		let tempColor = gameData.flashColors[element.resource.target||"all"]

		let startTransform = `translate(${startLeft}px,${startTop}px) scale(1,1)`
		let tempTransform = `translate(${startLeft}px,${startTop}px) scale(2,2)`
		
		element.dvDisplay.animate([{
			transform: startTransform,
			backgroundColor: startColor,
			pointerEvents : "none",
			color: "white"
		},{
			transform: tempTransform,
			backgroundColor: tempColor,
			pointerEvents : "none",
			color: "black"
		},{
			transform: tempTransform,
			backgroundColor: endColor,
			pointerEvents : "none",
			color: "white"
		},{
			transform:`translate(0,0) scale(1,1)`,
			backgroundColor:endColor,
			pointerEvents : "none",
			color : "white"
		}], 1000)
	}
}

class SettingsDialog extends Dialog {
	constructor (...data) {
		super(...data)
		this.groups = {}
		for (let setting of gameData.settings) {
			let group = this.groups[setting.group]
			if (!group) {
				group = {
					name : setting.group,
					settings : []
				}
				this.groups[setting.group] = group
			}
			group.settings.push(setting)
		}
		
		this.dvDisplay.appendChild(this.dvGroups = createElement("div", {class : `groups`}))
		
		this.groupTabs = new Tabs({
			container : this.dvDisplay,
			tabClass : Tab,
			tabData : Object.values(this.groups).map((x,n) => ({
				name : x.name,
				displayName : x.name,
				seen : true,
				active : !n,
			})),
			showAnimation : {
				animation : [{
					transform : "scale(0,1)",
					transformOrigin : "right",
					position : "absolute"
				},{
					transform : "scale(1,1)",
					transformOrigin : "right",
					position : "absolute"
				}],
				time : 250
			},
			hideAnimation : {
				animation : [{
					transform : "scale(1,1)",
					transformOrigin : "left",
					position : "absolute"
				},{
					transform : "scale(0,1)",
					transformOrigin : "left",
					position : "absolute"
				}],
				time : 250
			}		
		})
		
		for (let [name, tab] of this.groupTabs.tabs) {
			tab.makeButton({
				container : this.dvGroups
			})
			
			for (let setting of this.groups[name].settings) {
				let display = createElement("div", {class : `switch`})
				tab.dvDisplay.appendChild(display)
				display.appendChild(createElement("div", {class : `name`}, setting.displayName))
				let choices = createElement("div", {class : `choices`})
				display.appendChild(choices)
				for (let choice of setting.choices) {
					let button = createElement("div", {class : `choice ${settings[setting.name] == choice.value?"chosen":""} ${setting.default == choice.value?"default":""}`}, choice.text || choice.value)
					choices.appendChild(button)
					button.onclick = (event) => {
						settings[setting.name] = choice.value
						if (setting.onChange)
							setting.onChange(choice.value)
						localStorage.settings = JSON.stringify(settings)
						for (let node of [...button.parentElement.childNodes])
							node.classList.toggle("chosen", node == button)
					}
				}
			}
		}
	}
}
// ------------------------------------------------------------------------------------
// Animation utility
// ------------------------------------------------------------------------------------
class ParticleSystem {
	constructor (...data) {
		this.count = 50
		this.shot = 0
		Object.assign(this, ...data)
		this.particles = []
		
		this.dvDisplay = createElement("div", {class : "particle-system"})
		
		this.addParticles(this.count)
		
		if (this.container)
			this.container.appendChild(this.dvDisplay)
		
		this.queue = new Set()
		
		this.animationPath = {
			transform : []
		}
		
		this.animationColor = [{
			backgroundColor : "transparent",
		},{
			backgroundColor : data.origin && data.origin.particleColor || "transparent",
			offset : 0.05
		},{
			backgroundColor : data.origin && data.origin.particleColor || "transparent",
			offset : 0.25
		},{
			backgroundColor : `rgb(${Math.random()*256|0},${Math.random()*256|0},${Math.random()*256|0})`,
		},{
			backgroundColor : data.target && data.target.particleColor || "transparent",
			offset : 0.75
		},{
			backgroundColor : data.target && data.target.particleColor || "transparent",
			offset : 0.95
		},{
			backgroundColor : "transparent",
		}]
	}
	
	resize (x) {
		this.addParticles(x - this.count)
		while (this.particles.length > x) this.particles.pop()
		this.count = x
	}
	
	addParticles(x) {
		if (x <= 0) 
			return
		
		for (let i = 0; i < x; i++) {
			let particle = {
				dvDisplay : createElement("div", {class : "particle"}),
				animations : []
			}
			particle.endAnimation = (event) => {
				let animation
				
/*				while (animation = particle.animations.pop()) {
					animation.cancel()
				}*/
				
				if (this.particles.length + this.shot < this.count)
					this.particles.push(particle)
				
				this.shot--
			}
			this.dvDisplay.appendChild(particle.dvDisplay)
			this.particles.push(particle)
		}
	}
	
	queueAnimateParticle(particle) {
		if (document.hidden) return false
		this.queue.add(particle)
		this.game.gui.updatesPlanned.add(this)
	}
	
	animateParticle(data) {
		if (document.hidden) return false
		
		let particle = this.particles.pop()
		
		if (!particle) return false
		
		particle.dvDisplay.style.width = particle.dvDisplay.style.height = `${data.size * 2}vmin`
		
		this.animationPath.transform[0] = `translate(${data.path[0].points[0].x-data.size}vmin,${data.path[0].points[0].y-data.size}vmin)`
		
		let points = 1

		for (let segment of data.path)
			this.animationPath.transform[points++] = `translate(${segment.points[1].x-data.size}vmin,${segment.points[1].y-data.size}vmin)`

		if (this.animationPath.transform.length > points) 
			this.animationPath.transform.splice(points, this.animationPath.transform.length)
		
		this.animationColor[1].backgroundColor = this.animationColor[2].backgroundColor = data.origin && data.origin.particleColor || "transparent",
		this.animationColor[3].backgroundColor = `rgb(${128+Math.random()*128|0},${128+Math.random()*128|0},${128+Math.random()*128|0})`,
		this.animationColor[4].backgroundColor = this.animationColor[5].backgroundColor = data.target && data.target.particleColor || "transparent",
		
		particle.dvDisplay.animate(this.animationPath, data.animationTime)
		particle.dvDisplay.animate(this.animationColor, data.animationTime).onfinish = particle.endAnimation
		
		this.shot++
		
		return true
	}
	
	update() {
		for (let particle of this.queue)
			if (!this.animateParticle(particle)) 
				break
		
		this.queue.clear()
	}
}

// ------------------------------------------------------------------------------------
// Specific tabs
// ------------------------------------------------------------------------------------
class GeneratorTab extends Tab {
	constructor(...data) {
		super(...data)
		this.dvDisplay.appendChild(this.dvChambers = createElement("div", {class : "chambers"}))
		
		for (let chamber of gameData.chambers) {
			let display = new ChamberDisplay (chamber, {
				resource : this.game.data[chamber.name],
				container : this.dvChambers,
				parent : this,
				game : this.game
			})
		}
		
		let showAnimation = {
			animation : [{
				opacity : 0
			},{
				opacity : 1
			}],
			time : 500
		}
		
		let elementShowAnimation = {
			animation : [{
				backgroundColor : "white",
				opacity : 0,
				maxHeight : 0,
			},{
				backgroundColor : "white",
				opacity : 1,
				maxHeight : "10vmin"
			},{
				backgroundColor : "transparent",
				opacity : 1,
				maxHeight : "10vmin"
			}],
			time : 500
		}
		this.multi = {
			left : new MultiDisplay({
				container : this.dvDisplay,
				className : "resources left",
				resourceList : ["energy","light","offlinium"],
				game : this.game,
				showChange : true,
				showAnimation, elementShowAnimation
			}),

			right : new MultiDisplay({
				container : this.dvDisplay,
				className : "resources right",
				resourceList : ["generatorLevel","offliniumPower","particleSpeed","totalMass","totalSplits"],
				game : this.game,
				showAnimation, elementShowAnimation
			})
		}
		
		this.buttons = {}
		
		for (let data of [{
			name : "generatorUpgrades",
			moveObject : this.multi.left.dvDisplay
		},{
			name : "plan",
			moveObject : this.multi.left.dvDisplay
		},{
			name : "generatorInteractions",
			moveObject : this.multi.right.dvDisplay
		},{
			name : "generatorInfluences",
			moveObject : this.multi.right.dvDisplay
		}]) {
			let button = this.gui.dialogs.buttonFor(data.name, {
				container : this.dvDisplay,
				moveObject : data.moveObject
			})
			
			this.buttons[data.name] = button
		}
		
		this.particles = new ParticleSystem({
			container : this.dvDisplay,
			game : this.game,
			count : 50,
		})
		
		this.game.generator.tab = this
	}
	
	animateParticle(data) {
		this.particles.queueAnimateParticle(data)
	}
}