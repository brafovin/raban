class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // ─────────────────────────────────────────────────────────────────
  create() {
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);

    this.bullets  = [];
    this.bots     = [];
    this.chests   = [];
    this.drops    = [];
    this.walls    = [];
    this.aliveCount = CFG.botCount + 1;
    this.playerDead = false;

    // ── Hintergrund + Karte ──────────────────────────────────────
    this._buildMap();

    // ── Truhen ───────────────────────────────────────────────────
    this._buildChests();

    // ── Spieler ──────────────────────────────────────────────────
    const sp = Phaser.Math.RND.pick(CFG.spawnPoints);
    this.player = this._createPlayer(sp.x, sp.y);
    this.cameras.main.startFollow(this.player.body, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);

    // ── Bots ─────────────────────────────────────────────────────
    for (let i = 0; i < CFG.botCount; i++) {
      const bp = CFG.spawnPoints[i % CFG.spawnPoints.length];
      const bx = bp.x + Phaser.Math.Between(-120, 120);
      const by = bp.y + Phaser.Math.Between(-120, 120);
      this.bots.push(this._createBot(i, bx, by));
    }

    // ── Minimap-Kamera (oben rechts, zeigt volle Map) ───────────
    const mmSize = 200;
    const mmX    = this.scale.width  - mmSize - 20;
    const mmY    = 15;
    this.minimapCam = this.cameras.add(mmX, mmY, mmSize, mmSize)
      .setZoom(mmSize / MAP_W)
      .setScroll(0, 0)
      .setName('minimap');

    // Auf Minimap: Bullets und Detail-Objekte ausblenden
    this.minimapCam.ignore(this.children.list.filter(o =>
      o._mmHide === true
    ));

    // ── Eingabe ──────────────────────────────────────────────────
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,G,ONE,TWO,THREE,FOUR,FIVE,R');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointerdown', (ptr) => {
      if (ptr.leftButtonDown()) this._playerShoot();
    });
    this.input.keyboard.on('keydown-ONE',   () => this._selectSlot(0));
    this.input.keyboard.on('keydown-TWO',   () => this._selectSlot(1));
    this.input.keyboard.on('keydown-THREE', () => this._selectSlot(2));
    this.input.keyboard.on('keydown-FOUR',  () => this._selectSlot(3));
    this.input.keyboard.on('keydown-FIVE',  () => this._selectSlot(4));
    this.input.keyboard.on('keydown-G',     () => this._dropWeapon());
    this.input.keyboard.on('keydown-E',     () => this._interactChest());

    // Mausrad = Slot wechseln
    this.input.on('wheel', (ptr, objs, dx, dy) => {
      const sel = (this.player.selectedSlot + (dy > 0 ? 1 : -1) + 5) % 5;
      this._selectSlot(sel);
    });

    // ── Sturm ────────────────────────────────────────────────────
    this.stormRadius  = Math.max(MAP_W, MAP_H);
    this.stormTargetR = this.stormRadius;
    this.stormCenterX = MAP_W / 2;
    this.stormCenterY = MAP_H / 2;
    this.stormActive  = false;
    this.stormOverlay = this.add.graphics().setDepth(50);
    this.stormMaskG   = this.make.graphics({ x: 0, y: 0, add: false });
    const mask = new Phaser.Display.Masks.GeometryMask(this, this.stormMaskG);
    mask.invertAlpha = true;
    this.stormOverlay.setMask(mask);

    this.time.delayedCall(CFG.stormStart, () => this._startStorm());

    // ── Letzter Schuss-Timer ─────────────────────────────────────
    this.lastPlayerShot = 0;

    this.cameras.main.fadeIn(400);
  }

  // ─────────────────────────────────────────────────────────────────
  update(time, delta) {
    if (this.playerDead) { this._spectate(); return; }

    this._movePlayer(delta);
    this._updateAim();
    this._updateBots(time, delta);
    this._updateBullets(delta);
    this._checkBulletCollisions();
    this._checkDropPickup();
    this._updateStorm(delta);
    this._checkStormDamage(delta);
    this._updateVisuals();
    this._emitHUDEvents();
    this._checkWin();
  }

  // ══════════════════════════════════════════════════════════════════
  // MAP
  // ══════════════════════════════════════════════════════════════════
  _buildMap() {
    const g = this.add.graphics().setDepth(0);

    // Gras
    g.fillStyle(0x2e7d32, 1);
    g.fillRect(0, 0, MAP_W, MAP_H);

    // Gras-Schattierungen
    g.fillStyle(0x388e3c, 0.4);
    for (let i = 0; i < 300; i++) {
      g.fillRect(
        Phaser.Math.Between(0, MAP_W - 40),
        Phaser.Math.Between(0, MAP_H - 40),
        Phaser.Math.Between(20, 60), Phaser.Math.Between(20, 60)
      );
    }

    // Straßen
    g.fillStyle(0x555560, 1);
    // Haupt-Kreuz
    g.fillRect(0, MAP_H / 2 - 32, MAP_W, 64);
    g.fillRect(MAP_W / 2 - 32, 0, 64, MAP_H);
    // Neben-Straßen
    const roads = [
      [0, 780, MAP_W, 40],[0, 1580, MAP_W, 40],
      [780, 0, 40, MAP_H],[1580, 0, 40, MAP_H],
      [0, 380, 900, 30],[1500, 380, 900, 30],
      [0, 2000, 900, 30],[1500, 2000, 900, 30],
    ];
    for (const r of roads) g.fillRect(...r);

    // Straßenmittellinien
    g.fillStyle(0xffcc00, 0.5);
    g.fillRect(0, MAP_H / 2 - 1.5, MAP_W, 3);
    g.fillRect(MAP_W / 2 - 1.5, 0, 3, MAP_H);

    // Häuser
    for (const h of CFG.houses) this._drawHouse(g, h);

    // Bäume
    for (const t of CFG.trees) this._drawTree(g, t.x, t.y);

    // Welt-Rand
    g.lineStyle(6, 0x222222, 1);
    g.strokeRect(0, 0, MAP_W, MAP_H);
  }

  _drawHouse(g, h) {
    const { x, y, w, h: dh } = h;
    const hw = w / 2, hh = dh / 2;

    // Schatten
    g.fillStyle(0x000000, 0.22);
    g.fillRect(x - hw + 6, y - hh + 6, w, dh);

    // Dach (was man von oben sieht)
    g.fillStyle(0x6d3a0f, 1);
    g.fillRect(x - hw, y - hh, w, dh);

    // Dach-Schattierung
    g.fillStyle(0x8a4a1a, 1);
    g.fillRect(x - hw + 4, y - hh + 4, w - 8, dh * 0.35);

    // Wände (sichtbar an den Kanten)
    g.fillStyle(0xd4a070, 1);
    g.fillRect(x - hw, y - hh, w, 6);       // Nord
    g.fillRect(x - hw, y + hh - 6, w, 6);   // Süd
    g.fillRect(x - hw, y - hh, 6, dh);      // West
    g.fillRect(x + hw - 6, y - hh, 6, dh);  // Ost

    // Fenster
    g.fillStyle(0x88ccff, 0.7);
    g.fillRect(x - hw + 14, y - hh + 10, 14, 10);
    g.fillRect(x + hw - 28, y - hh + 10, 14, 10);
    g.fillRect(x - hw + 14, y + hh - 22, 14, 10);
    g.fillRect(x + hw - 28, y + hh - 22, 14, 10);

    // Tür (Süd-Mitte, Lücke)
    g.fillStyle(0x3a1800, 1);
    g.fillRect(x - 9, y + hh - 20, 18, 20);

    // Physik-Wände (unsichtbar, markiert mit _mmHide)
    const addWall = (wx, wy, ww, wh) => {
      const wall = this.add.rectangle(wx, wy, ww, wh, 0x000000, 0);
      this.physics.add.existing(wall, true);
      wall._mmHide = true;
      this.walls.push(wall);
    };
    const t = 6;
    addWall(x,       y - hh + t / 2, w, t);   // Nord
    addWall(x,       y + hh - t / 2, w, t);   // Süd
    addWall(x - hw + t / 2, y, t, dh);        // West
    addWall(x + hw - t / 2, y, t, dh);        // Ost
  }

  _drawTree(g, x, y) {
    // Stamm
    g.fillStyle(0x5d3a1a, 1);
    g.fillRect(x - 5, y - 5, 10, 10);
    // Krone äußer
    g.fillStyle(0x1b5e20, 1);
    g.fillCircle(x, y - 4, 22);
    // Krone Highlight
    g.fillStyle(0x2e7d32, 1);
    g.fillCircle(x - 6, y - 9, 14);
  }

  // ══════════════════════════════════════════════════════════════════
  // TRUHEN
  // ══════════════════════════════════════════════════════════════════
  _buildChests() {
    for (const cd of CFG.chests) {
      const g = this.add.graphics().setDepth(4);
      this._drawChest(g, 0, 0);

      const glow = this.add.graphics().setDepth(3);
      glow.fillStyle(0xffcc00, 0.18);
      glow.fillCircle(0, 0, 28);

      const label = this.add.text(0, -38, 'E = Öffnen', {
        fontSize: '13px', color: '#ffcc00',
        backgroundColor: '#00000099', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(6).setVisible(false);
      label._mmHide = true;

      const container = this.add.container(cd.x, cd.y, [g, glow, label]);
      container.setDepth(4);
      container._label = label;
      container._isOpen = false;
      container._gfx  = g;

      // Physik-Zone für Kollision
      const zone = this.add.rectangle(cd.x, cd.y, 28, 28, 0, 0);
      this.physics.add.existing(zone, true);
      zone._chest = container;

      this.chests.push({ container, zone, label, g, isOpen: false, x: cd.x, y: cd.y });

      // Pulsieren
      this.tweens.add({
        targets: glow, alpha: { from: 0.6, to: 1 },
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  _drawChest(g, ox, oy) {
    g.clear();
    // Boden
    g.fillStyle(0xcc9900, 1);
    g.fillRect(ox - 14, oy - 10, 28, 20);
    // Deckel
    g.fillStyle(0xffcc00, 1);
    g.fillRect(ox - 14, oy - 18, 28, 10);
    // Rand
    g.lineStyle(1.5, 0x886600, 1);
    g.strokeRect(ox - 14, oy - 18, 28, 28);
    // Schloss
    g.fillStyle(0x443300, 1);
    g.fillRect(ox - 4, oy - 8, 8, 8);
  }

  _openChest(chest) {
    if (chest.isOpen) return;
    chest.isOpen = true;

    chest.g.clear();
    // Geöffnete Truhe (Deckel weg)
    chest.g.fillStyle(0x554400, 1);
    chest.g.fillRect(-14, -10, 28, 20);
    chest.g.fillStyle(0x776600, 1);
    chest.g.fillRect(-14, -28, 28, 10);
    chest.label.setVisible(false);

    // 1-3 Waffen droppen
    const count = Phaser.Math.Between(1, 3);
    for (let i = 0; i < count; i++) {
      const weapon = Phaser.Utils.Array.GetRandom(WEAPONS);
      this._spawnDrop(chest.x + Phaser.Math.Between(-30, 30), chest.y + Phaser.Math.Between(-30, 30), weapon);
    }

    // Kisten-Physik-Zone deaktivieren
    chest.zone.body.enable = false;
  }

  // ══════════════════════════════════════════════════════════════════
  // SPIELER
  // ══════════════════════════════════════════════════════════════════
  _createPlayer(x, y) {
    const body = this.add.circle(x, y, CFG.playerRadius, 0x4488ff).setDepth(10);
    this.physics.world.enable(body);
    body.body.setCircle(CFG.playerRadius);
    body.body.setCollideWorldBounds(true);
    body.body.setMaxVelocity(CFG.playerSpeed);

    const aimG = this.add.graphics().setDepth(11);
    const hpG  = this.add.graphics().setDepth(12);
    const nameL= this.add.text(x, y - 32, 'Du', {
      fontSize: '13px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(12);
    nameL._mmHide = true;

    return {
      body, aimG, hpG, nameL,
      health: 100, maxHealth: 100,
      inventory: Array(5).fill(null),
      selectedSlot: 0,
      lastShot: 0,
      angle: 0,
      isAlive: true,
    };
  }

  _movePlayer(delta) {
    const body = this.player.body;
    const spd  = CFG.playerSpeed;
    let vx = 0, vy = 0;

    if (this.keys.A.isDown || this.cursors.left.isDown)  vx -= spd;
    if (this.keys.D.isDown || this.cursors.right.isDown) vx += spd;
    if (this.keys.W.isDown || this.cursors.up.isDown)    vy -= spd;
    if (this.keys.S.isDown || this.cursors.down.isDown)  vy += spd;

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    body.body.setVelocity(vx, vy);

    // Wand-Kollision
    for (const wall of this.walls) {
      this.physics.collide(body, wall);
    }
  }

  _updateAim() {
    const wx = this.cameras.main.scrollX + this.input.x;
    const wy = this.cameras.main.scrollY + this.input.y;
    this.player.angle = Phaser.Math.Angle.Between(
      this.player.body.x, this.player.body.y, wx, wy
    );
  }

  _playerShoot() {
    const now  = this.time.now;
    const slot = this.player.inventory[this.player.selectedSlot];
    if (!slot || slot.ammo <= 0) return;
    if (now - this.player.lastShot < slot.fireRate) return;

    this.player.lastShot = now;
    slot.ammo--;

    if (slot.pellets) {
      for (let i = 0; i < slot.pellets; i++) {
        const spread = Phaser.Math.FloatBetween(-0.25, 0.25);
        this._spawnBullet(
          this.player.body.x, this.player.body.y,
          this.player.angle + spread, slot, false
        );
      }
    } else {
      this._spawnBullet(
        this.player.body.x, this.player.body.y,
        this.player.angle, slot, false
      );
    }

    this.events.emit('inventory-update', this.player.inventory, this.player.selectedSlot);
  }

  _selectSlot(i) {
    this.player.selectedSlot = i;
    this.events.emit('inventory-update', this.player.inventory, i);
  }

  _dropWeapon() {
    const i = this.player.selectedSlot;
    const item = this.player.inventory[i];
    if (!item) return;
    const wData = WEAPONS.find(w => w.id === item.id);
    if (wData) {
      this._spawnDrop(
        this.player.body.x + Phaser.Math.Between(-20, 20),
        this.player.body.y + Phaser.Math.Between(-20, 20),
        wData
      );
    }
    this.player.inventory[i] = null;
    this.events.emit('inventory-update', this.player.inventory, i);
  }

  _interactChest() {
    const px = this.player.body.x;
    const py = this.player.body.y;
    for (const chest of this.chests) {
      if (chest.isOpen) continue;
      const d = Phaser.Math.Distance.Between(px, py, chest.x, chest.y);
      if (d < 70) { this._openChest(chest); return; }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // BOTS
  // ══════════════════════════════════════════════════════════════════
  _createBot(index, x, y) {
    const colors = [0xff4444,0xff8800,0xffaa00,0xaa44ff,0xff44aa,0x00ccaa,0xff6644,0xddaa00];
    const color  = colors[index % colors.length];
    const name   = CFG.botNames[index] || ('Bot_' + index);

    const body = this.add.circle(x, y, CFG.botRadius, color).setDepth(10);
    this.physics.world.enable(body);
    body.body.setCircle(CFG.botRadius);
    body.body.setCollideWorldBounds(true);

    const hpG = this.add.graphics().setDepth(12);
    const nameL = this.add.text(x, y - 28, name, {
      fontSize: '11px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(12);
    nameL._mmHide = true;

    // Startwaffe
    const weapon = { ...Phaser.Utils.Array.GetRandom(WEAPONS), ammo: 999, maxAmmo: 999 };

    return {
      body, hpG, nameL, name,
      health: 100, maxHealth: 100,
      weapon, isAlive: true,
      state: 'wander',
      wanderTarget: { x: Phaser.Math.Between(100, MAP_W - 100), y: Phaser.Math.Between(100, MAP_H - 100) },
      wanderTimer: 0,
      lastShot: 0,
      angle: 0,
    };
  }

  _updateBots(time, delta) {
    for (const bot of this.bots) {
      if (!bot.isAlive) continue;

      const bx = bot.body.x, by = bot.body.y;
      const px = this.player.body.x, py = this.player.body.y;
      const dist = Phaser.Math.Distance.Between(bx, by, px, py);

      // Zustand
      if (!this.player.isAlive || dist > 500) {
        bot.state = 'wander';
      } else if (dist > 140) {
        bot.state = 'chase';
      } else {
        bot.state = 'attack';
      }

      switch (bot.state) {
        case 'wander': {
          const td = Phaser.Math.Distance.Between(bx, by, bot.wanderTarget.x, bot.wanderTarget.y);
          if (td < 30 || time > bot.wanderTimer) {
            bot.wanderTarget = {
              x: Phaser.Math.Between(80, MAP_W - 80),
              y: Phaser.Math.Between(80, MAP_H - 80),
            };
            bot.wanderTimer = time + Phaser.Math.Between(5000, 14000);
          }
          this.physics.moveTo(bot.body, bot.wanderTarget.x, bot.wanderTarget.y, CFG.botSpeed * 0.7);
          break;
        }
        case 'chase':
          this.physics.moveTo(bot.body, px, py, CFG.botSpeed);
          bot.angle = Phaser.Math.Angle.Between(bx, by, px, py);
          break;

        case 'attack':
          bot.body.body.setVelocity(0, 0);
          bot.angle = Phaser.Math.Angle.Between(bx, by, px, py);
          if (time - bot.lastShot > (bot.weapon.fireRate + Phaser.Math.Between(0, 400))) {
            bot.lastShot = time;
            const spread = Phaser.Math.FloatBetween(-0.15, 0.15);
            this._spawnBullet(bx, by, bot.angle + spread, bot.weapon, true);
          }
          break;
      }

      // Wand-Kollision
      for (const wall of this.walls) {
        this.physics.collide(bot.body, wall);
      }
    }
  }

  _damageBot(bot, dmg) {
    if (!bot.isAlive) return;
    bot.health -= dmg;
    if (bot.health <= 0) {
      bot.health = 0;
      bot.isAlive = false;
      this.aliveCount--;

      // Drop-Waffe
      this._spawnDrop(bot.body.x, bot.body.y, bot.weapon);

      // Tod-Animation
      this.tweens.add({
        targets: [bot.body, bot.hpG, bot.nameL],
        alpha: 0, duration: 600,
        onComplete: () => {
          bot.body.destroy();
          bot.hpG.destroy();
          bot.nameL.destroy();
        },
      });

      this.events.emit('kill-feed', 'Du', bot.name);
      this.events.emit('alive-update', this.aliveCount);
    }
  }

  _damagePlayer(dmg) {
    if (!this.player.isAlive) return;
    this.player.health -= dmg;
    if (this.player.health <= 0) {
      this.player.health = 0;
      this.player.isAlive = false;
      this.playerDead = true;
      this._showDeathScreen();
    }
    this.events.emit('hp-update', this.player.health, this.player.maxHealth);
  }

  // ══════════════════════════════════════════════════════════════════
  // KUGELN
  // ══════════════════════════════════════════════════════════════════
  _spawnBullet(x, y, angle, weapon, isBot) {
    const vx = Math.cos(angle) * weapon.bulletSpeed;
    const vy = Math.sin(angle) * weapon.bulletSpeed;

    const g = this.add.graphics().setDepth(15);
    g.fillStyle(weapon.bulletColor || 0xffff88, 1);
    g.fillCircle(0, 0, 3.5);

    const cont = this.add.container(x, y, [g]).setDepth(15);
    this.physics.world.enable(cont);
    cont.body.setVelocity(vx, vy);
    cont.body.setCircle(4);

    const bullet = {
      container: cont,
      isBot,
      damage: weapon.damage,
      explosive: weapon.explosive,
      explosionR: weapon.explosionR || 0,
      born: this.time.now,
      life: weapon.bulletLife || 500,
    };
    this.bullets.push(bullet);
  }

  _updateBullets(delta) {
    const now = this.time.now;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (now - b.born > b.life) {
        b.container.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }

  _checkBulletCollisions() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b   = this.bullets[i];
      const bx  = b.container.x;
      const by  = b.container.y;
      let hit   = false;

      // Wand-Treffer
      for (const wall of this.walls) {
        if (wall.body && this.physics.overlap(b.container, wall)) {
          hit = true; break;
        }
      }

      if (!hit && b.isBot) {
        // Spieler treffen
        const d = Phaser.Math.Distance.Between(bx, by, this.player.body.x, this.player.body.y);
        if (d < CFG.playerRadius + 4) {
          this._damagePlayer(b.damage);
          hit = true;
        }
      }

      if (!hit && !b.isBot) {
        // Bots treffen
        for (const bot of this.bots) {
          if (!bot.isAlive) continue;
          const d = Phaser.Math.Distance.Between(bx, by, bot.body.x, bot.body.y);
          if (d < CFG.botRadius + 4) {
            this._damageBot(bot, b.damage);
            if (b.explosive) {
              this._explosion(bx, by, b.explosionR, b.damage * 0.5);
            }
            hit = true; break;
          }
        }
      }

      if (hit) {
        b.container.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }

  _explosion(x, y, radius, dmg) {
    const exp = this.add.graphics().setDepth(20);
    exp.fillStyle(0xff6600, 0.85);
    exp.fillCircle(x, y, radius);
    this.tweens.add({
      targets: exp, alpha: 0, scaleX: 1.4, scaleY: 1.4,
      duration: 400, onComplete: () => exp.destroy(),
    });

    // AoE-Schaden
    for (const bot of this.bots) {
      if (!bot.isAlive) continue;
      if (Phaser.Math.Distance.Between(x, y, bot.body.x, bot.body.y) < radius) {
        this._damageBot(bot, dmg);
      }
    }
    if (Phaser.Math.Distance.Between(x, y, this.player.body.x, this.player.body.y) < radius) {
      this._damagePlayer(dmg);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DROPS
  // ══════════════════════════════════════════════════════════════════
  _spawnDrop(x, y, weaponData) {
    const rarityColors = {
      Common: 0xaaaaaa, Uncommon: 0x44cc44,
      Rare: 0x4488ee, Epic: 0xaa44ee, Legendary: 0xffaa00,
    };
    const col = rarityColors[weaponData.rarity] || 0xaaaaaa;

    const g = this.add.graphics().setDepth(5);
    g.fillStyle(col, 0.9);
    g.fillRect(-16, -6, 32, 12);
    g.fillStyle(0xffffff, 0.3);
    g.fillRect(-16, -6, 32, 4);

    const lbl = this.add.text(0, -20, weaponData.name, {
      fontSize: '11px', color: '#' + col.toString(16).padStart(6, '0'),
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);
    lbl._mmHide = true;

    const cont = this.add.container(x, y, [g, lbl]).setDepth(5);
    this.drops.push({ container: cont, weapon: weaponData, x, y });
  }

  _checkDropPickup() {
    const px = this.player.body.x, py = this.player.body.y;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      const d = Phaser.Math.Distance.Between(px, py, drop.x, drop.y);
      if (d < 36) {
        this._addToInventory(drop.weapon);
        drop.container.destroy();
        this.drops.splice(i, 1);
      }
    }
  }

  _addToInventory(weaponData) {
    const inv = this.player.inventory;
    let slot = inv.findIndex(s => s === null);
    if (slot === -1) slot = this.player.selectedSlot;
    inv[slot] = {
      id: weaponData.id,
      name: weaponData.name,
      damage: weaponData.damage,
      fireRate: weaponData.fireRate,
      ammo: weaponData.ammo,
      maxAmmo: weaponData.ammo,
      bulletSpeed: weaponData.bulletSpeed,
      bulletLife: weaponData.bulletLife,
      bulletColor: weaponData.bulletColor,
      pellets: weaponData.pellets,
      rarity: weaponData.rarity,
      explosive: weaponData.explosive,
      explosionR: weaponData.explosionR,
    };
    this.events.emit('inventory-update', inv, this.player.selectedSlot);
  }

  // ══════════════════════════════════════════════════════════════════
  // STURM
  // ══════════════════════════════════════════════════════════════════
  _startStorm() {
    this.stormActive  = true;
    this.stormRadius  = Math.max(MAP_W, MAP_H) * 0.7;
    this.stormTargetR = MAP_W * 0.35;
    this.events.emit('storm-warn', '⚡ Sturm kommt!');
  }

  _updateStorm(delta) {
    if (!this.stormActive) return;

    // Schrittweise schrumpfen
    if (this.stormRadius > this.stormTargetR + 1) {
      this.stormRadius -= (this.stormRadius - this.stormTargetR) * 0.0005 * delta;
    } else if (this.stormTargetR > 80) {
      this.stormTargetR *= 0.9995;
    }

    // Sturm zeichnen: dunkler Bereich außerhalb
    this.stormOverlay.clear();
    this.stormOverlay.fillStyle(0x0000aa, 0.45);
    this.stormOverlay.fillRect(0, 0, MAP_W, MAP_H);

    this.stormMaskG.clear();
    this.stormMaskG.fillStyle(0xffffff);
    this.stormMaskG.fillCircle(this.stormCenterX, this.stormCenterY, this.stormRadius);
  }

  _checkStormDamage(delta) {
    if (!this.stormActive || !this.player.isAlive) return;
    const d = Phaser.Math.Distance.Between(
      this.player.body.x, this.player.body.y,
      this.stormCenterX, this.stormCenterY
    );
    if (d > this.stormRadius) {
      this._damagePlayer(CFG.stormDamage * delta);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // VISUALS (every frame)
  // ══════════════════════════════════════════════════════════════════
  _updateVisuals() {
    const p = this.player;

    // Spieler – Zielrichtung
    p.aimG.clear();
    p.aimG.fillStyle(0xffffff, 0.85);
    p.aimG.fillCircle(
      p.body.x + Math.cos(p.angle) * (CFG.playerRadius + 8),
      p.body.y + Math.sin(p.angle) * (CFG.playerRadius + 8), 4
    );

    // Spieler – HP-Balken
    p.hpG.clear();
    const ratio = p.health / p.maxHealth;
    p.hpG.fillStyle(0x222222, 0.8);
    p.hpG.fillRect(p.body.x - 20, p.body.y - 26, 40, 5);
    p.hpG.fillStyle(ratio > 0.5 ? 0x33dd44 : ratio > 0.25 ? 0xddbb00 : 0xdd2222, 1);
    p.hpG.fillRect(p.body.x - 20, p.body.y - 26, 40 * ratio, 5);

    // Namenslabel
    p.nameL.setPosition(p.body.x, p.body.y - 34);

    // Bots
    for (const bot of this.bots) {
      if (!bot.isAlive) continue;
      const bx = bot.body.x, by = bot.body.y;
      const br = bot.health / bot.maxHealth;

      bot.hpG.clear();
      bot.hpG.fillStyle(0x222222, 0.8);
      bot.hpG.fillRect(bx - 18, by - 24, 36, 4);
      bot.hpG.fillStyle(br > 0.5 ? 0x33dd44 : br > 0.25 ? 0xddbb00 : 0xdd2222, 1);
      bot.hpG.fillRect(bx - 18, by - 24, 36 * br, 4);

      // Aim-Dot
      bot.hpG.fillStyle(0xffffff, 0.6);
      bot.hpG.fillCircle(
        bx + Math.cos(bot.angle) * (CFG.botRadius + 6),
        by + Math.sin(bot.angle) * (CFG.botRadius + 6), 3
      );

      bot.nameL.setPosition(bx, by - 30);
    }

    // Truhen – Nähe-Label ein/aus
    for (const chest of this.chests) {
      if (chest.isOpen) continue;
      const d = Phaser.Math.Distance.Between(
        p.body.x, p.body.y, chest.x, chest.y
      );
      chest.label.setVisible(d < 70);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // HUD EVENTS
  // ══════════════════════════════════════════════════════════════════
  _emitHUDEvents() {
    this.events.emit('hp-update',  this.player.health, this.player.maxHealth);
    this.events.emit('alive-update', this.aliveCount);
    this.events.emit('player-pos', this.player.body.x, this.player.body.y);
  }

  // ══════════════════════════════════════════════════════════════════
  // SIEG / NIEDERLAGE
  // ══════════════════════════════════════════════════════════════════
  _checkWin() {
    if (this.playerDead) return;
    const livingBots = this.bots.filter(b => b.isAlive).length;
    if (livingBots === 0) {
      this.playerDead = true;
      this._showVictory();
    }
  }

  _showVictory() {
    const W = this.scale.width, H = this.scale.height;
    const cam = this.cameras.main;

    const panel = this.add.graphics().setScrollFactor(0).setDepth(100);
    panel.fillStyle(0xffaa00, 0.9);
    panel.fillRoundedRect(W / 2 - 220, H / 2 - 70, 440, 140, 16);

    this.add.text(W / 2, H / 2 - 28, '🏆 VICTORY ROYALE!', {
      fontSize: '38px', fontFamily: '"Arial Black", Arial', color: '#ffffff',
      stroke: '#885500', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.add.text(W / 2, H / 2 + 24, 'Alle Bots eliminiert! Du bist der Letzte.', {
      fontSize: '18px', color: '#ffffcc',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.time.delayedCall(4000, () => {
      this.scene.stop('HUDScene');
      this.scene.start('LobbyScene');
    });
  }

  _showDeathScreen() {
    const W = this.scale.width, H = this.scale.height;

    const panel = this.add.graphics().setScrollFactor(0).setDepth(100);
    panel.fillStyle(0xcc2222, 0.88);
    panel.fillRoundedRect(W / 2 - 200, H / 2 - 60, 400, 120, 14);

    this.add.text(W / 2, H / 2 - 18, 'Du wurdest eliminiert!', {
      fontSize: '30px', fontFamily: '"Arial Black", Arial', color: '#ffffff',
      stroke: '#660000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.add.text(W / 2, H / 2 + 22, 'Neustart in 4 Sekunden...', {
      fontSize: '16px', color: '#ffaaaa',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.time.delayedCall(4000, () => {
      this.scene.stop('HUDScene');
      this.scene.start('LobbyScene');
    });
  }

  _spectate() {
    // Nach Tod: Kamera bleibt stehen, nichts weiter zu tun
  }
}
