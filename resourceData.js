"use strict"

let gameData

;(() => {
	
	const sequences = {
		allUnstability : [0, 0.1, 0.5, 1.5, 2.5, 4, 8, 13, 19, 25],
		_Unstability : [0, 1, 3, 6, 10, 18, 28, 44, 59, 75]
	}
	
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
			class : GlobalResource,
			name : "offlinium",
			displayName : "Offlinium",
			displayString : normal(2,"",1),
			displayRequirement : moreThan(0),
		},{
			class : GlobalResource,
			name : "generatorOutput",
			displayName : "Energy output",
			displayString : normal(2,"W"),
			displayRequirement : moreThan(0),
			units : "W"
		},{
			
		// Generator Resources
			class : GeneratorResource,
			name : "energy",
			displayName : "Energy",
			displayString : normal(2,'J'),
			displayRequirement : moreThan(0),
			units : "J",
		},{
			class : GeneratorResource,
			name : "light",
			displayName : "Light",
			displayString : normal(2,'L'),
			displayRequirement : moreThan(0),
			units : "L",
		},{
			class : GeneratorResource,
			name : "splits",
			displayName : "Manual splits",
		},{
			class : GeneratorResource,
			name : "autoSplits",
			displayName : "Automatic splits",
		},{
			class : GeneratorResource,
			name : "movePhase",
		},{
			
		// Global stats
			class : GlobalStat,
			name : "offliniumPower",
			displayName : "Offlinium boost",
			displayString : x => `×${x}`,
			displayRequirement : moreThan(2),
			dependencies : ["offliniumLevel", "offlinium"],
			valueFunction : x => 2 ** (x.offliniumLevel.value + 1),
			value : 2
		},{
		

		// Generator stats 
			class : GeneratorStat,
			name : "massCapStep",
			dependencies : ["generatorLevel"],
			valueFunction : x => {
				return 10 ** (x.generatorLevel.value + 1)
			}
		},{
			class : GeneratorStat,
			name : "particleSpeed",
			displayName : "Particle speed",
			displayString : normal(2),
			displayRequirement : moreThan(1),
			dependencies : ["particleAcceleration"],
			valueFunction : x => {
				return 2 ** (0.5 * x.particleAcceleration.value)
			}
		},{
			class : GeneratorStat,
			name : "totalMass",
			displayName : "Total mass",
			displayString : normal(2),
			displayRequirement : notEqual(30),
			dependencies : ["red", "green", "blue"],
			valueFunction : x => {
				return x.red.fullMass() + x.green.fullMass() + x.blue.fullMass()
			}
		},{
			class : GeneratorStat,
			name : "totalSplits",
			displayName : "Total splits",
			displayString : normal(0),
			displayRequirement : moreThan(1000),
			dependencies : ["splits","autoSplits"],
			valueFunction : (x) => {
				return x.splits.value + x.autoSplits.value
			}
		},{
			class : GeneratorStat,
			name : "moveSpeed",
			displayName : "Core speed",
			displayString : normal(2),
			displayRequirement : moreThan(0),
			dependencies : ["coreMovement"],
			valueFunction : (x) => {
				return x.coreMovement.value ** 2 * 1e-2
			}
		},{
			class : GeneratorStat,
			name : "generatorBoost",
			displayName : "Feedback boost",
			displayString : x => `×${normal(2)(x)}`,
			displayRequirement : moreThan(1),
			dependencies : ["energyFeedback"],
			valueFunction : (x) => {
				return 1 + 0.05 * x.energyFeedback.value
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
			max : 4
		},{

		//Generator Upgrades
			class : GeneratorUpgrade,
			name : "allUnstability",
			displayName : "Unstability",
			displayHint : "Unstable cores have a low chance to spontaneously emit particles",
			displayRequirements : {
				energy : 20e-9
			},
			info : {
				currentBonus : {
					displayName : "Current stability reduction",
					valueFunction : (x) => sequences.allUnstability[x.self.value] * 1e-2,
					displayString : percent(1)
				},				
				nextBonus : {
					displayName : "Next level stability reduction",
					valueFunction : (x) => sequences.allUnstability[x.self.value+1] * 1e-2,
					boughtHide : true,
					displayString : percent(1)
				}
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				red :   [10, 10, 17, 35, 50, 0],
				green : [10, 10, 17, 35, 50, 0],
				blue :  [10, 10, 17, 35, 50, 0],
			},
			cost : {
				energy : [50e-9, 200e-9, 2000e-9, 50e-6, 1100e-6, 0]
			},
			max : 9
		},{
			class : GeneratorUpgrade,
			name : "redUnstability",
			displayName : "Redium unstability",
			displayHint : "Make red core much more unstable",
			displayRequirements : {
				allUnstability : 1
			},
			info : {
				currentBonus : {
					displayName : "Current stability reduction",
					valueFunction : (x) => sequences._Unstability[x.self.value] * 1e-2,
					displayString : percent(1)
				},				
				nextBonus : {
					displayName : "Next level stability reduction",
					valueFunction : (x) => sequences._Unstability[x.self.value + 1] * 1e-2,
					boughtHide : true,
					displayString : percent(1)
				}
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				red :   [20, 0, 0, 0, 0, 0],
				green : [0, 5, 25, 50, 250, 0],
				blue :  [0, 5, 25, 50, 250, 0],
			},
			cost : {
				red : [0, 5, 25, 50, 250, 0],
				energy : [50e-9, 750e-9, 50e-6, 1000e-6, 10e-3, 0]
			},
			target : "red",
			max : 9
		},{
			class : GeneratorUpgrade,
			name : "greenUnstability",
			displayName : "Greenium unstability",
			displayHint : "Make green core much more unstable",
			displayRequirements : {
				allUnstability : 1
			},
			info : {
				currentBonus : {
					displayName : "Current stability reduction",
					valueFunction : (x) => sequences._Unstability[x.self.value] * 1e-2,
					displayString : percent(1)
				},				
				nextBonus : {
					displayName : "Next level stability reduction",
					valueFunction : (x) => sequences._Unstability[x.self.value + 1] * 1e-2,
					boughtHide : true,
					displayString : percent(1)
				}
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				red :   [0, 5, 25, 60, 300, 0],
				green : [20, 0, 0, 0, 0, 0],
				blue :  [0, 5, 25, 60, 300, 0],
			},
			cost : {
				green : [0, 5, 30, 65, 350, 0],
				energy : [100e-9, 1250e-9, 100e-6, 1500e-6, 15e-3, 0]
			},
			target : "green",
			max : 9
		},{
			class : GeneratorUpgrade,
			name : "blueUnstability",
			displayName : "Bluite unstability",
			displayHint : "Make blue core much more unstable",
			displayRequirements : {
				allUnstability : 1
			},
			info : {
				currentBonus : {
					displayName : "Current stability reduction",
					valueFunction : (x) => sequences._Unstability[x.self.value] * 1e-2,
					displayString : percent(1)
				},				
				nextBonus : {
					displayName : "Next level stability reduction",
					valueFunction : (x) => sequences._Unstability[x.self.value + 1] * 1e-2,
					boughtHide : true,
					displayString : percent(1)
				}
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				red :   [0, 5, 25, 55, 280, 0],
				green : [0, 5, 25, 55, 280, 0],
				blue :  [20, 0, 0, 0, 0, 0],
			},
			cost : {
				blue : [0, 5, 27.5, 60, 300, 0],
				energy : [75e-9, 1000e-9, 75e-6, 1250e-6, 13e-3, 0]
			},
			target : "blue",
			max : 9,
		},{
			class : GeneratorUpgrade,
			name : "particleAcceleration",
			displayName : "Particle acceleration",
			displayHint : "Particles move faster and produce more energy",
			displayRequirements: {
				energy : 50e-9
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				totalMass : [0, 40, 125, 400, 4000, 0],
			},
			cost : {
				energy : [75e-9, 1500e-9, 250e-6, 6e-3, 300e-3, 0],
				red :   [0, 5, 40, 140, 1500, 0],
				green : [0, 5, 30, 120, 1200, 0],
				blue :  [0, 5, 20, 100, 1000, 0],
			},
			info : {
				currentBonus : {
					displayName : "Current particle speed",
					valueFunction : (x) => 2 ** (0.5 * x.self.value),
					displayString : normal(2)
				},				
				nextBonus : {
					displayName : "Next level particle speed",
					valueFunction : (x) => 2 ** (0.5 * (x.self.value + 1)),
					boughtHide : true,
					displayString : normal(2)
				}
			},
		},{
			class : GeneratorUpgrade,
			name : "allPower",
			displayName : "Power amplification",
			displayHint : "Particles provide more energy and mass upon landing",
			displayRequirements : {
				energy : 100e-9
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				totalMass : [0, 60, 120, 180, 0]
			},
			cost : {
				energy : [250e-9, 2500e-9, 75e-6, 2250e-6, 25e-3, 0],
				red :   [5, 15, 30, 50, 250, 0],
				green : [5, 15, 30, 50, 250, 0],
				blue :  [5, 15, 30, 50, 250, 0]
			}
		},{
			class : GeneratorUpgrade,
			name : "redPower",		
			displayName : "Redium power",
			displayHint : "Particles from red core provide more energy and mass upon landing",
			displayRequirements : {
				allPower : 2,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				red :  [30, 50, 70, 500, 1500, 0]
			},
			cost : {
				energy : [13e-6, 1400e-6, 15e-3, 160e-3, 1700e-3, 0],
				green : [60, 115, 170, 700, 1800, 0],
				blue :  [35, 60, 85, 600, 1600, 0],
			}
		},{
			class : GeneratorUpgrade,
			name : "greenPower",		
			displayName : "Greenium power",
			displayHint : "Particles from green core provide more energy and mass upon landing",
			displayRequirements : {
				allPower : 2,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				green :  [25, 45, 65, 450, 1350, 0]
			},
			cost : { 
				energy : [12e-6, 1250e-6, 13e-3, 140e-3, 1450e-3, 0],
				blue : [55, 110, 165, 650, 1750, 0],
				red :  [30, 55, 80, 550, 1500, 0],
			}
		},{
			class : GeneratorUpgrade,
			name : "bluePower",		
			displayName : "Bluite power",
			displayHint : "Particles from blue core provide more energy and mass upon landing",
			displayRequirements : {
				allPower : 2,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				blue :  [20, 40, 60, 400, 1200, 0]
			},
			cost : {
				energy : [10e-6, 1000e-6, 10e-3, 100e-3, 1300e-3, 0],
				red :   [50, 100, 150, 600, 1600, 0],
				green : [25, 50, 75, 500, 1300, 0],
			}
		},{
			class : GeneratorUpgrade,
			name : "allAutoSplit",
			displayName : "Massive emission",
			displayHint : "Unstable cores emit more mass at once",
			displayRequirements : {
				autoSplits : 2500
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				totalMass : [75, 125, 250, 2500, 7500, 0],
			}, 
			cost : {
				energy : [17500e-9, 150e-6, 7000e-6, 80e-3, 900e-3, 0]
			}
		},{
			class : GeneratorUpgrade,
			name : "redAutoSplit",		
			displayName : "Redium emission",
			displayHint : "Unstable red core emits more mass at once",
			displayRequirements : {
				allAutoSplit : 2,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				red : [100, 200, 700, 1600, 4000, 0],
				totalMass : [200, 400, 2000, 5000, 10000, 0],
			}, 
			cost : {
				energy : [250e-6, 2500e-6, 50e-3, 500e-3, 5, 0]
			}
		},{
			class : GeneratorUpgrade,
			name : "greenAutoSplit",		
			displayName : "Greenium emission",
			displayHint : "Unstable green core emits more mass at once",
			displayRequirements : {
				allAutoSplit : 2,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				green : [150, 250, 1000, 2500, 7000, 0],
				totalMass : [250, 450, 3000, 8000, 15000, 0],
			}, 
			cost : {
				energy : [500e-6, 5000e-6, 100e-3, 1000e-3, 10, 0]
			}
		},{
			class : GeneratorUpgrade,
			name : "blueAutoSplit",		
			displayName : "Bluite emission",
			displayHint : "Unstable blue core emits more mass at once",
			displayRequirements : {
				allAutoSplit : 2,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				blue : [125, 225, 850, 2000, 5000, 0],
				totalMass : [225, 425, 1500, 6500, 12500, 0],
			}, 
			cost : {
				energy : [400e-6, 4000e-6, 75e-3, 750e-3, 8, 0]
			}
		},{
			class : GeneratorUpgrade,
			name : "allSplit",		
			displayName : "Massive splits",
			displayHint : "Manual splits produce bigger particles",
			displayRequirements : {
				splits : 100,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				totalMass : [0, 50, 200, 1000, 4000, 0]
			},
			cost : {
				energy : [200e-9, 10e-6, 2e-3, 20e-3, 300e-3, 0]
			}
		},{
			class : GeneratorUpgrade,
			name : "redSplit",		
			displayName : "Redium splits",
			displayHint : "Red core splits produce bigger particles",
			displayRequirements : {
				allSplit : 2,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				totalMass : [50, 200, 500, 1000, 5000, 0]
			},
			cost : {
				energy : [50e-6, 1000e-6, 5e-3, 25e-3, 500e-3, 0]
			}
		},{
			class : GeneratorUpgrade,
			name : "greenSplit",		
			displayName : "Greenium splits",
			displayHint : "Green core splits produce bigger particles",
			displayRequirements : {
				allSplit : 2,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				totalMass : [50, 200, 500, 1000, 5000, 0]
			},
			cost : {
				energy : [75e-6, 1250e-6, 6e-3, 30e-3, 800e-3, 0]
			}
		},{
			class : GeneratorUpgrade,
			name : "blueSplit",		
			displayName : "Bluite splits",
			displayHint : "Blue core splits produce bigger particles",
			displayRequirements : {
				allSplit : 2,
			},
			requirements : {
				generatorLevel : [0, 0, 0, 0, 0, 2, 0, 3, 0, 4],
				totalMass : [50, 200, 500, 1000, 5000, 0]
			},
			cost : {
				energy : [60e-6, 1100e-6, 5.5e-3, 27.5e-3, 650e-3, 0]
			}
		},{
			class : GeneratorUpgrade,
			name : "energyOutput",
			displayName : "Energy output",
			displayHint : "Redirect produced energy to somewhere else",
			displayRequirements : {
				energy : 1e-3
			},
			cost : {
				energy : 5e-3,
				red : 100,
				green : 100,
				blue : 100,
			},
			action : () => {
				game.unlock("plan")
			},
			max : 1
		},{
			class : GeneratorUpgrade,
			name : "energyFeedback",
			displayName : "Energy feedback",
			displayHint : "Improves overall energy production by 5% per level",
			displayRequirements : {
				energyOutput : 1
			},
			cost : {
				energy : {
					base : 100e-3,
					multiplier : 1.5
				}
			}
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
			name : "coreMovement",
			max : 5
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
			class : GeneratorStat,
			name : "splitCost",
			displayName : "Split Cost",
			displayString : normal(2),
			subClass : "bottom",
			seen : true,
			value : 0,
			dependencies : ["allSplit","_Split"],
			valueFunction : (x) => {
				let result = 1
				
				result *= 2 ** (x.allSplit.value)
				result *= 3 ** (x._Split.value)
				
				return result
			}
		},{
			class : GeneratorStat,
			name : "stability",
			displayName : "Stability",
			displayString : percent(1),
			displayRequirement : lessThan(1),
			subClass : "top",
			dependencies : ["allUnstability", "_Unstability", "boostUnstability"],
			valueFunction : x => {
				let result = 100
				
				result -= sequences.allUnstability[x.allUnstability.value]
				result -= sequences._Unstability[x._Unstability.value]

				if (x.boostUnstability.active) {
					result -= softCap(1.1 ** x.boostUnstability.value, 20) / 100
				}
				
				if (result < 0) 
					result = 0
				
				return result * 1e-2
			}
		},{
			class : GeneratorStat,
			name : "autoSplitCost",
			displayName : "Autosplit amount",
			displayString : normal(2),
			displayRequirement : moreThan(1),
			subClass : "top",
			dependencies : ["allAutoSplit","_AutoSplit"],
			valueFunction : x => {
				let result = 1
				
				result *= 2 ** (x.allAutoSplit.value / 2)
				result *= 5 ** (x._AutoSplit.value / 2)
				
				return result
			}
		},{
			class : GeneratorStat,
			name : "splitPower",
			displayName : "Split power",
			displayString : normal(2),
			displayRequirement : moreThan(1),
			subClass : "bottom",
			dependencies : ["allPower","_Power"],
			valueFunction : x => {
				let result = 1
				
				result *= 1.7 ** (x.allPower.value)
				result *= 3 ** (x._Power.value)
				
				return result
			}
		},{
			class : GeneratorStat,
			name : "chainChance",
			displayName : "Chain chance",
			displayString : percent(1),
			displayRequirement : moreThan(0),
			subClass : "bottom",
			dependencies : ["allChain","_Chain"],
			valueFunction : x => {
				let result = 0
				
				result += softCap(x.allChain.value * 0.15, 1)
				result += softCap(x._Chain.value * 0.25, 1.5)

				result = softCap(result, 1)
				
				return result
			}
		},{
			class : GeneratorStat,
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
			radius : 22.5,
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
			radius : 22.5,
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
			radius : 22.5,
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