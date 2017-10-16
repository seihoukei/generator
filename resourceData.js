"use strict"

let gameData

(() => {
	// Basic reveal functions
	
	function moreThan(value) {
		return x => x.self.value > value
	}
	
	function lessThan(value) {
		return x => x.self.value < value
	}
	
	function notEqual(value) {
		return x => x.self.value != value
	}
	
	// Basic display functions
	
	function normal(digits, units = "", minimum) {
		return x => `${displayNumber(x,digits,units,minimum)}`
	}
	
	function percent(digits) {
		return x => `${displayNumber(x*100,digits,"",1)}%`
	}
	
	gameData = {
		
		flashColors : {
			all : "#FFFF7F",
			red : "#FF7F7F",
			green : "#7FFF7F",
			blue : "#7F7FFF"
		},
		
		resources : [{
			
		// Global resources
			class : Resource,
			name : "offlinium",
			displayName : "Offlinium",
			displayString : normal(2,"",1),
			displayRequirement : moreThan(0),
		},{
			class : Resource,
			name : "generatorOutput",
			displayName : "Energy output",
			displayString : normal(2,"W"),
			displayRequirement : moreThan(0),
			units : "W"
		},{
			
		// Generator Resources
			class : Resource,
			name : "energy",
			displayName : "Energy",
			displayString : normal(2,'J'),
			displayRequirement : moreThan(0),
			units : "J",
		},{
			class : Resource,
			name : "light",
			displayName : "Light",
			displayString : normal(2,'L'),
			displayRequirement : moreThan(0),
			units : "L",
		},{
			class : Resource,
			name : "splits"
		},{
			class : Resource,
			name : "autoSplits",
		},{
			class : Resource,
			name : "movePhase",
		},{
			class : Resource,
			name : "moveSpeed",
		},{
			
		// Global stats
			class : Stat,
			name : "offliniumPower",
			displayName : "Offlinium boost",
			displayString : x => `×${x}`,
			displayRequirement : moreThan(2),
			dependencies : ["offliniumLevel", "offlinium"],
			valueFunction : x => 2 ** (x.offliniumLevel.value + 1),
			value : 2
		},{
		

		// Generator stats 
			class : Stat,
			name : "massCapStep",
			dependencies : ["generatorLevel"],
			valueFunction : x => {
				return 10 ** (0.5 * (1 + x.generatorLevel.value))
			}
		},{
			class : Stat,
			name : "particleSpeed",
			displayName : "Particle speed",
			displayString : normal(2),
			displayRequirement : moreThan(1),
			dependencies : ["particleAcceleration"],
			valueFunction : x => {
				return 1.7 ** x.particleAcceleration.value
			}
		},{
			class : Stat,
			name : "totalMass",
			displayName : "Total mass",
			displayString : normal(2),
			displayRequirement : notEqual(30),
			dependencies : ["red", "green", "blue"],
			valueFunction : x => {
				return x.red.fullMass() + x.green.fullMass() + x.blue.fullMass()
			}
		},{
			class : Stat,
			name : "totalSplits",
			displayName : "Total splits",
			displayString : normal(0),
			displayRequirement : moreThan(1000),
			dependencies : ["splits","autoSplits"],
			valueFunction : (x) => {
				return x.splits.value + x.autoSplits.value
			}
		},{

		//Global Upgrades
			class : GlobalUpgrade,
			name : "offliniumLevel",
			displayName : "Offlinium level",
			displayHint : "Each level doubles effect of offlinium",
			displayRequirements : {
				offlinium : 3600
			},
			cost : {
				offlinium : {
					baseValue : 3600,
					multiplier : 2
				}
			},
			max : 4
		},{
			class : GlobalUpgrade,
			name : "generatorLevel",
			displayName : "Generator level",
			displayHint : "Replaces generator with a new, more flexible and productive one. YOU WILL LOSE ALL YOUR GENERATOR PROGRESS. GENERATOR OUTPUT WILL BE RESET TO ZERO.",
			displayRequirements : {
				generatorOutput : 1e-6,
			},
			max : 5
		},{

		//Generator Upgrades
			class : GeneratorUpgrade,
			name : "redUnstability",
			displayName : "Redium unstability",
			displayHint : "Make red core much more unstable",
			displayRequirements : {
				allUnstability : 1
			},
			requirements : {
				generatorLevel : [0, 0, 2, 0],
				green : [0, 5, 25, 50],
				blue : [0, 5, 25, 50],
				red : [25, 0, 0, 0]
			},
			cost : {
				red : [0, 5, 25, 100],
				energy : [75e-9, 750e-9, 2500e-9, 20000e-9]
			},
			target : "red",
			max : 4
		},{
			class : GeneratorUpgrade,
			name : "greenUnstability",
			displayName : "Greenium unstability",
			displayHint : "Make green core much more unstable",
			displayRequirements : {
				allUnstability : 1
			},
			requirements : {
				generatorLevel : [0, 0, 2, 0],
				red : [0, 5, 35, 200],
				blue : [0, 5, 35, 200],
				green : [25, 0, 0, 0]
			},
			cost : {
				green : [0, 5, 35, 400],
				energy : [125e-9, 1250e-9, 4000e-9, 80000e-9]
			},
			target : "green",
			max : 4
		},{
			class : GeneratorUpgrade,
			name : "blueUnstability",
			displayName : "Bluite unstability",
			displayHint : "Make blue core much more unstable",
			displayRequirements : {
				allUnstability : 1
			},
			requirements : {
				generatorLevel : [0, 0, 2, 0],
				red : [0, 5, 30, 150],
				green : [0, 5, 30, 150],
				blue : [25, 0, 0, 0]
			},
			cost : {
				blue : [0, 5, 30, 300],
				energy : [100e-9, 1000e-9, 3250e-9, 50000e-9]
			},
			target : "blue",
			max : 4
		},{
			class : GeneratorUpgrade,
			name : "allUnstability",
			displayName : "Unstability",
			displayHint : "Unstable cores have a low chance to spontaneously emit particles",
			displayRequirements : {
				energy : 50e-9
			},
			info : {
				currentBonus : {
					displayName : "Current stability reduction",
					valueFunction : (x) => x.self.value * (x.self.value + 1) * 0.0005,
					displayString : percent(1)
				},				
				nextBonus : {
					displayName : "Next level stability reduction",
					valueFunction : (x) => (x.self.value + 2) * (x.self.value + 1) * 0.0005,
					boughtHide : true,
					displayString : percent(1)
				}
			},
			requirements : {
				generatorLevel : [0,2,0,0,0,2,0,0,0,0],
				red : { 
					base : 10,
					multiplier : 2
				},
				green : { 
					base : 10,
					multiplier : 2
				},
				blue : { 
					base : 10,
					multiplier : 2
				}
			},
			cost : {
				energy : {
					base : 75e-9,
					multiplier : 5
				}
			},
			max : 10
		},{
			class : GeneratorUpgrade,
			name : "particleAcceleration",
		},{
			class : GeneratorUpgrade,
			name : "allPower",		
		},{
			class : GeneratorUpgrade,
			name : "redPower",		
		},{
			class : GeneratorUpgrade,
			name : "greenPower",		
		},{
			class : GeneratorUpgrade,
			name : "bluePower",		
		},{
			class : GeneratorUpgrade,
			name : "allAutoSplit",		
		},{
			class : GeneratorUpgrade,
			name : "redAutoSplit",		
		},{
			class : GeneratorUpgrade,
			name : "greenAutoSplit",		
		},{
			class : GeneratorUpgrade,
			name : "blueAutoSplit",		
		},{
			class : GeneratorUpgrade,
			name : "allSplit",		
		},{
			class : GeneratorUpgrade,
			name : "redSplit",		
		},{
			class : GeneratorUpgrade,
			name : "greenSplit",		
		},{
			class : GeneratorUpgrade,
			name : "blueSplit",		
		},{
			class : GeneratorUpgrade,
			name : "allChain",		
		},{
			class : GeneratorUpgrade,
			name : "redChain",		
		},{
			class : GeneratorUpgrade,
			name : "greenChain",		
		},{
			class : GeneratorUpgrade,
			name : "blueChain",		
		},{
			class : GeneratorUpgrade,
			name : "allLight",		
		},{
			class : GeneratorUpgrade,
			name : "basicInteractions",		
		},{
			class : GeneratorUpgrade,
			name : "basicInfluences",		
		},{
			class : GeneratorUpgrade,
			name : "advancedInteractions",		
		},{
			class : GeneratorUpgrade,
			name : "advancedInfluences",		
		},{
			class : GeneratorInteraction,
			name : "basicRed1",
		},{
			class : GeneratorInteraction,
			name : "basicBlue1",
		},{
			class : GeneratorInteraction,
			name : "basicGreen1",
		},{
			class : GeneratorInteraction,
			name : "basicAll1",
		},{			
			class : GeneratorInteraction,
			name : "advancedRed1",
		},{
			class : GeneratorInteraction,
			name : "advancedBlue1",
		},{
			class : GeneratorInteraction,
			name : "advancedGreen1",
		},{
			class : GeneratorInteraction,
			name : "advancedAll1",
		},{			
			class : GeneratorInfluence,
			name : "boostUnstability",
		}],
		
		chamberResources : [{			
			class : Stat,
			name : "splitCost",
			displayName : "Split Cost",
			displayString : normal(2),
			subClass : "bottom",
			seen : true,
			value : 0,
			dependencies : ["allSplit","_Split"],
			valueFunction : (x) => {
				return 7 ** (0.5 * (x.allSplit.value + x._Split.value))
			}
		},{
			class : Stat,
			name : "stability",
			displayName : "Stability",
			displayString : percent(1),
			displayRequirement : lessThan(1),
			subClass : "top",
			dependencies : ["allUnstability", "_Unstability", "boostUnstability"],
			valueFunction : x => {
				let result = 1
				
				result -= x.allUnstability.value * (x.allUnstability.value + 1) * 0.0005
				result -= x._Unstability.value ** 1.5 * 0.01
				if (x.boostUnstability.active) {
					result -= softCap(1.1 ** x.boostUnstability.value, 20) / 100
				}
				
				if (result < 0) 
					result = 0
				
				return result
			}
		},{
			class : Stat,
			name : "autoSplitCost",
			displayName : "Autosplit amount",
			displayString : normal(2),
			displayRequirement : moreThan(1),
			subClass : "top",
			dependencies : ["allAutoSplit","_AutoSplit"],
			valueFunction : x => {
				let result = 1
				
				result *= 5 ** (x.allAutoSplit.value / 2)
				result *= 5 ** (x._AutoSplit.value / 2)
				
				return result
			}
		},{
			class : Stat,
			name : "splitPower",
			displayName : "Split power",
			displayString : normal(2),
			displayRequirement : moreThan(1),
			subClass : "bottom",
			dependencies : ["allPower","_Power"],
			valueFunction : x => {
				let result = 1
				
				result *= 1.2 ** (x.allPower.value / 2)
				result *= 1.25 ** (x._Power.value / 2)
				
				return result
			}
		},{
			class : Stat,
			name : "chainChance",
			displayName : "Chain chance",
			displayString : percent(1),
			displayRequirement : moreThan(0),
			subClass : "bottom",
			dependencies : ["allChain","_Chain"],
			valueFunction : x => {
				let result = 0
				
				result += softCap(x.allChain.value * 0.15, 0.5)
				result += softCap(x._Chain * 0.25, 0.5)

				result = softCap(result, 1)
				
				return result
			}
		},{
			class : Stat,
			name : "photonChance",
			displayName : "Photon chance",
			displayString : percent(1),
			displayRequirement : moreThan(0),
			subClass : "top",
			dependencies : ["allLight"],
			valueFunction : x => {
				return (2 ** x.allLight.value - 1) / 100
			}
		}],
		
		chambers : [{
			name : "red",
			displayName : "Redium",
			displayString : normal(2,"",1),
			dependencies : ["_SplitCost"],
			value : 10,
			x0 : 0,
			y0 : 7,
			r : 22.5,
			cos : Math.cos(-Math.PI / 2),
			sin : Math.sin(-Math.PI / 2),
			orbitRadius : 33,
			phaseShift : 0,
			seen : true,
			particleColor : "#BB0000"
		},{
			name : "green",
			displayName : "Greenium",
			displayString : normal(2,"",1),
			dependencies : ["_SplitCost"],
			value : 10,
			x0 : 0,
			y0 : 7,
			r : 22.5,
			cos : Math.cos(Math.PI / 6),
			sin : Math.sin(Math.PI / 6),
			orbitRadius : 33,
			phaseShift : 2 * Math.PI / 6,
			seen : true,
			particleColor : "#008800"
		},{
			name : "blue",
			displayName : "Bluite",
			displayString : normal(2,"",1),
			dependencies : ["_SplitCost"],
			value : 10,
			x0 : 0,
			y0 : 7,
			r : 22.5,
			cos : Math.cos(5 * Math.PI / 6),
			sin : Math.sin(5 * Math.PI / 6),
			orbitRadius : 33,
			phaseShift : 4 * Math.PI / 6,
			seen : true,
			particleColor : "#0000DD"
		}],
		
		guiData : {
			elementData : [{
				name : "dialogs",
				class : Tabs,
				allowNone : true,
				data : {
					autoClose : true,
					tabClass : Dialog,
					tabData: [{
						name : "generatorUpgrades",
						displayName : "Upgrades",
						class : BuyDialog,
						buyClass : GeneratorUpgrade
					}, {
						name: "generatorInteractions",
						displayName : "Interactions",
						class : BuyDialog,
						buyClass : GeneratorInteraction
					}, {
						name: "generatorInfluences",
						displayName : "Influences",
						class : BuyDialog,
						buyClass : GeneratorInfluence
					}, {
						name: "settings",
						displayName : "Settings",
						class : SettingsDialog
					}, {
						name: "plan",
						displayName : "Plan"
					}, {
						name: "import",
						class: ImportDialog,
						displayName : "Import / export game"
					}],
					showAnimation: {
						animation : [{
							transform : "scale(0,0)"
						},{
							transform : "scale(1,1)"
						}],
						time : 300
					},
					hideAnimation: {
						animation : [{
							transform : "scale(1,1)"
						},{
							transform : "scale(0,0)"
						}],
						time : 300
					},
				}
			},{
				name : "tabs",
				class : Tabs,
				data : {
					tabClass : Tab,
					tabData: [{
						name : "generator",
						displayName : "Generator",
						class : GeneratorTab,
					}, {
						name: "pcroom",
						displayName : "PC Room"
					}],
					showAnimation: {
						animation : [{
							left : "100vw"
						},{
							left : "0"
						}],
						time : 250
					},
					hideAnimation: {
						animation : [{
							left : "0"
						},{
							left : "-100vw"
						}],
						time : 250
					}
				}
			},{
				name : "menu",
				class : Menu,
				data : {
					items: [
					
						new MenuItem({
							displayName : "Import / export game",
							action : () => {
								game.gui.dialogs.show("import")
							}
						}), 
						
						new MenuItem({
							displayName : "Save game",
							items : [
								new MenuSaveSlot("Autosave","autoSave"),
								new MenuSaveSlot("Save 1","saveData1"),
								new MenuSaveSlot("Save 2","saveData2"),
								new MenuSaveSlot("Save 3","saveData3")
							]
						}), 
						
						new MenuItem({
							displayName : "Load game",
							items : [
								new MenuLoadSlot("Autosave","autoSave"),
								new MenuLoadSlot("Save 1","saveData1"),
								new MenuLoadSlot("Save 2","saveData2"),
								new MenuLoadSlot("Save 3","saveData3")
							]
						}), 
						
						new MenuItem({
							displayName : "Reset game",
							action : () => {
								game.reset()
							}
						}), 
						
						new MenuItem({
							displayName : "Settings",
							action : () => {
								game.gui.dialogs.show("settings")
							}
						})
					]
				}
			},{
				name : "notifications",
				class : Notifications,
				data : {
					max : 10
				}
			},{
				name : "tooltip",
				class : Tooltip,
				data : {
				}
			}]
		}, 
		
		settings : [{
			name : "numberFormat",
			group : "Numbers",
			displayName : "Short number format",
			default : 0,
			choices : [{
				text : "Natural",
				value : 0
			}, {
				text : "Scientific",
				value : 1
			}, {
				text : "Engineering",
				value : 2
			}]
		}, {
			name : "numberDelimiter",
			group : "Numbers",
			displayName : "Scientific number display",
			default : 0,
			choices : [{
				text : "1.23e6",
				value : 0
			},{
				text : "1.23e+6",
				value : 1
			},{
				text : "1.23×10⁶",
				value : 2
			}]
		}, {
			name : "numberMax",
			group : "Numbers",
			displayName : "Upper bound for full numbers",
			default : 1000,
			choices : [{
				value : 1
			},{
				value : 1000
			},{
				value : 1000000
			},{
				value : 1000000000
			}]
		}, {
			name : "numberMin",
			group : "Numbers",
			displayName : "Lower bound for full numbers",
			default : 0.01,
			choices : [{
				value : 1
			},{
				value : 0.1
			},{
				value : 0.01
			},{
				value : 0.001
			}]
		}, {
			name : "numberPrecision",
			group : "Numbers",
			displayName : "Precision of short numbers",
			default : 2,
			choices : [{
				text : "12M",
				value : 0
			},{
				text : "12.3M",
				value : 1
			},{
				text : "12.34M",
				value : 2
			},{
				text : "12.345M",
				value : 3
			}]
		}, {
			name : "maxParticles",
			group : "Animations",
			displayName : "Maximum number of particles on screen",
			default : 50,
			choices : [{
				text : "None",
				value : 0
			},{
				value : 10
			},{
				value : 50
			},{
				value : 250
			}],
			onChange : (x) => {
				game.generator.tab.particles.resize(x)
			}
		}, {
			name : "animatePlops",
			group : "Animations",
			displayName : "Animate cores emitting / receiving particles",
			default : 1,
			choices : [{
				text : "On",
				value : 1
			},{
				text : "Off",
				value : 0
			}]
		}, {
			name : "animationSmoothing",
			group : "Animations",
			displayName : "Stop motion smoothing",
			default : 1,
			choices : [{
				text : "On",
				value : 1
			},{
				text : "Off",
				value : 0
			}]
		}, {
			name : "targetGameFPS",
			group : "Performance",
			displayName : "Game processing speed (target data FPS)",
			default : 60,
			choices : [{
				value : 10
			},{
				value : 20
			},{
				value : 30
			},{
				value : 45
			},{
				value : 60
			}],
			onChange : (value) => {
				game.setTargetFPS(value)
				worker.postMessage({
					name : "setFPS",
					value
				})
			}
		}, {
			name : "targetGuiFPS",
			group : "Performance",
			displayName : "Display refresh speed (target UI FPS)",
			default : 20,
			choices : [{
				value : 1
			},{
				value : 10
			},{
				value : 20
			},{
				value : 30
			},{
				value : 45
			},{
				value : 60
			}]
		}]
	}
})()