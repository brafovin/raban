return {
	MAX_PLAYERS = 20,
	BOT_COUNT = 15,
	INVENTORY_SIZE = 5,
	GAME_DURATION = 600,
	PREGAME_WAIT = 10,
	STORM_START = 90,
	STORM_INTERVALS = {90, 75, 60, 45, 30},
	STORM_DAMAGE = 2,

	BOT_NAMES = {
		"xX_Destroyer_Xx", "ProGamer99", "NightHawk", "ShadowStrike",
		"LegendKiller", "BlazeFire", "IronFist", "StormBreaker",
		"DarkHunter", "FrostBite", "ThunderBolt", "CrimsonEagle",
		"GhostSniper", "VortexKing", "AceWarrior",
	},

	SPAWN_POSITIONS = {
		Vector3.new(-300, 5, -300),
		Vector3.new(300,  5, -300),
		Vector3.new(-300, 5,  300),
		Vector3.new(300,  5,  300),
		Vector3.new(0,    5, -400),
		Vector3.new(0,    5,  400),
		Vector3.new(-400, 5,  0),
		Vector3.new(400,  5,  0),
		Vector3.new(-200, 5, -350),
		Vector3.new(200,  5, -350),
		Vector3.new(-200, 5,  350),
		Vector3.new(200,  5,  350),
	},
}
