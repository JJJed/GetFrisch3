/**
 * Game Replay Viewer for GetFrisch
 * Replays move_history from /api/game/{id} in a modal with playback controls
 */

var ReplayViewer = (function () {
  var modal, boardEl, playBtn, stepFwdBtn, stepBackBtn, speedSelect, progressEl;
  var moveHistory = [];
  var stepIndex = 0;
  var grid = null; // 4x4 array of values
  var playing = false;
  var playTimer = null;
  var speed = 300;

  function init() {
    modal = document.getElementById('replayModal');
    boardEl = document.getElementById('replay-board');
    playBtn = document.getElementById('replay-play');
    stepFwdBtn = document.getElementById('replay-fwd');
    stepBackBtn = document.getElementById('replay-back');
    speedSelect = document.getElementById('replay-speed');
    progressEl = document.getElementById('replay-progress');
  }

  function resetGrid() {
    grid = [];
    for (var x = 0; x < 4; x++) {
      grid[x] = [];
      for (var y = 0; y < 4; y++) {
        grid[x][y] = 0;
      }
    }
  }

  function getVector(dir) {
    var map = {
      0: { x: 0, y: -1 },
      1: { x: 1, y: 0 },
      2: { x: 0, y: 1 },
      3: { x: -1, y: 0 }
    };
    return map[dir];
  }

  function withinBounds(x, y) {
    return x >= 0 && x < 4 && y >= 0 && y < 4;
  }

  function buildTraversals(vector) {
    var t = { x: [], y: [] };
    for (var i = 0; i < 4; i++) { t.x.push(i); t.y.push(i); }
    if (vector.x === 1) t.x.reverse();
    if (vector.y === 1) t.y.reverse();
    return t;
  }

  function findFarthest(x, y, vector) {
    var prevX = x, prevY = y;
    var nx = x + vector.x, ny = y + vector.y;
    while (withinBounds(nx, ny) && grid[nx][ny] === 0) {
      prevX = nx;
      prevY = ny;
      nx += vector.x;
      ny += vector.y;
    }
    return {
      farthest: { x: prevX, y: prevY },
      next: { x: nx, y: ny }
    };
  }

  function applyMove(direction) {
    var vector = getVector(direction);
    var traversals = buildTraversals(vector);
    var merged = [];
    for (var i = 0; i < 4; i++) {
      merged[i] = [];
      for (var j = 0; j < 4; j++) merged[i][j] = false;
    }

    traversals.x.forEach(function (x) {
      traversals.y.forEach(function (y) {
        if (grid[x][y] === 0) return;
        var pos = findFarthest(x, y, vector);
        var nx = pos.next.x, ny = pos.next.y;
        if (withinBounds(nx, ny) && grid[nx][ny] === grid[x][y] && !merged[nx][ny]) {
          grid[nx][ny] *= 2;
          grid[x][y] = 0;
          merged[nx][ny] = true;
        } else {
          var fx = pos.farthest.x, fy = pos.farthest.y;
          if (fx !== x || fy !== y) {
            grid[fx][fy] = grid[x][y];
            grid[x][y] = 0;
          }
        }
      });
    });
  }

  function applySpawn(tile) {
    if (tile && withinBounds(tile.x, tile.y)) {
      grid[tile.x][tile.y] = tile.value;
    }
  }

  function renderBoard() {
    if (!boardEl) return;
    var html = '';
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        var val = grid[x][y];
        var cls = val > 0 ? 'replay-tile replay-tile-' + Math.min(val, 2048) : 'replay-tile replay-tile-empty';
        html += '<div class="' + cls + '">' + (val > 0 ? val : '') + '</div>';
      }
    }
    boardEl.innerHTML = html;
    updateProgress();
  }

  function updateProgress() {
    if (!progressEl) return;
    progressEl.textContent = 'Step ' + stepIndex + ' / ' + moveHistory.length;
  }

  function stepForward() {
    if (stepIndex >= moveHistory.length) return;
    var entry = moveHistory[stepIndex];
    if (entry.direction !== null && entry.direction !== undefined) {
      applyMove(entry.direction);
    }
    if (entry.tile) {
      applySpawn(entry.tile);
    }
    stepIndex++;
    renderBoard();
  }

  function stepBack() {
    if (stepIndex <= 0) return;
    // Replay from scratch up to stepIndex - 1
    var target = stepIndex - 1;
    resetGrid();
    stepIndex = 0;
    for (var i = 0; i < target; i++) {
      var entry = moveHistory[i];
      if (entry.direction !== null && entry.direction !== undefined) {
        applyMove(entry.direction);
      }
      if (entry.tile) {
        applySpawn(entry.tile);
      }
      stepIndex++;
    }
    renderBoard();
  }

  function togglePlay() {
    if (playing) {
      pause();
    } else {
      play();
    }
  }

  function play() {
    if (stepIndex >= moveHistory.length) {
      // Reset to beginning
      resetGrid();
      stepIndex = 0;
      renderBoard();
    }
    playing = true;
    if (playBtn) playBtn.textContent = 'Pause';
    tick();
  }

  function pause() {
    playing = false;
    if (playBtn) playBtn.textContent = 'Play';
    clearTimeout(playTimer);
  }

  function tick() {
    if (!playing || stepIndex >= moveHistory.length) {
      pause();
      return;
    }
    stepForward();
    playTimer = setTimeout(tick, speed);
  }

  function setSpeed(val) {
    speed = parseInt(val, 10) || 300;
  }

  async function open(gameId) {
    init();
    if (!modal) return;

    pause();
    resetGrid();
    stepIndex = 0;
    moveHistory = [];

    modal.style.display = 'block';
    boardEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--color-text-muted);">Loading replay...</div>';

    try {
      var data = await apiClient.getGameDetails(gameId);
      if (data && data.game && data.game.move_history) {
        moveHistory = data.game.move_history;
        renderBoard();
      } else {
        boardEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--color-text-muted);">No replay data</div>';
      }
    } catch (e) {
      boardEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--color-error-text);">Failed to load replay</div>';
    }
  }

  function close() {
    pause();
    if (modal) modal.style.display = 'none';
  }

  // Global handlers
  window.openReplay = function (gameId) { open(gameId); };
  window.closeReplay = close;
  window.replayTogglePlay = togglePlay;
  window.replayStepFwd = stepForward;
  window.replayStepBack = stepBack;
  window.replaySetSpeed = setSpeed;

  return { open: open, close: close };
})();
