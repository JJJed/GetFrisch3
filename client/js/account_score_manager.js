/**
 * Account Score Manager
 * Manages high scores based on user account data from the server
 */

function AccountScoreManager() {
  this.bestScore = 0;
  this.initialized = false;

  // Initialize with server data on creation
  this.initialize();
}

/**
 * Initialize by fetching user's best score from server
 */
AccountScoreManager.prototype.initialize = async function() {
  if (!apiClient.isAuthenticated()) {
    console.log('User not authenticated, cannot fetch account high score');
    return;
  }

  try {
    const stats = await apiClient.getUserStats();
    this.bestScore = stats.stats.best_score || 0;
    this.initialized = true;

    // Update the display immediately if it exists
    const bestContainer = document.querySelector('.best-container');
    if (bestContainer) {
      bestContainer.textContent = this.bestScore;
    }

    console.log('Account high score loaded:', this.bestScore);
  } catch (error) {
    console.error('Failed to load account high score:', error);
    this.bestScore = 0;
  }
};

/**
 * Get the current best score
 */
AccountScoreManager.prototype.get = function() {
  return this.bestScore;
};

/**
 * Set a new best score (updates locally, actual save happens on game submission)
 */
AccountScoreManager.prototype.set = function(score) {
  if (score > this.bestScore) {
    this.bestScore = score;
    console.log('New account high score:', this.bestScore);
  }
};

/**
 * Refresh the best score from the server
 */
AccountScoreManager.prototype.refresh = async function() {
  await this.initialize();
};
