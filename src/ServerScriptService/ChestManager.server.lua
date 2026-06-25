local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService     = game:GetService("TweenService")
local Debris           = game:GetService("Debris")
local WeaponData       = require(ReplicatedStorage:WaitForChild("WeaponData"))

workspace:WaitForChild("Map", 15)

-- RemoteEvents
local weaponPickupEvent = Instance.new("RemoteEvent")
weaponPickupEvent.Name = "WeaponPickup"
weaponPickupEvent.Parent = ReplicatedStorage

local chestsFolder = Instance.new("Folder")
chestsFolder.Name  = "Chests"
chestsFolder.Parent = workspace.Map

local dropsFolder = Instance.new("Folder")
dropsFolder.Name  = "WeaponDrops"
dropsFolder.Parent = workspace

local chestPositions = {
	Vector3.new(50,2,55),   Vector3.new(90,2,55),   Vector3.new(50,2,95),
	Vector3.new(-50,2,55),  Vector3.new(-90,2,55),  Vector3.new(-50,2,-45),
	Vector3.new(50,2,-45),  Vector3.new(0,2,15),    Vector3.new(150,2,155),
	Vector3.new(-150,2,155),Vector3.new(150,2,-145),Vector3.new(-150,2,-145),
	Vector3.new(0,2,205),   Vector3.new(200,2,5),   Vector3.new(-200,2,5),
	Vector3.new(0,2,-195),  Vector3.new(-90,2,-45), Vector3.new(90,2,-45),
	Vector3.new(100,2,100), Vector3.new(-100,2,-100),Vector3.new(200,2,150),
	Vector3.new(-200,2,150),Vector3.new(250,2,55),  Vector3.new(-250,2,-55),
}

local rarityColors = {
	Common    = Color3.fromRGB(180,180,180),
	Uncommon  = Color3.fromRGB(100,200,100),
	Rare      = Color3.fromRGB(70,130,220),
	Epic      = Color3.fromRGB(170,70,220),
	Legendary = Color3.fromRGB(255,170,0),
}

local openedChests = {}

local function spawnWeaponDrop(position, weapon)
	local drop = Instance.new("Part")
	drop.Name   = weapon.Name
	drop.Size   = Vector3.new(3, 0.5, 1)
	drop.Position = position + Vector3.new(math.random(-3,3), 1, math.random(-3,3))
	drop.Color  = weapon.Color or Color3.fromRGB(100,150,255)
	drop.Material = Enum.Material.Neon
	drop.Parent = dropsFolder

	local nameTag = Instance.new("StringValue")
	nameTag.Name  = "WeaponName"
	nameTag.Value = weapon.Name
	nameTag.Parent = drop

	local bb = Instance.new("BillboardGui")
	bb.Size         = UDim2.new(0,120,0,35)
	bb.StudsOffset  = Vector3.new(0,2,0)
	bb.AlwaysOnTop  = false
	bb.Parent = drop

	local lbl = Instance.new("TextLabel")
	lbl.Size                 = UDim2.new(1,0,1,0)
	lbl.BackgroundTransparency = 1
	lbl.Text                 = weapon.Name
	lbl.TextColor3           = rarityColors[weapon.Rarity] or Color3.new(1,1,1)
	lbl.Font                 = Enum.Font.GothamBold
	lbl.TextScaled           = true
	lbl.Parent = bb

	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText           = "Aufheben"
	prompt.ObjectText           = weapon.Name
	prompt.MaxActivationDistance = 8
	prompt.Parent = drop

	prompt.Triggered:Connect(function(player)
		weaponPickupEvent:FireClient(player, weapon.Name)
		drop:Destroy()
	end)

	Debris:AddItem(drop, 60)
end

local function openChest(player, model)
	if openedChests[model] then return end
	openedChests[model] = true

	local body = model:FindFirstChild("Body")
	local lid  = model:FindFirstChild("Lid")
	if not body then return end

	-- Deckel öffnen
	if lid then
		TweenService:Create(lid, TweenInfo.new(0.35, Enum.EasingStyle.Bounce), {
			Position    = lid.Position + Vector3.new(0, 2.5, -2),
			Orientation = Vector3.new(-70, 0, 0),
		}):Play()
	end

	-- Funken entfernen
	local sparkles = body:FindFirstChildOfClass("Sparkles")
	if sparkles then sparkles:Destroy() end

	-- Prompt entfernen
	local ppt = body:FindFirstChildOfClass("ProximityPrompt")
	if ppt then ppt:Destroy() end

	-- 1-3 Waffen droppen
	local count = math.random(1, 3)
	for _ = 1, count do
		local w = WeaponData[math.random(1, #WeaponData)]
		spawnWeaponDrop(body.Position, w)
	end

	-- Truhe als geöffnet markieren
	body.BrickColor = BrickColor.new("Medium stone grey")
	if lid then lid.BrickColor = BrickColor.new("Dark grey") end
	local light = body:FindFirstChildOfClass("PointLight")
	if light then light:Destroy() end
end

local function createChest(position)
	local model = Instance.new("Model")
	model.Name  = "Chest"
	model.Parent = chestsFolder

	local body = Instance.new("Part")
	body.Name     = "Body"
	body.Size     = Vector3.new(4, 3, 4)
	body.Position = position
	body.Anchored = true
	body.BrickColor = BrickColor.new("Bright yellow")
	body.Material = Enum.Material.SmoothPlastic
	body.Parent   = model

	local lid = Instance.new("Part")
	lid.Name     = "Lid"
	lid.Size     = Vector3.new(4.4, 1, 4.4)
	lid.Position = position + Vector3.new(0, 2, 0)
	lid.Anchored = true
	lid.BrickColor = BrickColor.new("Reddish brown")
	lid.Material = Enum.Material.Wood
	lid.Parent   = model

	local light = Instance.new("PointLight")
	light.Color      = Color3.fromRGB(255, 200, 0)
	light.Brightness = 5
	light.Range      = 20
	light.Parent     = body

	local sparkles = Instance.new("Sparkles")
	sparkles.Color  = Color3.fromRGB(255, 200, 0)
	sparkles.Parent = body

	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText           = "Öffnen"
	prompt.ObjectText           = "Truhe"
	prompt.MaxActivationDistance = 10
	prompt.Parent = body

	model.PrimaryPart = body

	prompt.Triggered:Connect(function(player)
		openChest(player, model)
	end)

	return model
end

for _, pos in ipairs(chestPositions) do
	createChest(pos)
end

print("[ChestManager] " .. #chestPositions .. " Truhen platziert.")
