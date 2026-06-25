local Players          = game:GetService("Players")
local ReplicatedStorage= game:GetService("ReplicatedStorage")
local TweenService     = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local player    = Players.LocalPlayer
local playerGui = player.PlayerGui

-- Gerät erkennen
local isMobile  = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
local deviceText = isMobile and "Handy" or "Laptop"
local deviceIcon = isMobile and "📱" or "💻"

-- ScreenGui
local screen = Instance.new("ScreenGui")
screen.Name          = "LobbyGui"
screen.ResetOnSpawn  = false
screen.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screen.Parent        = playerGui

-- Hintergrund
local bg = Instance.new("Frame")
bg.Size     = UDim2.new(1,0,1,0)
bg.BackgroundColor3 = Color3.fromRGB(8,12,28)
bg.BorderSizePixel  = 0
bg.Parent = screen

local grad = Instance.new("UIGradient")
grad.Color = ColorSequence.new({
	ColorSequenceKeypoint.new(0,   Color3.fromRGB(5,8,45)),
	ColorSequenceKeypoint.new(0.5, Color3.fromRGB(18,25,70)),
	ColorSequenceKeypoint.new(1,   Color3.fromRGB(35,8,55)),
})
grad.Rotation = 140
grad.Parent = bg

-- Sterne (Dekorations-Punkte)
for _ = 1, 60 do
	local star = Instance.new("Frame")
	star.Size               = UDim2.new(0, math.random(2,4), 0, math.random(2,4))
	star.Position           = UDim2.new(math.random()/1, 0, math.random()/1, 0)
	star.BackgroundColor3   = Color3.fromRGB(255,255,255)
	star.BackgroundTransparency = math.random()*0.5 + 0.3
	star.BorderSizePixel    = 0
	star.Parent = bg
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(1,0)
	c.Parent = star
end

-- Haupt-Container
local box = Instance.new("Frame")
box.Size     = UDim2.new(0, 480, 0, 580)
box.Position = UDim2.new(0.5, -240, 0.5, -290)
box.BackgroundColor3 = Color3.fromRGB(15, 20, 45)
box.BackgroundTransparency = 0.1
box.BorderSizePixel = 0
box.Parent = bg

local boxCorner = Instance.new("UICorner")
boxCorner.CornerRadius = UDim.new(0, 16)
boxCorner.Parent = box

local boxStroke = Instance.new("UIStroke")
boxStroke.Color     = Color3.fromRGB(80, 100, 200)
boxStroke.Thickness = 2
boxStroke.Parent    = box

-- "raman_king" Titel
local title = Instance.new("TextLabel")
title.Size              = UDim2.new(1,0,0,80)
title.Position          = UDim2.new(0,0,0,20)
title.BackgroundTransparency = 1
title.Text              = "raman_king"
title.TextColor3        = Color3.fromRGB(255,200,0)
title.Font              = Enum.Font.GothamBlack
title.TextScaled        = true
title.TextStrokeTransparency = 0.4
title.TextStrokeColor3  = Color3.fromRGB(180,80,0)
title.Parent = box

-- Glanz-Animation Titel
local function pulsate(obj, from, to, t)
	while obj and obj.Parent do
		TweenService:Create(obj, TweenInfo.new(t, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {TextTransparency = to}):Play()
		task.wait(t)
		TweenService:Create(obj, TweenInfo.new(t, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {TextTransparency = from}):Play()
		task.wait(t)
	end
end
task.spawn(pulsate, title, 0, 0.15, 1.2)

-- Trennlinie
local sep1 = Instance.new("Frame")
sep1.Size   = UDim2.new(0.85,0,0,2)
sep1.Position = UDim2.new(0.075,0,0,110)
sep1.BackgroundColor3 = Color3.fromRGB(80,100,220)
sep1.BorderSizePixel  = 0
sep1.Parent = box

-- Gerät-Anzeige
local deviceFrame = Instance.new("Frame")
deviceFrame.Size   = UDim2.new(1,0,0,50)
deviceFrame.Position = UDim2.new(0,0,0,120)
deviceFrame.BackgroundTransparency = 1
deviceFrame.Parent = box

local deviceLabel = Instance.new("TextLabel")
deviceLabel.Size             = UDim2.new(1,0,1,0)
deviceLabel.BackgroundTransparency = 1
deviceLabel.Text             = "Laptop oder Handy  |  Du spielst mit: " .. deviceIcon .. " " .. deviceText
deviceLabel.TextColor3       = Color3.fromRGB(160,170,255)
deviceLabel.Font             = Enum.Font.Gotham
deviceLabel.TextScaled       = true
deviceLabel.Parent = deviceFrame

-- Inventar-Überschrift
local invTitle = Instance.new("TextLabel")
invTitle.Size              = UDim2.new(1,0,0,30)
invTitle.Position          = UDim2.new(0,0,0,182)
invTitle.BackgroundTransparency = 1
invTitle.Text              = "Dein Inventar (5 Slots)"
invTitle.TextColor3        = Color3.fromRGB(200,200,255)
invTitle.Font              = Enum.Font.GothamBold
invTitle.TextScaled        = true
invTitle.Parent = box

-- 5 Inventar-Slots
local slotsFrame = Instance.new("Frame")
slotsFrame.Size     = UDim2.new(0.95,0,0,95)
slotsFrame.Position = UDim2.new(0.025,0,0,218)
slotsFrame.BackgroundTransparency = 1
slotsFrame.Parent   = box

local slotLayout = Instance.new("UIListLayout")
slotLayout.FillDirection       = Enum.FillDirection.Horizontal
slotLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
slotLayout.Padding             = UDim.new(0, 8)
slotLayout.Parent = slotsFrame

for i = 1, 5 do
	local slot = Instance.new("Frame")
	slot.Size   = UDim2.new(0,76,0,90)
	slot.BackgroundColor3 = Color3.fromRGB(25,35,65)
	slot.BorderSizePixel  = 0
	slot.Parent = slotsFrame

	local sc = Instance.new("UICorner")
	sc.CornerRadius = UDim.new(0,10)
	sc.Parent = slot

	local ss = Instance.new("UIStroke")
	ss.Color     = Color3.fromRGB(70,90,160)
	ss.Thickness = 1.5
	ss.Parent    = slot

	local num = Instance.new("TextLabel")
	num.Size             = UDim2.new(1,0,0.3,0)
	num.BackgroundTransparency = 1
	num.Text             = tostring(i)
	num.TextColor3       = Color3.fromRGB(120,130,200)
	num.Font             = Enum.Font.GothamBold
	num.TextScaled       = true
	num.Parent = slot

	local leer = Instance.new("TextLabel")
	leer.Size             = UDim2.new(1,0,0.6,0)
	leer.Position         = UDim2.new(0,0,0.3,0)
	leer.BackgroundTransparency = 1
	leer.Text             = "Leer"
	leer.TextColor3       = Color3.fromRGB(70,80,120)
	leer.Font             = Enum.Font.Gotham
	leer.TextScaled       = true
	leer.Parent = slot
end

-- Spieler-Name
local pName = Instance.new("TextLabel")
pName.Size             = UDim2.new(1,0,0,30)
pName.Position         = UDim2.new(0,0,0,325)
pName.BackgroundTransparency = 1
pName.Text             = "Spieler: " .. player.Name
pName.TextColor3       = Color3.fromRGB(180,180,220)
pName.Font             = Enum.Font.Gotham
pName.TextScaled       = true
pName.Parent = box

-- Spielen-Button
local playBtn = Instance.new("TextButton")
playBtn.Size   = UDim2.new(0,280,0,60)
playBtn.Position = UDim2.new(0.5,-140,0,370)
playBtn.BackgroundColor3 = Color3.fromRGB(40,185,75)
playBtn.Text   = "SPIELEN"
playBtn.TextColor3 = Color3.fromRGB(255,255,255)
playBtn.Font   = Enum.Font.GothamBlack
playBtn.TextScaled = true
playBtn.BorderSizePixel = 0
playBtn.Parent = box

local btnCorner = Instance.new("UICorner")
btnCorner.CornerRadius = UDim.new(0.2,0)
btnCorner.Parent = playBtn

playBtn.MouseEnter:Connect(function()
	TweenService:Create(playBtn, TweenInfo.new(0.15), {BackgroundColor3 = Color3.fromRGB(60,220,95)}):Play()
end)
playBtn.MouseLeave:Connect(function()
	TweenService:Create(playBtn, TweenInfo.new(0.15), {BackgroundColor3 = Color3.fromRGB(40,185,75)}):Play()
end)
playBtn.Activated:Connect(function()
	screen:Destroy()
end)

-- Warte-Status
local waitLabel = Instance.new("TextLabel")
waitLabel.Name   = "WaitLabel"
waitLabel.Size   = UDim2.new(1,0,0,28)
waitLabel.Position = UDim2.new(0,0,0,445)
waitLabel.BackgroundTransparency = 1
waitLabel.Text   = "Warte auf Spieler..."
waitLabel.TextColor3 = Color3.fromRGB(130,140,200)
waitLabel.Font   = Enum.Font.Gotham
waitLabel.TextScaled = true
waitLabel.Parent = box

-- Version
local ver = Instance.new("TextLabel")
ver.Size   = UDim2.new(1,0,0,22)
ver.Position = UDim2.new(0,0,0,490)
ver.BackgroundTransparency = 1
ver.Text   = "raban-fortnite v1.0"
ver.TextColor3 = Color3.fromRGB(60,70,110)
ver.Font   = Enum.Font.Gotham
ver.TextScaled = true
ver.Parent = box

-- GameState Events
local gameEvent = ReplicatedStorage:WaitForChild("GameState", 15)
if gameEvent then
	gameEvent.OnClientEvent:Connect(function(evType, data)
		if evType == "GameStart" then
			screen:Destroy()
		elseif evType == "LobbyWait" and data then
			waitLabel.Text = "Spieler online: " .. (data.playerCount or "?") .. " | Starte bald..."
		end
	end)
end
