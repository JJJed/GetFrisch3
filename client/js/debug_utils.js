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
  console.log('Won:', this.won, '| Keep Playing:', this.keepPlaying, '| Submitted:', this.submitted);
  console.log('Now click "Keep Playing" and continue until you lose to test score submission');
};

// Set up a near-win scenario (2-3 moves away from 2048)
GameManager.prototype.debugSetupNearWinScenario = function() {
  console.log('Setting up near-win scenario...');

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

  // Create a board that's 2-3 moves away from 2048
  // Strategy: One 1024, two 512s (need to merge 512s, then merge with 1024)
  var testTiles = [
    { x: 0, y: 0, value: 1024 },  // The high tile
    { x: 1, y: 0, value: 512 },   // First 512
    { x: 2, y: 0, value: 512 },   // Second 512 - can merge these
    { x: 3, y: 0, value: 256 },
    { x: 0, y: 1, value: 128 },
    { x: 1, y: 1, value: 64 },
    { x: 2, y: 1, value: 32 },
    { x: 3, y: 1, value: 16 },
    { x: 0, y: 2, value: 8 },
    { x: 1, y: 2, value: 4 },
    { x: 2, y: 2, value: 2 }
    // Leave some empty cells
  ];

  // Calculate score based on tiles
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

  // Update the display
  this.actuate();

  console.log('Near-win scenario set up!');
  console.log('Score:', this.score);
  console.log('Best tile:', this.bestTileValue);
  console.log('Strategy: Merge the two 512 tiles (top row), then merge the resulting 1024 with the existing 1024');
  console.log('This should take at least 2 moves to reach 2048');
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
  console.log('Won:', this.won, '| Keep Playing:', this.keepPlaying, '| Submitted:', this.submitted);
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

window.testNearWinScenario = function() {
  if (typeof gameManager !== 'undefined') {
    gameManager.debugSetupNearWinScenario();
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

// Test high score submission with lots of moves
GameManager.prototype.debugTestHighScoreSubmission = function(targetScore, targetMoves) {
  console.log('=== HIGH SCORE SUBMISSION TEST ===');
  console.log(`Setting up game with score: ${targetScore}, moves: ${targetMoves}`);

  // Clear the grid and set up game over state
  this.grid = new Grid(this.size);
  this.score = targetScore || 44000;
  this.over = true;
  this.won = true;
  this.keepPlaying = false;
  this.submitted = false;

  // Reset tracking
  this.gameStartTime = Date.now() - (600 * 1000); // 10 minutes ago
  this.bestTileValue = 2048;

  // Generate synthetic move history with the requested number of moves
  var numMoves = targetMoves || 1000;
  this.moveHistory = [];

  console.log(`Generating ${numMoves} moves...`);

  // Add initial tiles
  this.moveHistory.push({
    tile: { x: 0, y: 0, value: 2 },
    direction: null
  });
  this.moveHistory.push({
    tile: { x: 1, y: 1, value: 2 },
    direction: null
  });

  // Generate moves with a realistic pattern
  var directions = [0, 1, 2, 3]; // up, right, down, left
  for (var i = 0; i < numMoves - 2; i++) {
    var direction = directions[i % 4];
    this.moveHistory.push({
      direction: direction,
      tile: { x: Math.floor(Math.random() * 4), y: Math.floor(Math.random() * 4), value: 2 }
    });
  }

  // Create a final board state
  var finalTiles = [
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
    { x: 2, y: 3, value: 16 },
    { x: 3, y: 3, value: 8 }
  ];

  finalTiles.forEach(function(tileData) {
    var tile = new Tile({x: tileData.x, y: tileData.y}, tileData.value);
    this.grid.insertTile(tile);
  }.bind(this));

  // Update the display
  this.actuate();

  console.log('Test game state created:');
  console.log('  Score:', this.score);
  console.log('  Best Tile:', this.bestTileValue);
  console.log('  Move History Length:', this.moveHistory.length);
  console.log('  Game Duration:', Math.floor((Date.now() - this.gameStartTime) / 1000), 'seconds');
  console.log('  Is Authenticated:', typeof apiClient !== 'undefined' && apiClient.isAuthenticated());

  // Calculate estimated payload size
  var estimatedSize = JSON.stringify(this.moveHistory).length;
  console.log('  Estimated move_history size:', (estimatedSize / 1024).toFixed(2), 'KB');

  if (typeof apiClient === 'undefined' || !apiClient.isAuthenticated()) {
    console.error('ERROR: You must be logged in to submit scores!');
    console.log('Please log in first, then run this test again.');
    return;
  }

  console.log('\nReady to submit! Run testSubmitHighScore() to submit this game.');
};

// Submit the test high score
window.testSubmitHighScore = async function() {
  if (typeof gameManager === 'undefined') {
    console.error('Game manager not found. Make sure the game is loaded.');
    return;
  }

  if (typeof apiClient === 'undefined' || !apiClient.isAuthenticated()) {
    console.error('You must be logged in to submit scores!');
    return;
  }

  console.log('=== SUBMITTING HIGH SCORE TEST ===');
  console.log('Triggering submission...');

  try {
    await gameManager.submitGameToServer();
    console.log('Submission complete! Check the logs and database.');
  } catch (error) {
    console.error('Submission failed:', error);
  }
};

window.testHighScoreSubmission = function(score, moves) {
  if (typeof gameManager !== 'undefined') {
    gameManager.debugTestHighScoreSubmission(score, moves);
  } else {
    console.error('Game manager not found. Make sure the game is loaded.');
  }
};

console.log('Debug utilities loaded! Available commands:');
console.log('  testWinScenario() - Set up a board with 2048 tile and trigger win');
console.log('  testNearWinScenario() - Set up a board 2-3 moves away from winning');
console.log('  testNearLossScenario() - Set up a board in "Keep Playing" mode, ready to lose');
console.log('  checkGameState() - Display current game state information');
console.log('');
console.log('HIGH SCORE TESTING:');
console.log('  testHighScoreSubmission(score, moves) - Create a test game with custom score and move count');
console.log('    Examples:');
console.log('      testHighScoreSubmission(44000, 1000) - 44k score with 1000 moves');
console.log('      testHighScoreSubmission(56000, 2000) - 56k score with 2000 moves');
console.log('  testSubmitHighScore() - Submit the test game after creating it');
