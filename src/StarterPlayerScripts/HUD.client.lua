local Players          = game:GetService("Players")
local ReplicatedStorage= game:GetService("ReplicatedStorage")
local TweenService     = game:GetService("TweenService")
local RunService       = game:GetService("RunService")

local player    = Players.LocalPlayer
local playerGui = player.PlayerGui

local screen = Instance.new("ScreenGui")
screen.Name          = "HUD"
screen.ResetOnSpawn  = false
screen.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screen.Parent        = playerGui

-- ================================================================
-- MINIMAP (oben rechts)
-- ================================================================
local mmOuter = Instance.new("Frame")
mmOuter.Name   = "Minimap"
mmOuter.Size   = UDim2.new(0,210,0,210)
mmOuter.Position = UDim2.new(1,-230,0,15)
mmOuter.BackgroundColor3 = Color3.fromRGB(12,18,40)
mmOuter.BorderSizePixel  = 0
mmOuter.Parent = screen

local mmCorner = Instance.new("UICorner")
mmCorner.CornerRadius = UDim.new(0,10)
mmCorner.Parent = mmOuter

local mmStroke = Instance.new("UIStroke")
mmStroke.Color     = Color3.fromRGB(80,110,200)
mmStroke.Thickness = 2
mmStroke.Parent    = mmOuter

-- Karten-Untergrund
local mapBg = Instance.new("Frame")
mapBg.Size   = UDim2.new(1,-10,1,-10)
mapBg.Position = UDim2.new(0,5,0,5)
mapBg.BackgroundColor3 = Color3.fromRGB(35,90,35)
mapBg.BorderSizePixel  = 0
mapBg.Parent = mmOuter

local mapBgCorner = Instance.new("UICorner")
mapBgCorner.CornerRadius = UDim.new(0,6)
mapBgCorner.Parent = mapBg

-- Straßen auf Minimap
local function mmRoad(x,y,w,h)
	local r = Instance.new("Frame")
	r.Size   = UDim2.new(w,0,h,0)
	r.Position = UDim2.new(x,0,y,0)
	r.BackgroundColor3 = Color3.fromRGB(60,60,65)
	r.BorderSizePixel  = 0
	r.Parent = mapBg
end
mmRoad(0,0.48,1,0.04)     -- horizontale Hauptstraße
mmRoad(0.48,0,0.04,1)     -- vertikale Hauptstraße
mmRoad(0,0.3,0.85,0.02)
mmRoad(0,0.67,0.85,0.02)
mmRoad(0.3,0,0.02,0.85)
mmRoad(0.67,0,0.02,0.85)

-- Häuser auf Minimap (vereinfacht)
local mmBuildings = {
	{0.48,0.48,0.06,0.06},{0.54,0.5,0.04,0.05},{0.43,0.53,0.05,0.04},
	{0.36,0.36,0.05,0.05},{0.59,0.59,0.04,0.04},{0.38,0.58,0.04,0.04},
	{0.61,0.38,0.04,0.04},{0.68,0.47,0.04,0.05},{0.27,0.47,0.04,0.05},
	{0.48,0.68,0.05,0.04},{0.48,0.27,0.05,0.04},{0.22,0.22,0.04,0.04},
	{0.73,0.72,0.04,0.04},{0.72,0.22,0.04,0.04},{0.22,0.72,0.04,0.04},
}
for _, b in ipairs(mmBuildings) do
	local bld = Instance.new("Frame")
	bld.Size   = UDim2.new(b[3],0,b[4],0)
	bld.Position = UDim2.new(b[1],0,b[2],0)
	bld.BackgroundColor3 = Color3.fromRGB(140,120,90)
	bld.BorderSizePixel  = 0
	bld.Parent = mapBg
end

-- Spieler-Punkt (gelb)
local playerDot = Instance.new("Frame")
playerDot.Name   = "PlayerDot"
playerDot.Size   = UDim2.new(0.055,0,0.055,0)
playerDot.BackgroundColor3 = Color3.fromRGB(255,255,0)
playerDot.BorderSizePixel  = 0
playerDot.ZIndex = 6
playerDot.Parent = mapBg
local pdCorner = Instance.new("UICorner")
pdCorner.CornerRadius = UDim.new(1,0)
pdCorner.Parent = playerDot

-- Sturm-Ring
local stormRing = Instance.new("Frame")
stormRing.Name   = "StormRing"
stormRing.Size   = UDim2.new(1,0,1,0)
stormRing.BackgroundTransparency = 1
stormRing.BorderSizePixel = 4
stormRing.BorderColor3   = Color3.fromRGB(80,80,255)
stormRing.ZIndex = 5
stormRing.Parent = mapBg
local srCorner = Instance.new("UICorner")
srCorner.CornerRadius = UDim.new(1,0)
srCorner.Parent = stormRing

-- "KARTE" Label
local mapLabel = Instance.new("TextLabel")
mapLabel.Size   = UDim2.new(0,210,0,20)
mapLabel.Position = UDim2.new(1,-230,0,228)
mapLabel.BackgroundTransparency = 1
mapLabel.Text   = "KARTE"
mapLabel.TextColor3 = Color3.fromRGB(160,170,255)
mapLabel.Font   = Enum.Font.GothamBold
mapLabel.TextScaled = true
mapLabel.Parent = screen

-- Alive-Counter
local aliveFrame = Instance.new("Frame")
aliveFrame.Size   = UDim2.new(0,210,0,30)
aliveFrame.Position = UDim2.new(1,-230,0,252)
aliveFrame.BackgroundColor3 = Color3.fromRGB(12,18,40)
aliveFrame.BackgroundTransparency = 0.2
aliveFrame.BorderSizePixel  = 0
aliveFrame.Parent = screen
local afCorner = Instance.new("UICorner")
afCorner.CornerRadius = UDim.new(0.3,0)
afCorner.Parent = aliveFrame

local aliveLabel = Instance.new("TextLabel")
aliveLabel.Name   = "AliveCount"
aliveLabel.Size   = UDim2.new(1,0,1,0)
aliveLabel.BackgroundTransparency = 1
aliveLabel.Text   = "Alive: --"
aliveLabel.TextColor3 = Color3.fromRGB(255,255,255)
aliveLabel.Font   = Enum.Font.GothamBold
aliveLabel.TextScaled = true
aliveLabel.Parent = aliveFrame

-- ================================================================
-- LEBENSBALKEN
-- ================================================================
local hpBg = Instance.new("Frame")
hpBg.Size   = UDim2.new(0,320,0,22)
hpBg.Position = UDim2.new(0.5,-160,1,-115)
hpBg.BackgroundColor3 = Color3.fromRGB(40,40,50)
hpBg.BorderSizePixel  = 0
hpBg.Parent = screen
local hpBgC = Instance.new("UICorner")
hpBgC.CornerRadius = UDim.new(0.5,0)
hpBgC.Parent = hpBg

local hpBar = Instance.new("Frame")
hpBar.Name   = "Bar"
hpBar.Size   = UDim2.new(1,0,1,0)
hpBar.BackgroundColor3 = Color3.fromRGB(50,220,70)
hpBar.BorderSizePixel  = 0
hpBar.Parent = hpBg
local hpBarC = Instance.new("UICorner")
hpBarC.CornerRadius = UDim.new(0.5,0)
hpBarC.Parent = hpBar

local hpText = Instance.new("TextLabel")
hpText.Size   = UDim2.new(1,0,1,0)
hpText.BackgroundTransparency = 1
hpText.Text   = "100 HP"
hpText.TextColor3 = Color3.fromRGB(255,255,255)
hpText.Font   = Enum.Font.GothamBold
hpText.TextScaled = true
hpText.ZIndex = 2
hpText.Parent = hpBg

-- ================================================================
-- WAFFEN-HOTBAR (unten, 5 Slots)
-- ================================================================
local hotbar = Instance.new("Frame")
hotbar.Name   = "Hotbar"
hotbar.Size   = UDim2.new(0,380,0,72)
hotbar.Position = UDim2.new(0.5,-190,1,-88)
hotbar.BackgroundTransparency = 1
hotbar.Parent = screen

local hotbarLayout = Instance.new("UIListLayout")
hotbarLayout.FillDirection       = Enum.FillDirection.Horizontal
hotbarLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
hotbarLayout.Padding             = UDim.new(0,5)
hotbarLayout.Parent = hotbar

local weaponSlots = {}
for i = 1, 5 do
	local slot = Instance.new("Frame")
	slot.Name   = "Slot" .. i
	slot.Size   = UDim2.new(0,66,0,66)
	slot.BackgroundColor3 = Color3.fromRGB(18,22,42)
	slot.BorderSizePixel  = 0
	slot.Parent = hotbar

	local sc = Instance.new("UICorner")
	sc.CornerRadius = UDim.new(0.1,0)
	sc.Parent = slot

	local ss = Instance.new("UIStroke")
	ss.Color     = Color3.fromRGB(70,85,150)
	ss.Thickness = 1.5
	ss.Parent    = slot

	local numLbl = Instance.new("TextLabel")
	numLbl.Size   = UDim2.new(0.35,0,0.28,0)
	numLbl.Position = UDim2.new(0.05,0,0.05,0)
	numLbl.BackgroundTransparency = 1
	numLbl.Text   = tostring(i)
	numLbl.TextColor3 = Color3.fromRGB(120,130,190)
	numLbl.Font   = Enum.Font.GothamBold
	numLbl.TextScaled = true
	numLbl.Parent = slot

	local wName = Instance.new("TextLabel")
	wName.Name   = "WeaponName"
	wName.Size   = UDim2.new(1,-4,0.45,0)
	wName.Position = UDim2.new(0,2,0.5,0)
	wName.BackgroundTransparency = 1
	wName.Text   = ""
	wName.TextColor3 = Color3.fromRGB(220,220,255)
	wName.Font   = Enum.Font.Gotham
	wName.TextScaled = true
	wName.Parent = slot

	weaponSlots[i] = {frame = slot, stroke = ss}
end

-- ================================================================
-- KILL-FEED (rechts neben Minimap)
-- ================================================================
local killFeed = Instance.new("Frame")
killFeed.Name   = "KillFeed"
killFeed.Size   = UDim2.new(0,260,0,180)
killFeed.Position = UDim2.new(1,-275,0,295)
killFeed.BackgroundTransparency = 1
killFeed.Parent = screen

local kfLayout = Instance.new("UIListLayout")
kfLayout.FillDirection   = Enum.FillDirection.Vertical
kfLayout.VerticalAlignment = Enum.VerticalAlignment.Top
kfLayout.Padding         = UDim.new(0,3)
kfLayout.Parent = killFeed

-- ================================================================
-- ÖFFENTLICHE HUD-API (für InventoryManager)
-- ================================================================
local rarityColors = {
	Common    = Color3.fromRGB(180,180,180),
	Uncommon  = Color3.fromRGB(100,200,100),
	Rare      = Color3.fromRGB(70,130,220),
	Epic      = Color3.fromRGB(170,70,220),
	Legendary = Color3.fromRGB(255,170,0),
}

local HUD = {}

function HUD.SetSlot(i, weaponName, rarity)
	local s = weaponSlots[i]
	if not s then return end
	local lbl = s.frame:FindFirstChild("WeaponName")
	if lbl then lbl.Text = weaponName or "" end
	if rarity and rarityColors[rarity] then
		s.stroke.Color = rarityColors[rarity]
	end
end

function HUD.ClearSlot(i)
	local s = weaponSlots[i]
	if not s then return end
	local lbl = s.frame:FindFirstChild("WeaponName")
	if lbl then lbl.Text = "" end
	s.stroke.Color = Color3.fromRGB(70,85,150)
end

function HUD.SelectSlot(i)
	for idx, s in ipairs(weaponSlots) do
		if idx == i then
			s.frame.BackgroundColor3 = Color3.fromRGB(55,75,150)
			s.stroke.Thickness = 2.5
		else
			s.frame.BackgroundColor3 = Color3.fromRGB(18,22,42)
			s.stroke.Thickness = 1.5
		end
	end
end

function HUD.AddKillFeedEntry(killer, victim)
	local entry = Instance.new("TextLabel")
	entry.Size   = UDim2.new(1,0,0,24)
	entry.BackgroundColor3 = Color3.fromRGB(0,0,0)
	entry.BackgroundTransparency = 0.45
	entry.Text   = (killer or "?") .. " ⚡ " .. (victim or "?")
	entry.TextColor3 = Color3.fromRGB(255,255,255)
	entry.Font   = Enum.Font.Gotham
	entry.TextScaled = true
	entry.Parent = killFeed
	local ec = Instance.new("UICorner")
	ec.CornerRadius = UDim.new(0.3,0)
	ec.Parent = entry

	task.delay(6, function()
		if entry and entry.Parent then
			TweenService:Create(entry, TweenInfo.new(0.6), {TextTransparency=1, BackgroundTransparency=1}):Play()
			task.wait(0.6)
			if entry and entry.Parent then entry:Destroy() end
		end
	end)
end

HUD.SelectSlot(1)
_G.InventoryHUD = HUD

-- ================================================================
-- HEARTBEAT: HP + Minimap-Dot
-- ================================================================
RunService.Heartbeat:Connect(function()
	local char = player.Character
	if not char then return end
	local hum = char:FindFirstChild("Humanoid")
	if hum then
		local ratio = math.clamp(hum.Health / hum.MaxHealth, 0, 1)
		hpBar.Size = UDim2.new(ratio, 0, 1, 0)
		hpText.Text = math.floor(hum.Health) .. " HP"
		hpBar.BackgroundColor3 =
			ratio > 0.5 and Color3.fromRGB(50,220,70)
			or ratio > 0.25 and Color3.fromRGB(220,180,50)
			or Color3.fromRGB(220,50,50)
	end

	local hrp = char:FindFirstChild("HumanoidRootPart")
	if hrp then
		local mx = math.clamp((hrp.Position.X + 500) / 1000, 0.02, 0.97)
		local mz = math.clamp((hrp.Position.Z + 500) / 1000, 0.02, 0.97)
		playerDot.Position = UDim2.new(mx - 0.027, 0, mz - 0.027, 0)
	end
end)

-- ================================================================
-- GAMESTATE EVENTS
-- ================================================================
local gameEvent = ReplicatedStorage:WaitForChild("GameState", 30)
if gameEvent then
	gameEvent.OnClientEvent:Connect(function(evType, data)
		if evType == "AliveUpdate" then
			aliveLabel.Text = "Alive: " .. tostring(data)

		elseif evType == "KillFeed" and data then
			HUD.AddKillFeedEntry(data, select(2, ...))

		elseif evType == "Victory" then
			local v = Instance.new("TextLabel")
			v.Size   = UDim2.new(0.55,0,0.12,0)
			v.Position = UDim2.new(0.225,0,0.38,0)
			v.BackgroundColor3 = Color3.fromRGB(255,200,0)
			v.BackgroundTransparency = 0.15
			v.Text   = "SIEG! " .. tostring(data)
			v.TextColor3 = Color3.fromRGB(255,255,255)
			v.Font   = Enum.Font.GothamBlack
			v.TextScaled = true
			v.ZIndex = 10
			v.Parent = screen
			local vc = Instance.new("UICorner"); vc.CornerRadius = UDim.new(0.05,0); vc.Parent = v

		elseif evType == "Died" then
			local d = Instance.new("TextLabel")
			d.Size   = UDim2.new(0.45,0,0.1,0)
			d.Position = UDim2.new(0.275,0,0.42,0)
			d.BackgroundColor3 = Color3.fromRGB(200,40,40)
			d.BackgroundTransparency = 0.15
			d.Text   = "Du wurdest eliminiert!"
			d.TextColor3 = Color3.fromRGB(255,255,255)
			d.Font   = Enum.Font.GothamBlack
			d.TextScaled = true
			d.ZIndex = 10
			d.Parent = screen
			local dc = Instance.new("UICorner"); dc.CornerRadius = UDim.new(0.05,0); dc.Parent = d

		elseif evType == "StormShrink" and data then
			-- Sturm-Ring auf Minimap anpassen
			local ratio = math.clamp((data.radius or 500) / 500, 0, 1)
			local newSize = UDim2.new(ratio, 0, ratio, 0)
			local offset = UDim2.new((1-ratio)/2, 0, (1-ratio)/2, 0)
			TweenService:Create(stormRing, TweenInfo.new(data.duration or 60, Enum.EasingStyle.Linear), {
				Size = newSize, Position = offset
			}):Play()
		end
	end)

	-- KillFeed via zweitem Parameter
	gameEvent.OnClientEvent:Connect(function(evType, a, b)
		if evType == "KillFeed" then
			HUD.AddKillFeedEntry(tostring(a), tostring(b))
		end
	end)
end
