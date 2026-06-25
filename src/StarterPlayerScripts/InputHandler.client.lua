local Players          = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player    = Players.LocalPlayer
local playerGui = player.PlayerGui

-- Mobile-Steuerung
if UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled then
	task.delay(1.5, function()
		local mobileGui = Instance.new("ScreenGui")
		mobileGui.Name         = "MobileControls"
		mobileGui.ResetOnSpawn = false
		mobileGui.Parent       = playerGui

		local function makeBtn(text, pos, color)
			local btn = Instance.new("TextButton")
			btn.Size   = UDim2.new(0,75,0,75)
			btn.Position = pos
			btn.BackgroundColor3 = color
			btn.BackgroundTransparency = 0.25
			btn.Text   = text
			btn.TextColor3 = Color3.fromRGB(255,255,255)
			btn.Font   = Enum.Font.GothamBold
			btn.TextScaled = true
			btn.BorderSizePixel = 0
			btn.Parent = mobileGui
			local c = Instance.new("UICorner")
			c.CornerRadius = UDim.new(1,0)
			c.Parent = btn
			return btn
		end

		-- Slot-Buttons
		for i = 1, 5 do
			local btn = makeBtn(
				tostring(i),
				UDim2.new(0, 10 + (i-1)*60, 1, -90),
				Color3.fromRGB(40,50,100)
			)
			btn.Size = UDim2.new(0,54,0,54)
			btn.Activated:Connect(function()
				local hud = _G.InventoryHUD
				if hud then hud.SelectSlot(i) end
			end)
		end

		-- Drop-Button
		makeBtn("DROP", UDim2.new(1,-170,1,-170), Color3.fromRGB(150,40,40))

		print("[InputHandler] Mobile-Steuerung erstellt.")
	end)
end

-- Keyboard-Escape-Info
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.Escape then
		-- Roblox öffnet das Standard-Menü – kein override nötig
	end
end)

print("[InputHandler] Initialisiert.")
