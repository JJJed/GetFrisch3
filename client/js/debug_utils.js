/**
 * Debug utilities for testing game scenarios
 * These functions allow you to quickly set up specific game states for testing
 */

// Set up a board with a 2048 tile and trigger the win condition
GameManager.prototype.debugSetupWinScenario = function() {
  console.log('Setting up win scenario...');

  // Clear the grid first
  this.grid = new Grid(this.size);
  this.score = 0;
  this.over = false;
  this.won = false;
  this.keepPlaying = false;
  this.submitted = false;

  // Reset tracking
  this.moveHistory = [];
  this.gameStartTime = Date.now();
  this.bestTileValue = 0;

  // Create a test board with a 2048 tile and some other tiles
  // This gives a realistic scenario where you can continue playing
  var testTiles = [
    { x: 0, y: 0, value: 2048 },  // The winning tile
    { x: 1, y: 0, value: 1024 },
    { x: 2, y: 0, value: 512 },
    { x: 3, y: 0, value: 256 },
    { x: 0, y: 1, value: 128 },
    { x: 1, y: 1, value: 64 },
    { x: 2, y: 1, value: 32 },
    { x: 3, y: 1, value: 16 },
    { x: 0, y: 2, value: 8 },
    { x: 1, y: 2, value: 4 },
    { x: 2, y: 2, value: 2 }
    // Leave some empty cells so the game can continue
  ];

  // Calculate score based on tiles (rough estimate)
  this.score = 0;
  testTiles.forEach(function(tileData) {
    var tile = new Tile({x: tileData.x, y: tileData.y}, tileData.value);
    this.grid.insertTile(tile);

    // Add to score (simplified calculation)
    if (tileData.value > 2) {
      this.score += tileData.value;
    }

    // Track best tile
    if (tileData.value > this.bestTileValue) {
      this.bestTileValue = tileData.value;
    }

    // Record in move history
    this.moveHistory.push({
      tile: {
        x: tileData.x,
        y: tileData.y,
        value: tileData.value
      },
      direction: null
    });
  }.bind(this));

  // Trigger the win condition
  this.won = true;

  // Update the display
  this.actuate();

  console.log('Win scenario set up!');
  console.log('Score:', this.score);
  console.log('Move history length:', this.moveHistory.length);
  console.log('Now click "Keep Playing" and continue until you lose to test score submission');
};

// Set up a near-game-over scenario to test quickly losing after 2048
GameManager.prototype.debugSetupNearLossScenario = function() {
  console.log('Setting up near-loss scenario after winning...');

  // Clear the grid first
  this.grid = new Grid(this.size);
  this.over = false;
  this.won = true;  // Already won
  this.keepPlaying = true;  // Already clicked keep playing
  this.submitted = false;  // Ready to submit when we lose

  // Reset tracking
  this.moveHistory = [];
  this.gameStartTime = Date.now();
  this.bestTileValue = 2048;

  // Create a nearly full board (almost game over)
  // This board is designed to lose very quickly
  var testTiles = [
    { x: 0, y: 0, value: 2048 },
    { x: 1, y: 0, value: 1024 },
    { x: 2, y: 0, value: 512 },
    { x: 3, y: 0, value: 256 },
    { x: 0, y: 1, value: 128 },
    { x: 1, y: 1, value: 64 },
    { x: 2, y: 1, value: 32 },
    { x: 3, y: 1, value: 16 },
    { x: 0, y: 2, value: 8 },
    { x: 1, y: 2, value: 4 },
    { x: 2, y: 2, value: 2 },
    { x: 3, y: 2, value: 128 },
    { x: 0, y: 3, value: 64 },
    { x: 1, y: 3, value: 32 },
    { x: 2, y: 3, value: 16 }
    // Only one empty cell - will lose very soon
  ];

  // Calculate score
  this.score = 0;
  testTiles.forEach(function(tileData) {
    var tile = new Tile({x: tileData.x, y: tileData.y}, tileData.value);
    this.grid.insertTile(tile);

    // Add to score
    if (tileData.value > 2) {
      this.score += tileData.value;
    }

    // Record in move history
    this.moveHistory.push({
      tile: {
        x: tileData.x,
        y: tileData.y,
        value: tileData.value
      },
      direction: null
    });
  }.bind(this));

  // Update the display
  this.actuate();

  console.log('Near-loss scenario set up!');
  console.log('You are in "Keep Playing" mode with only a few moves left');
  console.log('Score:', this.score);
  console.log('Make 1-2 moves to trigger game over and test score submission');
};

// Debug function to check current game state
GameManager.prototype.debugCheckState = function() {
  console.log('=== Game State Debug Info ===');
  console.log('Score:', this.score);
  console.log('Best Tile:', this.bestTileValue);
  console.log('Won:', this.won);
  console.log('Keep Playing:', this.keepPlaying);
  console.log('Over:', this.over);
  console.log('Submitted:', this.submitted);
  console.log('Move History Length:', this.moveHistory.length);
  console.log('Game Duration (seconds):', Math.floor((Date.now() - this.gameStartTime) / 1000));
  console.log('Is Authenticated:', typeof apiClient !== 'undefined' && apiClient.isAuthenticated());
  console.log('===========================');
};

// Convenience function to run from console
window.testWinScenario = function() {
  if (typeof gameManager !== 'undefined') {
    gameManager.debugSetupWinScenario();
  } else {
    console.error('Game manager not found. Make sure the game is loaded.');
  }
};

window.testNearLossScenario = function() {
  if (typeof gameManager !== 'undefined') {
    gameManager.debugSetupNearLossScenario();
  } else {
    console.error('Game manager not found. Make sure the game is loaded.');
  }
};

window.checkGameState = function() {
  if (typeof gameManager !== 'undefined') {
    gameManager.debugCheckState();
  } else {
    console.error('Game manager not found. Make sure the game is loaded.');
  }
};

console.log('Debug utilities loaded! Available commands:');
console.log('  testWinScenario() - Set up a board with 2048 tile and trigger win');
console.log('  testNearLossScenario() - Set up a board in "Keep Playing" mode, ready to lose');
console.log('  checkGameState() - Display current game state information');
