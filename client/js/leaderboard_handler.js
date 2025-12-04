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
    renderLeaderboard(data.leaderboard);
  });

  socket.on('leaderboard_changed', (data) => {
    console.log('Leaderboard changed, fetching new data...');
    // Refresh leaderboard when a new score is submitted
    socket.emit('request_leaderboard');
  });

  socket.on('error', (data) => {
    console.error('Socket error:', data.message);
  });
}

// Load leaderboard via API
async function loadLeaderboard() {
  try {
    const data = await apiClient.getLeaderboard(100);
    renderLeaderboard(data.leaderboard);
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    document.getElementById('leaderboard-container').innerHTML =
      '<div class="error-message">Failed to load leaderboard</div>';
  }
}

// Render leaderboard table
function renderLeaderboard(leaderboard) {
  const container = document.getElementById('leaderboard-container');

  if (!leaderboard || leaderboard.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No scores yet. Be the first!</p>';
    return;
  }

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
    const rank = game.rank || (index + 1);
    const verifiedBadge = game.is_verified ? '<span class="verified">✓</span>' : '';
    const winBadge = game.is_win ? '<span style="color: #A31F34; margin-left: 4px;">👑</span>' : '';

    // Format date
    let dateStr = 'N/A';
    if (game.created_at) {
      const date = new Date(game.created_at);
      dateStr = date.toLocaleDateString();
    }

    // Format school or show '-' if not set
    const schoolDisplay = game.school || '-';

    html += '<tr>';
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
}

// Submit game score
async function submitGameScore(gameData) {
  if (!apiClient.isAuthenticated()) {
    console.error('User must be authenticated to submit scores');
    return false;
  }

  try {
    console.log('Submitting game:', gameData);
    console.log('Game data JSON:', JSON.stringify(gameData, null, 2));
    const result = await apiClient.submitGame(gameData);

    if (result.validated) {
      console.log('Game validated and submitted successfully');
    } else {
      console.warn('Game was flagged:', result.validation_error);
    }

    // Leaderboard will update automatically via WebSocket
    return true;
  } catch (error) {
    console.error('Failed to submit game:', error);
    console.error('Error details:', error.message);
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
