local Map = Instance.new("Folder")
Map.Name = "Map"
Map.Parent = workspace

local buildings = Instance.new("Folder")
buildings.Name = "Buildings"
buildings.Parent = Map

local nature = Instance.new("Folder")
nature.Name = "Nature"
nature.Parent = Map

local roads = Instance.new("Folder")
roads.Name = "Roads"
roads.Parent = Map

-- Boden
local ground = Instance.new("Part")
ground.Name = "Ground"
ground.Size = Vector3.new(1000, 4, 1000)
ground.Position = Vector3.new(0, -2, 0)
ground.Anchored = true
ground.Material = Enum.Material.Grass
ground.BrickColor = BrickColor.new("Bright green")
ground.Parent = Map

local function makePart(parent, name, pos, siz, col, mat)
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.Size = siz
	p.Position = pos
	p.BrickColor = col
	p.Material = mat or Enum.Material.SmoothPlastic
	p.Parent = parent
	return p
end

local function buildHouse(cx, cz, w, d, h)
	local folder = Instance.new("Folder")
	folder.Name = "House"
	folder.Parent = buildings

	local wall  = BrickColor.new("Sand yellow")
	local roof  = BrickColor.new("Reddish brown")
	local floor = BrickColor.new("Light grey")
	local glass = BrickColor.new("Cyan")
	local t = 1

	-- Boden
	makePart(folder, "Floor",     Vector3.new(cx, 0.5, cz),                    Vector3.new(w, 1, d),        floor, Enum.Material.Wood)
	-- Rückwand
	makePart(folder, "BackWall",  Vector3.new(cx, h/2+1, cz-d/2),              Vector3.new(w, h, t),        wall)
	-- Vorderwand links & rechts (Türlücke)
	makePart(folder, "FrontL",    Vector3.new(cx - w/4 - 1, h/2+1, cz+d/2),   Vector3.new(w/2-2, h, t),    wall)
	makePart(folder, "FrontR",    Vector3.new(cx + w/4 + 1, h/2+1, cz+d/2),   Vector3.new(w/2-2, h, t),    wall)
	makePart(folder, "FrontTop",  Vector3.new(cx, h-1, cz+d/2),                Vector3.new(4, 3, t),         wall)
	-- Seitenwände mit Fenstern
	makePart(folder, "LeftB",     Vector3.new(cx-w/2, 2, cz),                  Vector3.new(t, 3, d),         wall)
	makePart(folder, "LeftT",     Vector3.new(cx-w/2, h+0.5, cz),              Vector3.new(t, 2, d),         wall)
	makePart(folder, "LeftSL",    Vector3.new(cx-w/2, h/2+1, cz-d/4),         Vector3.new(t, 4, d/2-2),    wall)
	makePart(folder, "LeftSR",    Vector3.new(cx-w/2, h/2+1, cz+d/4),         Vector3.new(t, 4, d/2-2),    wall)
	makePart(folder, "LeftWin",   Vector3.new(cx-w/2, h/2+1, cz),              Vector3.new(t, 4, 4),         glass, Enum.Material.Glass)
	makePart(folder, "RightB",    Vector3.new(cx+w/2, 2, cz),                  Vector3.new(t, 3, d),         wall)
	makePart(folder, "RightT",    Vector3.new(cx+w/2, h+0.5, cz),              Vector3.new(t, 2, d),         wall)
	makePart(folder, "RightSL",   Vector3.new(cx+w/2, h/2+1, cz-d/4),         Vector3.new(t, 4, d/2-2),    wall)
	makePart(folder, "RightSR",   Vector3.new(cx+w/2, h/2+1, cz+d/4),         Vector3.new(t, 4, d/2-2),    wall)
	makePart(folder, "RightWin",  Vector3.new(cx+w/2, h/2+1, cz),              Vector3.new(t, 4, 4),         glass, Enum.Material.Glass)
	-- Dach
	makePart(folder, "Roof",      Vector3.new(cx, h+2, cz),                    Vector3.new(w+2, 1, d+2),    roof, Enum.Material.Wood)
	-- Tür
	makePart(folder, "Door",      Vector3.new(cx, 3, cz+d/2+0.5),              Vector3.new(4, 6, t),         BrickColor.new("Reddish brown"), Enum.Material.Wood)
end

local function buildTree(x, z)
	local trunk = makePart(nature, "Trunk", Vector3.new(x, 4, z), Vector3.new(2, 8, 2),
		BrickColor.new("Reddish brown"), Enum.Material.Wood)
	local leaves = Instance.new("Part")
	leaves.Name = "Leaves"
	leaves.Shape = Enum.PartType.Ball
	leaves.Size = Vector3.new(10, 10, 10)
	leaves.Position = Vector3.new(x, 12, z)
	leaves.Anchored = true
	leaves.BrickColor = BrickColor.new("Bright green")
	leaves.Material = Enum.Material.Grass
	leaves.Parent = nature
end

local function buildRock(x, z, s)
	local r = Instance.new("Part")
	r.Shape = Enum.PartType.Ball
	r.Size = Vector3.new(s*4, s*3, s*4)
	r.Position = Vector3.new(x, s*1.5, z)
	r.Anchored = true
	r.BrickColor = BrickColor.new("Medium stone grey")
	r.Material = Enum.Material.Rock
	r.Parent = nature
end

local function buildRoad(x1, z1, x2, z2)
	local len = math.sqrt((x2-x1)^2 + (z2-z1)^2)
	local cx, cz = (x1+x2)/2, (z1+z2)/2
	local isH = math.abs(x2-x1) > math.abs(z2-z1)
	local road = Instance.new("Part")
	road.Size = isH and Vector3.new(len, 0.3, 8) or Vector3.new(8, 0.3, len)
	road.Position = Vector3.new(cx, 0.1, cz)
	road.Anchored = true
	road.BrickColor = BrickColor.new("Dark grey")
	road.Material = Enum.Material.SmoothPlastic
	road.Parent = roads
	-- Mittelstreifen
	local line = Instance.new("Part")
	line.Size = isH and Vector3.new(len, 0.31, 0.5) or Vector3.new(0.5, 0.31, len)
	line.Position = Vector3.new(cx, 0.1, cz)
	line.Anchored = true
	line.BrickColor = BrickColor.new("Bright yellow")
	line.Material = Enum.Material.SmoothPlastic
	line.Parent = roads
end

-- Häuser
local houseData = {
	{50,   50,  30, 25, 12}, {90,  50,  25, 20, 10}, {50,  90,  35, 30, 15},
	{95,   90,  20, 20, 10}, {-50, 50,  28, 22, 12}, {-90, 50,  30, 25, 14},
	{-50, -50,  35, 28, 16}, {-90,-50,  22, 20, 10}, {50, -50,  25, 22, 12},
	{90,  -90,  30, 25, 13}, {-10,  10, 40, 35, 18}, {150, 150, 28, 24, 12},
	{-150,150, 32, 26, 13}, {150,-150, 26, 22, 11}, {-150,-150,30, 25, 12},
	{0,   200, 45, 40, 20}, {200,  0,  28, 24, 12}, {-200, 0,  32, 28, 14},
	{0,  -200, 36, 30, 16}, {-130,130, 24, 20, 11}, {130,-130, 26, 22, 12},
	{250,  50, 28, 24, 11}, {-250,-50, 30, 26, 13}, {50,  250, 24, 20, 10},
}
for _, h in ipairs(houseData) do buildHouse(h[1], h[2], h[3], h[4], h[5]) end

-- Straßen
buildRoad(-400, 0,   400, 0)
buildRoad(0,  -400,  0,   400)
buildRoad(-250, 120, 250, 120)
buildRoad(-250,-120, 250,-120)
buildRoad(120, -250, 120, 250)
buildRoad(-120,-250,-120, 250)

-- Bäume
local treePos = {
	{130,30},{-130,30},{130,-30},{-130,-30},{200,100},{-200,100},
	{200,-100},{-200,-100},{250,0},{-250,0},{0,250},{0,-250},
	{180,180},{-180,180},{180,-180},{-180,-180},{300,150},{-300,150},
	{300,-150},{-300,-150},{350,50},{-350,50},{100,300},{-100,300},
}
for _, p in ipairs(treePos) do
	buildTree(p[1], p[2])
	buildTree(p[1]+math.random(-12,12), p[2]+math.random(-12,12))
end

-- Felsen (zufällig)
math.randomseed(42)
for _ = 1, 40 do
	buildRock(math.random(-420,420), math.random(-420,420), math.random(5,15)*0.1+0.5)
end

print("[MapBuilder] Karte gebaut: " .. #houseData .. " Häuser, " .. #treePos*2 .. " Bäume.")
