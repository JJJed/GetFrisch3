/**
 * Player Profile Panel for GetFrisch
 * Shows stats and game history below the game board
 */

var ProfilePanel = (function () {
  var panelEl = null;
  var statsLoaded = false;
  var historyLoaded = false;
  var historyPage = 1;
  var historyTotal = 0;

  function getPanel() {
    if (!panelEl) {
      panelEl = document.getElementById('profile-panel');
    }
    return panelEl;
  }

  function show() {
    var panel = getPanel();
    if (!panel) return;
    panel.style.display = 'block';
    if (!statsLoaded) loadStats();
  }

  function hide() {
    var panel = getPanel();
    if (!panel) return;
    panel.style.display = 'none';
    statsLoaded = false;
    historyLoaded = false;
    historyPage = 1;
  }

  async function loadStats() {
    if (!apiClient || !apiClient.isAuthenticated()) return;

    var statsGrid = document.getElementById('profile-stats-grid');
    if (!statsGrid) return;

    // Show skeleton while loading
    statsGrid.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      statsGrid.innerHTML += '<div class="stat-card"><div class="skeleton skeleton-bar" style="width:60px;height:24px;margin:0 auto 6px;"></div><div class="skeleton skeleton-bar" style="width:80px;height:12px;margin:0 auto;"></div></div>';
    }

    try {
      var data = await apiClient.getUserStats();
      var stats = data.stats;
      statsLoaded = true;

      var bestTileDisplay = stats.best_tile || 0;
      var tileSchool = typeof TILE_SCHOOLS !== 'undefined' ? TILE_SCHOOLS[bestTileDisplay] : null;
      var bestTileLabel = tileSchool ? tileSchool + ' (' + bestTileDisplay + ')' : bestTileDisplay;

      statsGrid.innerHTML =
        statCard(stats.total_games, 'Games Played') +
        statCard(stats.best_score ? stats.best_score.toLocaleString() : '0', 'Best Score') +
        statCard(stats.average_score ? Math.round(stats.average_score).toLocaleString() : '0', 'Avg Score') +
        statCard((stats.win_rate || 0).toFixed(0) + '%', 'Win Rate') +
        statCard(bestTileLabel, 'Best Tile') +
        statCard(stats.total_wins || 0, 'Total Wins');
    } catch (error) {
      console.error('Failed to load stats:', error);
      statsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);">Could not load stats</div>';
    }
  }

  function statCard(value, label) {
    return '<div class="stat-card"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>';
  }

  async function loadHistory() {
    if (!apiClient || !apiClient.isAuthenticated()) return;

    var listEl = document.getElementById('profile-history-list');
    if (!listEl) return;

    if (historyPage === 1) {
      listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-muted);">Loading...</div>';
    }

    try {
      var data = await apiClient.getGameHistory(historyPage, 20);
      historyLoaded = true;
      historyTotal = data.total;

      if (historyPage === 1) listEl.innerHTML = '';

      if (!data.games || data.games.length === 0) {
        if (historyPage === 1) {
          listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-muted);">No games yet</div>';
        }
        return;
      }

      data.games.forEach(function (game) {
        listEl.appendChild(createHistoryRow(game));
      });

      // Show/hide load more button
      var loadMoreBtn = document.getElementById('history-load-more');
      if (loadMoreBtn) {
        if (data.games.length < 20 || historyPage >= data.pages) {
          loadMoreBtn.style.display = 'none';
        } else {
          loadMoreBtn.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      if (historyPage === 1) {
        listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-muted);">Could not load history</div>';
      }
    }
  }

  function createHistoryRow(game) {
    var row = document.createElement('div');
    row.className = 'history-row';

    var tileSchool = typeof TILE_SCHOOLS !== 'undefined' ? TILE_SCHOOLS[game.best_tile] : null;
    var tileDisplay = tileSchool ? tileSchool : game.best_tile;
    var winBadge = game.is_win ? '<span class="history-win-badge">W</span>' : '<span class="history-loss-badge">L</span>';
    var dateStr = timeAgo(game.created_at);

    row.setAttribute('data-game-id', game.id);
    row.innerHTML =
      '<div class="history-row-main" onclick="expandHistoryRow(this.parentNode)">' +
        '<div class="history-left">' +
          winBadge +
          '<span class="history-score">' + game.score.toLocaleString() + '</span>' +
          '<span class="history-tile">' + tileDisplay + '</span>' +
        '</div>' +
        '<div class="history-right">' +
          '<span class="history-moves">' + (game.moves_count || '?') + ' moves</span>' +
          '<span class="history-date">' + dateStr + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="history-detail">' +
        formatGameDetail(game) +
      '</div>';

    return row;
  }

  function formatGameDetail(game) {
    var duration = game.game_duration || 0;
    var mins = Math.floor(duration / 60);
    var secs = duration % 60;
    var timeStr = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
    var validated = game.is_validated ? 'Validated' : (game.is_flagged ? 'Flagged' : 'Pending');
    var validatedClass = game.is_validated ? 'detail-validated' : (game.is_flagged ? 'detail-flagged' : '');

    var gameId = game.id || '';
    var html = '<div class="history-detail-grid">' +
      '<span>Duration: <strong>' + timeStr + '</strong></span>' +
      '<span>Status: <strong class="' + validatedClass + '">' + validated + '</strong></span>' +
      (gameId ? '<button onclick="openReplay(' + gameId + ')" class="replay-btn-small">Replay</button>' : '') +
      '</div>';

    // Mini board if final_board data available
    if (game.final_board && game.final_board.length > 0) {
      html += renderMiniBoard(game.final_board);
    }

    return html;
  }

  function renderMiniBoard(finalBoard) {
    var grid = [];
    for (var y = 0; y < 4; y++) {
      grid[y] = [];
      for (var x = 0; x < 4; x++) {
        grid[y][x] = 0;
      }
    }

    finalBoard.forEach(function (tile) {
      if (tile.y >= 0 && tile.y < 4 && tile.x >= 0 && tile.x < 4) {
        grid[tile.y][tile.x] = tile.value;
      }
    });

    var html = '<div class="mini-board">';
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        var val = grid[y][x];
        var cls = val > 0 ? 'mini-tile mini-tile-' + Math.min(val, 2048) : 'mini-tile mini-tile-empty';
        html += '<div class="' + cls + '">' + (val > 0 ? val : '') + '</div>';
      }
    }
    html += '</div>';
    return html;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return 'Unknown';
    var now = new Date();
    var date = new Date(dateStr);
    var diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return date.toLocaleDateString();
  }

  function toggleHistory() {
    var section = document.getElementById('profile-history-section');
    if (!section) return;

    var isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : 'block';

    var btn = document.getElementById('toggle-history-btn');
    if (btn) btn.textContent = isVisible ? 'View Game History' : 'Hide Game History';

    if (!isVisible && !historyLoaded) {
      historyPage = 1;
      loadHistory();
    }
  }

  function loadMoreHistory() {
    historyPage++;
    loadHistory();
  }

  // Expand a history row and lazily load game details
  async function expandHistoryRow(row) {
    var wasExpanded = row.classList.contains('expanded');
    row.classList.toggle('expanded');

    // If collapsing, nothing more to do
    if (wasExpanded) return;

    // Check if details already loaded
    var detail = row.querySelector('.history-detail');
    if (detail && detail.getAttribute('data-loaded')) return;

    var gameId = row.getAttribute('data-game-id');
    if (!gameId || !apiClient || !apiClient.isAuthenticated()) return;

    // Show loading state
    detail.innerHTML = '<div style="text-align:center;padding:8px;color:var(--color-text-muted);">Loading...</div>';

    try {
      var data = await apiClient.getGameDetails(gameId);
      if (data && data.game) {
        detail.innerHTML = formatGameDetail(data.game);
        detail.setAttribute('data-loaded', 'true');
      }
    } catch (e) {
      detail.innerHTML = formatGameDetail({ game_duration: 0 });
    }
  }

  // Expose globally
  window.toggleHistory = toggleHistory;
  window.loadMoreHistory = loadMoreHistory;
  window.expandHistoryRow = expandHistoryRow;

  return {
    show: show,
    hide: hide,
    loadStats: loadStats
  };
})();
