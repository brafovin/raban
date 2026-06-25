const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#080c1c',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [LobbyScene, GameScene, HUDScene],
});

// Fenstergröße anpassen
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
