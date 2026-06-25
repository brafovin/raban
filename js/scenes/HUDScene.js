class HUDScene extends Phaser.Scene {
  constructor() { super({ key: 'HUDScene', active: false }); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.slotCount = CFG.inventorySize;
    this.inventory  = Array(this.slotCount).fill(null);
    this.selected   = 0;
    this.playerHP   = 100;
    this.maxHP      = 100;
    this.aliveCount = CFG.botCount + 1;

    // ── MINIMAP (oben rechts) ────────────────────────────────────
    const mmSize = 200;
    const mmX = W - mmSize - 20;
    const mmY = 15;

    // Rahmen
    this.mmBg = this.add.graphics();
    this.mmBg.fillStyle(0x0a1020, 0.88);
    this.mmBg.fillRoundedRect(mmX - 3, mmY - 3, mmSize + 6, mmSize + 6, 10);
    this.mmBg.lineStyle(2, 0x4050cc, 1);
    this.mmBg.strokeRoundedRect(mmX - 3, mmY - 3, mmSize + 6, mmSize + 6, 10);

    // "KARTE" Label
    this.add.text(mmX + mmSize / 2, mmY - 14, 'KARTE', {
      fontSize: '13px', color: '#8090cc', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Spieler-Punkt auf Minimap
    this.playerDot = this.add.graphics();

    // ALIVE counter unter Minimap
    this.aliveLabel = this.add.text(mmX + mmSize / 2, mmY + mmSize + 10, 'Alive: --', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#0a1020cc', padding: { x: 8, y: 3 },
    }).setOrigin(0.5);

    // Sturm-Warn-Anzeige unter Alive
    this.stormLabel = this.add.text(mmX + mmSize / 2, mmY + mmSize + 32, '', {
      fontSize: '12px', color: '#6666ff',
      backgroundColor: '#0a102099', padding: { x: 6, y: 2 },
    }).setOrigin(0.5);

    // ── WAFFEN-HOTBAR (unten Mitte) ──────────────────────────────
    const slotW  = 66;
    const slotH  = 66;
    const slotGap = 6;
    const hotbarW = this.slotCount * slotW + (this.slotCount - 1) * slotGap;
    const hotbarX = W / 2 - hotbarW / 2;
    const hotbarY = H - slotH - 16;

    this.slots = [];
    for (let i = 0; i < this.slotCount; i++) {
      const sx = hotbarX + i * (slotW + slotGap);

      const bg = this.add.graphics();
      const wLabel = this.add.text(sx + slotW / 2, hotbarY + slotH / 2 + 6, '', {
        fontSize: '11px', color: '#ccccff',
      }).setOrigin(0.5);
      const numLabel = this.add.text(sx + 5, hotbarY + 4, String(i + 1), {
        fontSize: '12px', color: '#6070b0', fontStyle: 'bold',
      });
      const ammoLabel = this.add.text(sx + slotW - 5, hotbarY + slotH - 14, '', {
        fontSize: '10px', color: '#aaaaaa',
      }).setOrigin(1, 0);

      this.slots.push({ bg, wLabel, numLabel, ammoLabel, sx, sy: hotbarY, w: slotW, h: slotH });
    }
    this.drawHotbar();

    // ── HP BALKEN (links neben Hotbar) ──────────────────────────
    const hpW = 260;
    const hpH = 18;
    const hpX = W / 2 - hotbarW / 2 - hpW - 16;
    const hpY = H - slotH / 2 - hpH / 2 - 16;

    this.hpBg = this.add.graphics();
    this.hpBg.fillStyle(0x333340, 1);
    this.hpBg.fillRoundedRect(hpX, hpY, hpW, hpH, 9);

    this.hpBar = this.add.graphics();
    this.hpText = this.add.text(hpX + hpW / 2, hpY + hpH / 2, '100 HP', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    this._hpX = hpX; this._hpY = hpY; this._hpW = hpW; this._hpH = hpH;
    this.drawHP(100, 100);

    // ── KILLFEED (rechts unter Minimap) ─────────────────────────
    this.killFeedEntries = [];
    this.killFeedY = mmY + mmSize + 50;

    // ── Auf GameScene-Events hören ───────────────────────────────
    this.time.delayedCall(100, () => {
      const gs = this.scene.get('GameScene');
      if (!gs) return;

      gs.events.on('hp-update',        (hp, max) => this.drawHP(hp, max));
      gs.events.on('inventory-update',  (inv, sel) => { this.inventory = inv; this.selected = sel; this.drawHotbar(); });
      gs.events.on('alive-update',      (n) => this.aliveLabel.setText('Alive: ' + n));
      gs.events.on('kill-feed',         (killer, victim) => this.addKillFeed(killer, victim));
      gs.events.on('storm-warn',        (txt) => this.stormLabel.setText(txt));
      gs.events.on('player-pos',        (px, py) => this.updateMinimap(px, py));
    });
  }

  drawHotbar() {
    const rarityColors = {
      Common: 0x888888, Uncommon: 0x44cc44,
      Rare: 0x4488ee, Epic: 0xaa44ee, Legendary: 0xffaa00,
    };

    for (let i = 0; i < this.slotCount; i++) {
      const s   = this.slots[i];
      const sel = i === this.selected;
      const item= this.inventory[i];

      s.bg.clear();
      s.bg.fillStyle(sel ? 0x2a3a6a : 0x111828, 1);
      s.bg.fillRoundedRect(s.sx, s.sy, s.w, s.h, 8);
      s.bg.lineStyle(sel ? 2.5 : 1.5, sel ? 0x88aaff : 0x2a3060, 1);
      s.bg.strokeRoundedRect(s.sx, s.sy, s.w, s.h, 8);

      if (item) {
        const col = rarityColors[item.rarity] || 0xaaaaaa;
        s.bg.lineStyle(2, col, 0.7);
        s.bg.strokeRoundedRect(s.sx, s.sy, s.w, s.h, 8);
        s.wLabel.setText(item.name).setStyle({ color: '#' + col.toString(16).padStart(6, '0') });
        s.ammoLabel.setText(item.ammo + '/' + item.maxAmmo);
      } else {
        s.wLabel.setText('');
        s.ammoLabel.setText('');
      }
    }
  }

  drawHP(hp, maxHp) {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const color = ratio > 0.5 ? 0x32dd50 : ratio > 0.25 ? 0xddbb30 : 0xdd3030;

    this.hpBar.clear();
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRoundedRect(this._hpX, this._hpY, this._hpW * ratio, this._hpH, 9);

    this.hpText.setText(Math.ceil(hp) + ' HP');
  }

  updateMinimap(px, py) {
    const W = this.scale.width;
    const mmSize = 200;
    const mmX = W - mmSize - 20;
    const mmY = 15;

    const dotX = mmX + (px / MAP_W) * mmSize;
    const dotY = mmY + (py / MAP_H) * mmSize;

    this.playerDot.clear();
    this.playerDot.fillStyle(0xffff00, 1);
    this.playerDot.fillCircle(dotX, dotY, 4);
  }

  addKillFeed(killer, victim) {
    const W = this.scale.width;
    const mmSize = 200;
    const mmX = W - mmSize - 20;

    const ky = this.killFeedY + this.killFeedEntries.length * 26;
    const entry = this.add.text(mmX + mmSize, ky, killer + ' ⚡ ' + victim, {
      fontSize: '13px', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 6, y: 3 },
    }).setOrigin(1, 0);

    this.killFeedEntries.push(entry);

    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: entry, alpha: 0, duration: 500,
        onComplete: () => {
          entry.destroy();
          this.killFeedEntries = this.killFeedEntries.filter(e => e !== entry);
        },
      });
    });
  }
}
