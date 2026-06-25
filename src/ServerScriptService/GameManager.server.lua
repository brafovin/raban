local Players          = game:GetService("Players")
local ReplicatedStorage= game:GetService("ReplicatedStorage")
local TweenService     = game:GetService("TweenService")
local GameConfig       = require(ReplicatedStorage:WaitForChild("GameConfig"))

-- RemoteEvent für alle Game-State-Updates
local gameEvent = Instance.new("RemoteEvent")
gameEvent.Name  = "GameState"
gameEvent.Parent = ReplicatedStorage

local STATE = {LOBBY = "lobby", PLAYING = "playing", ENDED = "ended"}
local currentState = STATE.LOBBY
local gameStartTime = 0
local storm = nil

-- Sturm erstellen
local function createStorm()
	local p = Instance.new("Part")
	p.Name   = "Storm"
	p.Shape  = Enum.PartType.Cylinder
	p.Size   = Vector3.new(500, 1100, 1100)
	p.CFrame = CFrame.new(0, 50, 0) * CFrame.Angles(0, 0, math.rad(90))
	p.Anchored    = true
	p.CanCollide  = false
	p.Transparency = 0.65
	p.BrickColor  = BrickColor.new("Dark blue")
	p.Material    = Enum.Material.Neon
	p.Parent      = workspace
	return p
end

-- Sturm-Schaden-Schleife
local function stormDamageLoop()
	while currentState == STATE.PLAYING do
		task.wait(1)
		if not storm then continue end
		local stormRadius = storm.Size.Y / 2

		for _, player in ipairs(Players:GetPlayers()) do
			if player.Character then
				local hrp = player.Character:FindFirstChild("HumanoidRootPart")
				local hum = player.Character:FindFirstChild("Humanoid")
				if hrp and hum and hum.Health > 0 then
					local flatDist = Vector2.new(hrp.Position.X, hrp.Position.Z).Magnitude
					if flatDist > stormRadius - 15 then
						hum:TakeDamage(GameConfig.STORM_DAMAGE)
					end
				end
			end
		end
	end
end

-- Sturm schrumpfen
local function runStorm()
	task.wait(GameConfig.STORM_START)
	if currentState ~= STATE.PLAYING then return end

	storm = createStorm()
	local intervals = GameConfig.STORM_INTERVALS

	for _, duration in ipairs(intervals) do
		if currentState ~= STATE.PLAYING then break end
		local newR = math.max(storm.Size.Y * 0.55, 60)
		TweenService:Create(storm, TweenInfo.new(duration, Enum.EasingStyle.Linear), {
			Size = Vector3.new(500, newR*2, newR*2),
		}):Play()
		gameEvent:FireAllClients("StormShrink", {radius = newR, duration = duration})
		task.wait(duration)
	end
end

-- Alive-Zähler
local function countAlive()
	local playerCount = 0
	for _, p in ipairs(Players:GetPlayers()) do
		if p.Character then
			local hum = p.Character:FindFirstChild("Humanoid")
			if hum and hum.Health > 0 then playerCount += 1 end
		end
	end

	local botCount = 0
	local botFolder = workspace:FindFirstChild("Bots")
	if botFolder then
		for _, bot in ipairs(botFolder:GetChildren()) do
			local hum = bot:FindFirstChild("Humanoid")
			if hum and hum.Health > 0 then botCount += 1 end
		end
	end

	return playerCount, botCount
end

local function checkWin()
	local pc, bc = countAlive()
	gameEvent:FireAllClients("AliveUpdate", pc + bc)

	if pc == 1 and bc == 0 then
		for _, p in ipairs(Players:GetPlayers()) do
			if p.Character then
				local hum = p.Character:FindFirstChild("Humanoid")
				if hum and hum.Health > 0 then
					gameEvent:FireAllClients("Victory", p.Name)
					currentState = STATE.ENDED
					return true
				end
			end
		end
	elseif pc == 0 then
		gameEvent:FireAllClients("GameOver", "Keine Spieler mehr übrig")
		currentState = STATE.ENDED
		return true
	end
	return false
end

-- Spieler einrichten
local function setupPlayer(player)
	player.CharacterAdded:Connect(function(character)
		local hum = character:WaitForChild("Humanoid")

		-- Zufälligen Spawn-Punkt setzen
		task.wait(0.2)
		local positions = GameConfig.SPAWN_POSITIONS
		local spawnPos  = positions[math.random(1, #positions)]
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if hrp then
			hrp.CFrame = CFrame.new(spawnPos + Vector3.new(math.random(-10,10), 0, math.random(-10,10)))
		end

		hum.Died:Connect(function()
			gameEvent:FireAllClients("KillFeed", "?", player.Name)
			gameEvent:FireClient(player, "Died")
			task.wait(1)
			checkWin()
		end)
	end)
end

-- Spiel starten
local function startGame()
	print("[GameManager] Spiel startet!")
	currentState   = STATE.PLAYING
	gameStartTime  = tick()

	gameEvent:FireAllClients("GameStart", {
		playerCount  = Players.NumPlayers + GameConfig.BOT_COUNT,
		gameDuration = GameConfig.GAME_DURATION,
	})

	task.spawn(runStorm)
	task.spawn(stormDamageLoop)

	while currentState == STATE.PLAYING do
		task.wait(5)
		if checkWin() then break end
		if tick() - gameStartTime > GameConfig.GAME_DURATION then
			gameEvent:FireAllClients("TimeUp", "Zeit abgelaufen!")
			currentState = STATE.ENDED
			break
		end
	end

	print("[GameManager] Spiel beendet.")
end

-- Events
Players.PlayerAdded:Connect(function(player)
	setupPlayer(player)
	gameEvent:FireClient(player, "LobbyWait", {playerCount = Players.NumPlayers})
end)

Players.PlayerRemoving:Connect(function()
	if currentState == STATE.PLAYING then
		task.wait(0.3)
		checkWin()
	end
end)

-- Spiel nach kurzer Wartezeit starten
task.delay(GameConfig.PREGAME_WAIT, startGame)

print("[GameManager] Initialisiert. Spiel startet in " .. GameConfig.PREGAME_WAIT .. " Sekunden.")
