local Players          = game:GetService("Players")
local ReplicatedStorage= game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local WeaponData       = require(ReplicatedStorage:WaitForChild("WeaponData"))

local player = Players.LocalPlayer

local MAX_SLOTS   = 5
local inventory   = {}          -- [1..5] = {name, damage, ammo, maxAmmo, rarity, color} | nil
local selectedSlot = 1

-- WeaponData als Name->Tabelle für O(1)-Zugriff
local weaponByName = {}
for _, w in ipairs(WeaponData) do
	weaponByName[w.Name] = w
end

-- HUD-Referenz (HUD.client.lua setzt _G.InventoryHUD)
local function getHUD()
	return _G.InventoryHUD
end

local function selectSlot(idx)
	if idx < 1 or idx > MAX_SLOTS then return end
	selectedSlot = idx
	local hud = getHUD()
	if hud then hud.SelectSlot(idx) end
end

local function addWeapon(weaponName)
	local info = weaponByName[weaponName]
	if not info then return end

	-- Freien Slot suchen
	local target = nil
	for i = 1, MAX_SLOTS do
		if not inventory[i] then
			target = i
			break
		end
	end

	-- Kein freier Slot → aktiven Slot überschreiben
	if not target then
		target = selectedSlot
	end

	inventory[target] = {
		name   = info.Name,
		damage = info.Damage,
		ammo   = info.AmmoMax,
		maxAmmo = info.AmmoMax,
		rarity = info.Rarity,
		color  = info.Color,
	}

	local hud = getHUD()
	if hud then hud.SetSlot(target, info.Name, info.Rarity) end

	print("[Inv] " .. weaponName .. " → Slot " .. target)
end

local function dropSlot(idx)
	if not inventory[idx] then return end
	print("[Inv] Slot " .. idx .. " (" .. inventory[idx].name .. ") gedroppt")
	inventory[idx] = nil
	local hud = getHUD()
	if hud then hud.ClearSlot(idx) end
end

-- Auf WeaponPickup-Event warten (kommt nach ChestManager init)
local weaponPickup = ReplicatedStorage:WaitForChild("WeaponPickup", 30)
if weaponPickup then
	weaponPickup.OnClientEvent:Connect(function(weaponName)
		addWeapon(weaponName)
	end)
end

-- Tastatur-Steuerung
local keyToSlot = {
	[Enum.KeyCode.One]   = 1,
	[Enum.KeyCode.Two]   = 2,
	[Enum.KeyCode.Three] = 3,
	[Enum.KeyCode.Four]  = 4,
	[Enum.KeyCode.Five]  = 5,
}

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	if keyToSlot[input.KeyCode] then
		selectSlot(keyToSlot[input.KeyCode])
	elseif input.KeyCode == Enum.KeyCode.G then
		dropSlot(selectedSlot)
	end
end)

-- Mausrad zum Wechseln
UserInputService.InputChanged:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseWheel then
		if input.Position.Z > 0 then
			selectSlot(selectedSlot > 1 and selectedSlot - 1 or MAX_SLOTS)
		else
			selectSlot(selectedSlot < MAX_SLOTS and selectedSlot + 1 or 1)
		end
	end
end)

-- Slot 1 beim Start markieren (leicht verzögert damit HUD bereit ist)
task.delay(0.5, function()
	selectSlot(1)
end)

print("[InventoryManager] Bereit. 5 Slots | Tasten: 1-5 wechseln, G = droppen, Scrollrad = wechseln")
