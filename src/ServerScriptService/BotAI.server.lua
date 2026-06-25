local Players          = game:GetService("Players")
local ReplicatedStorage= game:GetService("ReplicatedStorage")
local Debris           = game:GetService("Debris")
local GameConfig       = require(ReplicatedStorage:WaitForChild("GameConfig"))
local WeaponData       = require(ReplicatedStorage:WaitForChild("WeaponData"))

local botFolder = Instance.new("Folder")
botFolder.Name  = "Bots"
botFolder.Parent = workspace

local bots = {}

local TORSO_COLORS = {
	BrickColor.new("Bright red"),   BrickColor.new("Bright blue"),
	BrickColor.new("Bright orange"),BrickColor.new("Lime green"),
	BrickColor.new("Hot pink"),     BrickColor.new("Cyan"),
	BrickColor.new("Reddish brown"),BrickColor.new("Magenta"),
}

local function createBot(name, spawnPos)
	local model = Instance.new("Model")
	model.Name  = name
	model.Parent = botFolder

	local hrp = Instance.new("Part")
	hrp.Name     = "HumanoidRootPart"
	hrp.Size     = Vector3.new(2, 2, 1)
	hrp.Position = spawnPos
	hrp.Transparency = 1
	hrp.Parent   = model

	local torso = Instance.new("Part")
	torso.Name   = "Torso"
	torso.Size   = Vector3.new(2, 2, 1)
	torso.Position = spawnPos
	torso.BrickColor = TORSO_COLORS[math.random(1, #TORSO_COLORS)]
	torso.Parent = model

	local head = Instance.new("Part")
	head.Name   = "Head"
	head.Size   = Vector3.new(2, 1.5, 1.5)
	head.Position = spawnPos + Vector3.new(0, 2, 0)
	head.BrickColor = BrickColor.new("Light orange")
	head.Parent = model

	-- Namensschild
	local bb = Instance.new("BillboardGui")
	bb.Size        = UDim2.new(0, 120, 0, 30)
	bb.StudsOffset = Vector3.new(0, 3.5, 0)
	bb.AlwaysOnTop = false
	bb.Parent      = head

	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size              = UDim2.new(1,0,1,0)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text              = name
	nameLabel.TextColor3        = Color3.fromRGB(255,255,255)
	nameLabel.Font              = Enum.Font.GothamBold
	nameLabel.TextScaled        = true
	nameLabel.Parent = bb

	local humanoid = Instance.new("Humanoid")
	humanoid.MaxHealth = 100
	humanoid.Health    = 100
	humanoid.WalkSpeed = 14
	humanoid.Parent    = model

	model.PrimaryPart = hrp

	local w1 = Instance.new("WeldConstraint")
	w1.Part0 = hrp; w1.Part1 = torso; w1.Parent = model
	local w2 = Instance.new("WeldConstraint")
	w2.Part0 = hrp; w2.Part1 = head; w2.Parent = model

	return model
end

local function getNearestTarget(model, range)
	local hrp = model:FindFirstChild("HumanoidRootPart")
	if not hrp then return nil end

	local nearest, nearDist = nil, range

	for _, p in ipairs(Players:GetPlayers()) do
		if p.Character then
			local pHRP = p.Character:FindFirstChild("HumanoidRootPart")
			if pHRP then
				local d = (hrp.Position - pHRP.Position).Magnitude
				if d < nearDist then nearDist = d; nearest = p.Character end
			end
		end
	end

	for _, bd in ipairs(bots) do
		if bd.model ~= model and bd.alive then
			local bHRP = bd.model:FindFirstChild("HumanoidRootPart")
			if bHRP then
				local d = (hrp.Position - bHRP.Position).Magnitude
				if d < nearDist then nearDist = d; nearest = bd.model end
			end
		end
	end

	return nearest, nearDist
end

local function botShoot(model, target)
	local hrp       = model:FindFirstChild("HumanoidRootPart")
	local targetHRP = target:FindFirstChild("HumanoidRootPart")
	if not hrp or not targetHRP then return end

	local targetHum = target:FindFirstChild("Humanoid")
	if not targetHum or targetHum.Health <= 0 then return end

	local dir    = (targetHRP.Position - hrp.Position).Unit
	local params = RaycastParams.new()
	params.FilterDescendantsInstances = {model, botFolder}
	params.FilterType = Enum.RaycastFilterType.Exclude

	local result = workspace:Raycast(hrp.Position, dir * 250, params)
	if result then
		local hitModel = result.Instance:FindFirstAncestorOfClass("Model")
		if hitModel then
			local hitHum = hitModel:FindFirstChild("Humanoid")
			if hitHum and hitHum.Health > 0 then
				hitHum:TakeDamage(math.random(15, 30))
			end
		end
	end

	-- Mündungsfeuer
	local bullet = Instance.new("Part")
	bullet.Size     = Vector3.new(0.15, 0.15, (hrp.Position - (result and result.Position or targetHRP.Position)).Magnitude)
	local midPoint  = result and result.Position or targetHRP.Position
	bullet.CFrame   = CFrame.lookAt(hrp.Position, midPoint) * CFrame.new(0, 0, -bullet.Size.Z/2)
	bullet.Anchored = true
	bullet.CanCollide = false
	bullet.BrickColor = BrickColor.new("Bright yellow")
	bullet.Material   = Enum.Material.Neon
	bullet.Parent     = workspace
	Debris:AddItem(bullet, 0.08)
end

local function runBotLoop(botData)
	local model    = botData.model
	local humanoid = model:FindFirstChild("Humanoid")
	if not humanoid then return end

	local lastShot    = 0
	local wanderTimer = 0
	local wanderDest  = Vector3.new(0, 1, 0)

	while botData.alive and humanoid.Health > 0 do
		local target, dist = getNearestTarget(model, 160)

		if target and dist then
			local tHRP = target:FindFirstChild("HumanoidRootPart")
			if tHRP then
				humanoid:MoveTo(tHRP.Position)
				local now = tick()
				if dist <= 90 and now - lastShot > 0.45 then
					botShoot(model, target)
					lastShot = now
				end
			end
		else
			local now = tick()
			if now > wanderTimer then
				wanderDest  = Vector3.new(math.random(-380,380), 1, math.random(-380,380))
				wanderTimer = now + math.random(6, 14)
			end
			humanoid:MoveTo(wanderDest)
		end

		task.wait(0.1)
	end

	botData.alive = false

	-- Waffe droppen
	local hrp = model:FindFirstChild("HumanoidRootPart")
	if hrp then
		local w = WeaponData[math.random(1, #WeaponData)]
		local drop = Instance.new("Part")
		drop.Name   = w.Name
		drop.Size   = Vector3.new(3, 0.5, 1)
		drop.Position = hrp.Position
		drop.Color  = w.Color or Color3.fromRGB(100,150,255)
		drop.Material = Enum.Material.Neon
		drop.Parent = workspace:FindFirstChild("WeaponDrops") or workspace

		local wName = Instance.new("StringValue")
		wName.Name = "WeaponName"; wName.Value = w.Name; wName.Parent = drop

		local pp = Instance.new("ProximityPrompt")
		pp.ActionText = "Aufheben"; pp.ObjectText = w.Name
		pp.MaxActivationDistance = 8; pp.Parent = drop

		local pickupEvt = ReplicatedStorage:FindFirstChild("WeaponPickup")
		if pickupEvt then
			pp.Triggered:Connect(function(player)
				pickupEvt:FireClient(player, w.Name)
				drop:Destroy()
			end)
		end

		Debris:AddItem(drop, 40)
	end

	task.delay(3, function() model:Destroy() end)
end

local function spawnBots()
	task.wait(3)
	local positions = GameConfig.SPAWN_POSITIONS
	local names     = GameConfig.BOT_NAMES

	for i = 1, GameConfig.BOT_COUNT do
		local name     = names[i] or ("Bot_" .. i)
		local basePos  = positions[(i % #positions) + 1]
		local spawnPos = basePos + Vector3.new(math.random(-25,25), 0, math.random(-25,25))

		local model = createBot(name, spawnPos)
		local botData = {model = model, name = name, alive = true}
		table.insert(bots, botData)

		task.delay(i * 0.4, function()
			task.spawn(runBotLoop, botData)
		end)
	end

	print("[BotAI] " .. GameConfig.BOT_COUNT .. " Bots gespawnt.")
end

spawnBots()
