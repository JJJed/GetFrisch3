/**
 * Leaderboard Handler for GetFrisch
 * Manages real-time leaderboard updates via WebSocket
 */

let socket = null;

// Mapping of tile values to school names
const TILE_SCHOOLS = {
  2: 'DRS',
  4: 'SKA',
  8: 'HAFTR',
  16: 'Heschel',
  32: 'MTA',
  64: 'Maayanot',
  128: 'TABC',
  256: 'Kushner',
  512: 'SAR',
  1024: 'Ramaz',
  2048: 'Frisch',
  4096: 'Rabbi Ciner',
  8192: 'IDF',
  16384: 'Israel'
};

/**
 * Convert a tile value to a formatted school name with value
 * @param {number} tileValue - The tile value (e.g., 2, 4, 2048)
 * @returns {string} - Formatted string like "DRS (2)" or "Frisch (2048)"
 */
function getTileSchoolDisplay(tileValue) {
  const schoolName = TILE_SCHOOLS[tileValue];
  if (schoolName) {
    return `${schoolName} (${tileValue})`;
  }
  // Fallback for unknown values
  return tileValue.toString();
}

// Initialize WebSocket connection
function initializeSocket() {
  if (socket && socket.connected) {
    return;
  }

  socket = io(window.location.origin);

  socket.on('connect', () => {
    console.log('Connected to server');

    // Track WebSocket connection
    if (typeof gtag !== 'undefined') {
      gtag('event', 'websocket_connected', {
        'event_category': 'Leaderboard',
        'event_label': 'Real-time Connection Established'
      });
    }

    socket.emit('request_leaderboard');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  socket.on('connected', (data) => {
    console.log('Server message:', data.message);
  });

  socket.on('leaderboard_update', (data) => {
    console.log('Leaderboard updated');

    // Track leaderboard view
    if (typeof gtag !== 'undefined') {
      gtag('event', 'view_leaderboard', {
        'event_category': 'Leaderboard',
        'event_label': 'Leaderboard Viewed',
        'value': data.leaderboard ? data.leaderboard.length : 0
      });
    }

    // Use API-based loading to respect filters/pagination
    loadLeaderboard(false);
  });

  socket.on('leaderboard_changed', (data) => {
    console.log('Leaderboard changed, fetching new data...');

    // Track new score notification
    if (typeof gtag !== 'undefined') {
      gtag('event', 'leaderboard_changed', {
        'event_category': 'Leaderboard',
        'event_label': 'New Score Submitted'
      });
    }

    // Refresh leaderboard via API (respects current filters/page)
    loadLeaderboard(false);
  });

  socket.on('error', (data) => {
    console.error('Socket error:', data.message);
  });
}

// Leaderboard state
var leaderboardState = {
  page: 0,
  perPage: 25,
  school: null,
  period: null,
  allSchools: [],
  currentData: [],
  total: 0
};

// Load leaderboard via API
async function loadLeaderboard(resetPage) {
  if (resetPage) leaderboardState.page = 0;

  var offset = leaderboardState.page * leaderboardState.perPage;
  try {
    const data = await apiClient.getLeaderboard(
      leaderboardState.perPage,
      offset,
      leaderboardState.school,
      leaderboardState.period
    );
    leaderboardState.currentData = data.leaderboard || [];
    leaderboardState.total = data.total || 0;

    // Collect unique schools for the filter dropdown
    if (leaderboardState.allSchools.length === 0 && data.leaderboard) {
      var schools = {};
      data.leaderboard.forEach(function (g) {
        if (g.school && g.school !== '-') schools[g.school] = true;
      });
      leaderboardState.allSchools = Object.keys(schools).sort();
      renderSchoolFilter();
    }

    renderLeaderboard(data.leaderboard);
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    document.getElementById('leaderboard-container').innerHTML =
      '<div class="error-message">Failed to load leaderboard</div>';
  }
}

function renderSchoolFilter() {
  var filterBar = document.getElementById('leaderboard-filters');
  if (!filterBar) return;

  var select = document.getElementById('school-filter');
  if (!select) return;

  // Keep existing option + add schools
  var existing = select.querySelector('option[value=""]');
  select.innerHTML = '';
  if (existing) select.appendChild(existing);
  else {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'All Schools';
    select.appendChild(opt);
  }

  leaderboardState.allSchools.forEach(function (s) {
    var opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });
}

function setSchoolFilter(school) {
  leaderboardState.school = school || null;
  loadLeaderboard(true);
}

function setPeriodFilter(period) {
  leaderboardState.period = period || null;

  // Update active button state
  document.querySelectorAll('.period-btn').forEach(function (btn) {
    btn.classList.remove('period-active');
  });
  var activeBtn = document.querySelector('.period-btn[data-period="' + (period || 'all') + '"]');
  if (activeBtn) activeBtn.classList.add('period-active');

  loadLeaderboard(true);
}

function leaderboardPrev() {
  if (leaderboardState.page > 0) {
    leaderboardState.page--;
    loadLeaderboard(false);
  }
}

function leaderboardNext() {
  if (leaderboardState.currentData.length >= leaderboardState.perPage) {
    leaderboardState.page++;
    loadLeaderboard(false);
  }
}

// Render leaderboard table
function renderLeaderboard(leaderboard) {
  const container = document.getElementById('leaderboard-container');

  if (!leaderboard || leaderboard.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">No scores yet. Be the first!</p>';
    renderPagination();
    return;
  }

  // Get current user for highlighting
  var currentUser = (typeof apiClient !== 'undefined') ? apiClient.getStoredUser() : null;
  var currentUsername = currentUser ? currentUser.username : null;

  var startRank = leaderboardState.page * leaderboardState.perPage;

  let html = '<table class="leaderboard-table">';
  html += '<thead><tr>';
  html += '<th>Rank</th>';
  html += '<th>Player</th>';
  html += '<th>School</th>';
  html += '<th>Score</th>';
  html += '<th>Best Tile</th>';
  html += '<th>Date</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  leaderboard.forEach((game, index) => {
    const rank = game.rank || (startRank + index + 1);
    const verifiedBadge = game.is_verified ? '<span class="verified">✓</span>' : '';
    const winBadge = game.is_win ? '<span style="color: var(--color-primary); margin-left: 4px;">&#x1F451;</span>' : '';

    // Format date
    let dateStr = 'N/A';
    if (game.created_at) {
      const date = new Date(game.created_at);
      dateStr = date.toLocaleDateString();
    }

    // Format school or show '-' if not set
    const schoolDisplay = game.school || '-';
    const isCurrentUser = currentUsername && game.username === currentUsername;
    const rowClass = isCurrentUser ? ' class="current-player-row"' : '';

    html += `<tr${rowClass}>`;
    html += `<td class="rank">#${rank}</td>`;
    html += `<td><span class="player-name">${game.username}${verifiedBadge}${winBadge}</span></td>`;
    html += `<td>${schoolDisplay}</td>`;
    html += `<td><strong>${game.score.toLocaleString()}</strong></td>`;
    html += `<td class="best-tile">${getTileSchoolDisplay(game.best_tile)}</td>`;
    html += `<td>${dateStr}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  renderPagination();

  // Auto-scroll to current player row if on this page
  var playerRow = container.querySelector('.current-player-row');
  if (playerRow) {
    playerRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderPagination() {
  var pag = document.getElementById('leaderboard-pagination');
  if (!pag) return;

  var page = leaderboardState.page;
  var hasMore = leaderboardState.currentData.length >= leaderboardState.perPage;

  pag.innerHTML = '';
  if (page > 0 || hasMore) {
    var prevBtn = '<button onclick="leaderboardPrev()" ' + (page === 0 ? 'disabled' : '') + ' class="lb-page-btn">Previous</button>';
    var pageLabel = '<span class="lb-page-label">Page ' + (page + 1) + '</span>';
    var nextBtn = '<button onclick="leaderboardNext()" ' + (!hasMore ? 'disabled' : '') + ' class="lb-page-btn">Next</button>';
    pag.innerHTML = prevBtn + pageLabel + nextBtn;
  }
}

// ==========================================
// School Leaderboard Tab
// ==========================================

var currentLeaderboardTab = 'players';

function switchLeaderboardTab(tab) {
  currentLeaderboardTab = tab;

  // Update tab UI
  document.querySelectorAll('.lb-tab').forEach(function (t) {
    t.classList.remove('lb-tab-active');
  });
  var activeTab = document.querySelector('.lb-tab[data-tab="' + tab + '"]');
  if (activeTab) activeTab.classList.add('lb-tab-active');

  var filtersEl = document.getElementById('leaderboard-filters');
  var paginationEl = document.getElementById('leaderboard-pagination');

  if (tab === 'schools') {
    // Hide player filters/pagination, load school data
    if (filtersEl) filtersEl.style.display = 'none';
    if (paginationEl) paginationEl.style.display = 'none';
    loadSchoolLeaderboard();
  } else {
    if (filtersEl) filtersEl.style.display = 'flex';
    if (paginationEl) paginationEl.style.display = 'flex';
    loadLeaderboard(true);
  }
}

async function loadSchoolLeaderboard() {
  var container = document.getElementById('leaderboard-container');
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-muted);">Loading...</div>';

  try {
    var data = await apiClient.getSchoolLeaderboard();
    renderSchoolLeaderboard(data.schools || []);
  } catch (error) {
    console.error('Failed to load school leaderboard:', error);
    container.innerHTML = '<div class="error-message">Failed to load school leaderboard</div>';
  }
}

function renderSchoolLeaderboard(schools) {
  var container = document.getElementById('leaderboard-container');

  if (!schools || schools.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);">No schools with 3+ players yet.</p>';
    return;
  }

  var html = '<table class="leaderboard-table">';
  html += '<thead><tr>';
  html += '<th>Rank</th>';
  html += '<th>School</th>';
  html += '<th>Players</th>';
  html += '<th>Avg Score</th>';
  html += '<th>Best Score</th>';
  html += '<th>Games</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  schools.forEach(function (s) {
    html += '<tr>';
    html += '<td class="rank">#' + s.rank + '</td>';
    html += '<td><strong>' + s.school + '</strong></td>';
    html += '<td>' + s.player_count + '</td>';
    html += '<td><strong>' + Math.round(s.avg_score).toLocaleString() + '</strong></td>';
    html += '<td>' + s.best_score.toLocaleString() + '</td>';
    html += '<td>' + s.total_games + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// Submit game score
async function submitGameScore(gameData) {
  if (!apiClient.isAuthenticated()) {
    console.error('User must be authenticated to submit scores');
    return false;
  }

  // Remote log the submission attempt with score details
  if (typeof remoteLogger !== 'undefined') {
    await remoteLogger.info('Game submission attempt', {
      score: gameData.score,
      moves_count: gameData.moves_count,
      best_tile: gameData.best_tile,
      game_duration: gameData.game_duration,
      move_history_length: gameData.move_history ? gameData.move_history.length : 0,
      avg_score_per_move: gameData.moves_count > 0 ? (gameData.score / gameData.moves_count).toFixed(2) : 0
    });
  }

  try {
    console.log('Submitting game:', gameData);
    console.log('Game data JSON:', JSON.stringify(gameData, null, 2));
    const result = await apiClient.submitGame(gameData);

    if (result.validated) {
      console.log('Game validated and submitted successfully');

      // Remote log success
      if (typeof remoteLogger !== 'undefined') {
        await remoteLogger.info('Game submission successful', {
          score: gameData.score,
          validated: true
        });
      }

      // Track successful score submission
      if (typeof gtag !== 'undefined') {
        gtag('event', 'score_submitted', {
          'event_category': 'Gameplay',
          'event_label': 'Score Submitted Successfully',
          'value': gameData.score
        });
      }
    } else {
      console.warn('Game was flagged:', result.validation_error);

      // Remote log flagged game with details
      if (typeof remoteLogger !== 'undefined') {
        await remoteLogger.warn('Game was flagged by server', {
          score: gameData.score,
          validation_error: result.validation_error,
          moves_count: gameData.moves_count,
          avg_score_per_move: gameData.moves_count > 0 ? (gameData.score / gameData.moves_count).toFixed(2) : 0
        });
      }

      // Track flagged game
      if (typeof gtag !== 'undefined') {
        gtag('event', 'game_flagged', {
          'event_category': 'Gameplay',
          'event_label': result.validation_error || 'Unknown Reason'
        });
      }
    }

    // Leaderboard will update automatically via WebSocket
    return true;
  } catch (error) {
    console.error('Failed to submit game:', error);
    console.error('Error details:', error.message);

    // Handle 401 Unauthorized (expired or invalid token)
    if (error.status === 401) {
      console.warn('Authentication failed - token may be expired');

      // Clear expired authentication
      if (typeof apiClient !== 'undefined') {
        apiClient.clearAuth();
        updateUserInfo(null);
      }

      // Show auth modal to prompt re-login
      if (typeof showAuthModal === 'function') {
        showAuthModal();
      }

      // Notify user
      Toast.show('Session expired — please log in again', 'warning');

      // Remote log the 401 error
      if (typeof remoteLogger !== 'undefined') {
        await remoteLogger.warn('Game submission failed - session expired', {
          score: gameData.score,
          moves_count: gameData.moves_count,
          error_message: 'HTTP 401 - Token expired or invalid'
        });
      }

      return false;
    }

    // Remote log the error with full details
    if (typeof remoteLogger !== 'undefined') {
      await remoteLogger.error('Game submission failed', {
        score: gameData.score,
        moves_count: gameData.moves_count,
        error_message: error.message,
        error_stack: error.stack,
        response_status: error.response ? error.response.status : null,
        response_data: error.response ? error.response.data : null
      });
    }

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  // Initialize WebSocket
  initializeSocket();

  // Load initial leaderboard
  loadLeaderboard();
});
