class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Hintergrund
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x080c1c, 0x080c1c, 0x120828, 0x120828, 1);
    bg.fillRect(0, 0, W, H);

    // Sterne
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, W);
      const sy = Phaser.Math.Between(0, H);
      const sr = Phaser.Math.FloatBetween(0.5, 2);
      const sg = this.add.graphics();
      sg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
      sg.fillCircle(sx, sy, sr);
    }

    // Haupt-Box
    const bW = 480, bH = 560;
    const bX = W / 2 - bW / 2;
    const bY = H / 2 - bH / 2;
    const box = this.add.graphics();
    box.fillStyle(0x0f1428, 0.92);
    box.fillRoundedRect(bX, bY, bW, bH, 18);
    box.lineStyle(2, 0x4858cc, 1);
    box.strokeRoundedRect(bX, bY, bW, bH, 18);

    // "raman_king" Titel
    this.add.text(W / 2, bY + 58, 'raman_king', {
      fontSize: '54px',
      fontFamily: '"Arial Black", Arial, sans-serif',
      color: '#ffc800',
      stroke: '#b05000',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 12, fill: true },
    }).setOrigin(0.5);

    // Trennlinie
    const line = this.add.graphics();
    line.lineStyle(1.5, 0x3848aa, 1);
    line.lineBetween(bX + 40, bY + 100, bX + bW - 40, bY + 100);

    // Gerät erkennen
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const deviceText = isMobile ? '📱 Handy' : '💻 Laptop';
    this.add.text(W / 2, bY + 127, 'Laptop oder Handy  |  ' + deviceText, {
      fontSize: '19px',
      fontFamily: 'Arial, sans-serif',
      color: '#8899dd',
    }).setOrigin(0.5);

    // Inventar-Titel
    this.add.text(W / 2, bY + 168, 'Dein Inventar (5 Slots)', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ccccee',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 5 Slots
    const slotW = 72, slotH = 78, gap = 10;
    const totalW = 5 * slotW + 4 * gap;
    const slotStartX = W / 2 - totalW / 2;
    const slotY = bY + 200;

    for (let i = 0; i < 5; i++) {
      const sx = slotStartX + i * (slotW + gap);
      const slotG = this.add.graphics();
      slotG.fillStyle(0x1a2445, 1);
      slotG.fillRoundedRect(sx, slotY, slotW, slotH, 8);
      slotG.lineStyle(1.5, 0x3848aa, 1);
      slotG.strokeRoundedRect(sx, slotY, slotW, slotH, 8);

      this.add.text(sx + 6, slotY + 5, String(i + 1), {
        fontSize: '13px', color: '#6070b0', fontStyle: 'bold',
      });
      this.add.text(sx + slotW / 2, slotY + slotH / 2 + 6, 'Leer', {
        fontSize: '13px', color: '#404070',
      }).setOrigin(0.5);
    }

    // Spieler-Name
    this.add.text(W / 2, bY + 308, 'Bereit? Dann los!', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#9090bb',
    }).setOrigin(0.5);

    // SPIELEN Button
    const btnW = 240, btnH = 56;
    const btnX = W / 2 - btnW / 2;
    const btnY = bY + 340;

    const btnG = this.add.graphics();
    const drawBtn = (color) => {
      btnG.clear();
      btnG.fillStyle(color, 1);
      btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    };
    drawBtn(0x28b650);

    const btnText = this.add.text(W / 2, btnY + btnH / 2, 'SPIELEN', {
      fontSize: '28px',
      fontFamily: '"Arial Black", Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    const hitZone = this.add.zone(btnX, btnY, btnW, btnH)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerover',  () => drawBtn(0x38d060));
    hitZone.on('pointerout',   () => drawBtn(0x28b650));
    hitZone.on('pointerdown',  () => drawBtn(0x1a9040));
    hitZone.on('pointerup', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
        this.scene.launch('HUDScene');
      });
    });

    // Tipps
    this.add.text(W / 2, btnY + btnH + 22, 'WASD = Bewegen  |  Maus = Zielen  |  Klick = Schießen', {
      fontSize: '13px', color: '#505080',
    }).setOrigin(0.5);
    this.add.text(W / 2, btnY + btnH + 40, '1-5 = Slot wählen  |  E = Truhe öffnen  |  G = Waffe droppen', {
      fontSize: '13px', color: '#505080',
    }).setOrigin(0.5);

    // Version
    this.add.text(W / 2, bY + bH - 18, 'raman_king Battle Royale v1.0', {
      fontSize: '12px', color: '#282840',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(400);
  }
}
