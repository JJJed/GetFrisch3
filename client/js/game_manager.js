function GameManager(size, InputManager, Actuator, ScoreManager) {
  this.size         = size; // Size of the grid
  this.inputManager = new InputManager;
  this.scoreManager = new ScoreManager;
  this.actuator     = new Actuator;

  this.startTiles   = 2;

  // Track move history for server validation
  this.moveHistory  = [];
  this.gameStartTime = null;
  this.bestTileValue = 0;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.actuator.continue();
  this.setup();
};

// Keep playing after winning
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.submitted = false; // Reset submission flag to allow final score submission
  this.actuator.continue();
};

GameManager.prototype.isGameTerminated = function () {
  if (this.over || (this.won && !this.keepPlaying)) {
    return true;
  } else {
    return false;
  }
};

// Set up the game
GameManager.prototype.setup = function () {
  this.grid        = new Grid(this.size);

  this.score       = 0;
  this.over        = false;
  this.won         = false;
  this.keepPlaying = false;

  // Reset tracking variables
  this.moveHistory = [];
  this.gameStartTime = Date.now();
  this.bestTileValue = 0;
  this.submitted = false;

  // Add the initial tiles
  this.addStartTiles();

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var cell = this.grid.randomAvailableCell();
    var tile = new Tile(cell, value);

    this.grid.insertTile(tile);

    // Record tile spawn in move history
    this.moveHistory.push({
      tile: {
        x: cell.x,
        y: cell.y,
        value: value
      },
      direction: null
    });
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.scoreManager.get() < this.score) {
    this.scoreManager.set(this.score);
  }

  // Check if game is over or won, and submit score
  if ((this.over || this.won) && !this.submitted) {
    this.submitGameToServer();
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.scoreManager.get(),
    terminated: this.isGameTerminated()
  });

};

// Submit game to server when finished
GameManager.prototype.submitGameToServer = async function () {
  // Only submit once
  if (this.submitted) return;
  this.submitted = true;

  // Check if user is authenticated
  if (typeof apiClient === 'undefined' || !apiClient.isAuthenticated()) {
    console.log('User not authenticated, skipping server submission');
    return;
  }

  // Calculate game duration
  var gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);

  // Get final board state
  var finalBoard = [];
  var self = this;
  this.grid.eachCell(function(x, y, tile) {
    if (tile) {
      finalBoard.push({
        x: x,
        y: y,
        value: tile.value
      });

      // Track best tile
      if (tile.value > self.bestTileValue) {
        self.bestTileValue = tile.value;
      }
    }
  });

  var gameData = {
    score: this.score,
    best_tile: this.bestTileValue,
    moves_count: this.moveHistory.length,
    game_duration: gameDuration,
    move_history: this.moveHistory,
    final_board: finalBoard,
    is_win: this.won
  };

  console.log('Submitting game to server:', gameData);
  console.log('Move history length:', this.moveHistory.length);
  console.log('First few moves:', this.moveHistory.slice(0, 5));

  // Validate data before sending
  if (!this.moveHistory || this.moveHistory.length === 0) {
    console.error('Cannot submit game: move history is empty');
    return;
  }

  try {
    var result = await submitGameScore(gameData);
    if (result) {
      console.log('Game submitted successfully!');

      // Track in Google Analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'Game_Played', {
          'event_category': this.won ? 'Win' : 'Loss',
          'event_label': 'Score: ' + this.score,
          'value': this.score
        });
      }
    }
  } catch (error) {
    console.error('Failed to submit game:', error);
  }
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // Track best tile
          if (merged.value > self.bestTileValue) {
            self.bestTileValue = merged.value;
          }

          // The mighty 2048 tile
          if (merged.value === 2048) self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    // Record the move in history
    this.moveHistory.push({
      direction: direction,
      tile: null
    });

    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // up
    1: { x: 1,  y: 0 },  // right
    2: { x: 0,  y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
