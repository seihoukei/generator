"use strict"

function createElement (type, options, text) {
	let result = document.createElement(type)
	
	if (options) {
		for (let [attribute, value] of Object.entries(options))
			result.setAttribute(attribute, value)
	}
	
	if (text) 
		result.textContent = text
	
	return result
}

function makeAnimation (element, animationData) {
	let frames = []
	let computedStyle
	
	for (let frameData of animationData.animation) {
		let frame = {}
		for (let [name, value] of Object.entries(frameData)) {
			if (value != Symbol.for("calculate")) {
				frame[name] = value
				continue
			}
			if (!computedStyle) computedStyle = getComputedStyle(element)
			frame[name] = computedStyle[name]
		}
		frames.push(frame)
	}
	return element.animate(frames, animationData.time)
}

function getCurrentCost (costData, level) {
	let result = {}
	
	if (!costData) 
		return result
	
	for (let [name, value] of Object.entries(costData)) {
		let outValue = 0
		switch (value.constructor.name) {
			case "Number":
				outValue = value
				break
				
			case "Array":
				if (level < value.length) {
					outValue = value[level]
					break
				}
				
				let last2 = value.slice(-2)
				if (last2.length == 1 || last2[0] == 0) {
					outValue = last2.pop()
					break
				}
				
				outValue = last2[0] * (last2[1] / last2[0]) ** (level - value.length + 2)
				break
				
			case "Object":
				outValue = value.base

				if (value.add)
					outValue += value.add * level

				if (value.multiplier)
					outValue *= value.multiplier ** level
				
				break
				
			case "Function":
				outValue = value(level)
				break
		}
		if (outValue) 
			result[name] = outValue
	}

	return result
}

function randomRange(x, y) {
	return x + (y - x) * Math.random()
}

function softCap (x, max) {
	return max * (1 - Math.exp(-x / max))
}

function massCap (x, mass, step) {
	return 1 + (x - 1) / (10 ** (mass/step))
}

function camelJoin (s1, s2) {
	return s1 + s2.substr(0,1).toUpperCase() + s2.slice(1)
}

function compressSave(save) {	
	return btoa(save
			.replace(/"displayed":true/g,`#D`)
			.replace(/"seen":true/g,`#S`)
			.replace(/"value":/g,`#V`))
}

function decompressSave(save) {
	if (save.slice(-1) != "}")
		save = atob(save)

	return save
			.replace(/#D/g,`"displayed":true`)
			.replace(/#S/g,`"seen":true`)
			.replace(/#V/g,`"value":`)
}

function pluralize(value, forms, noValue = false) {
	let form = forms[value == 1?0:1]
	if (noValue)
		return form
	
	return `${value} ${form}`
}

let timeStringCodes = [{
	divisor : 1000,
	name : ["millisecond","milliseconds"]
},{
	divisor : 60,
	name : ["second","seconds"]
},{
	divisor : 60,
	name : ["minute","minutes"]
},{
	divisor : 24,
	name : ["hour","hours"]
},{
	divisor : 7,
	name : ["day","days"]
},{
	name : ["week","weeks"]
}]
function timeString(t = 0, start = 1) {
	let step = 0
	let value
	let result = ""
	
	for (let timeCode of timeStringCodes) {
		if (t == 0 && step > start) 
			break
		
		if (timeCode.divisor) {
			value = t % timeCode.divisor
			t = ~~(t /  timeCode.divisor)
		} else {
			value = t
		}
		
		if (step >= start && value) 
			result = `${pluralize(value,timeCode.name)}${result?" ":""}${result}`
		
		step++
	}
	return result
}

const displayValueTempLength = 5, displayValueRoundFix = 0.4999999 / 10 ** displayValueTempLength
function toFixed(value, digits) {
	let trailingZeroes = digits >= 0
	digits = Math.abs(digits)
	value = Math.abs(value-displayValueRoundFix)
	let displayValue = value.toFixed(5).slice(0,digits - displayValueTempLength - (digits?0:1))
	return trailingZeroes?displayValue:displayValue.replace(/\.?0+$/, "")
}

let positiveOrders = [
	["",	" K",	" M",	" G",	" T",	" P",	" E",	" Z",	" Y"],
	["",	"K",	"M",	"B",	"T",	"Qa",	"Qi",	"Sx",	"Sp",	"Oc",	"No",
			"Dc",	"Ud",	"Dd",	"Td",	"Qad",	"Qid",	"Sxd",	"Spd",	"Ocd",	"Nod",
			"Vg",	"Uvg",	"Dvg",	"Tvg",	"Qavg",	"Qivg",	"Sxvg",	"Spvg",	"Ocvg",	"Novg",
			"Tg",	"Utg",	"Dtg",	"Ttg",	"Qatg",	"Qitg",	"Sxtg",	"Sptg",	"Octg",	"Notg"]]
			
let negativeOrders = [
	["",	" m",	" µ",	" n",	" p",	" f",	" a",	" z",	" y"],
	[""]]

function displayNumber(value, digits = -1, units = "", minimum = 1e-308) {
	if (digits == -1)
		digits = settings.numberPrecision
	
	let minus = value < 0 ? "-" : ""
	value = Math.abs(value)
	
	
	if (value < minimum || value >= settings.numberMin && value < settings.numberMax)
		return minus + toFixed(value, digits) + (units ? " " + units : "")
			
	let order = Math.floor(Math.log10(value))

	let order3 = Math.floor(order / 3)
	if (settings.numberFormat == 0) {//natural
		let prefix = (order3 > 0 ? positiveOrders : negativeOrders)[units?0:1][Math.abs(order3)]
		if (prefix !== undefined) {
			order3 *= 3
			value *= 10 ** -order3
		
			return `${minus}${toFixed(value, settings.numberPrecision)}${prefix}${units||""}`
		}
	}
	
	if (settings.numberFormat != 1)
		order = order3 * 3
	
	value *= 10 ** -order
	
	let prefix = ""
	if (order)
		switch (settings.numberDelimiter) {
			case 0:
				prefix = `e${order}`
				break
			case 1:
				prefix = `e${order>0?"+":""}${order}`
				break
			case 2:
				prefix = `×10${superScript(order)}`
				break
		}
		
	return `${minus}${toFixed(value, settings.numberPrecision)}${prefix}${units?" ":""}${units||""}`
}

let superScripts = "⁰¹²³⁴⁵⁶⁷⁸⁹"
function superScript(n) {
	if (n == 0) return "⁰"
	let result = ""
	let k = ~~(n > 0 ? n : -n)
	while (k > 0) {
		result = superScripts[k%10] + result
		k = ~~(k / 10)
	}
	return n > 0 ? result : ("⁻" + result)
}