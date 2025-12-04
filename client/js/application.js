// Global game manager reference
var gameManager;

// Initialize the game with appropriate score manager
function initializeGame() {
  // Use AccountScoreManager if authenticated, otherwise LocalScoreManager
  var ScoreManager = apiClient.isAuthenticated() ? AccountScoreManager : LocalScoreManager;

  // Wait till the browser is ready to render the game (avoids glitches)
  window.requestAnimationFrame(function () {
    gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, ScoreManager);
  });
}

// Start the game on page load
initializeGame();

// Function to refresh the game with account-based high score after login
async function refreshGameScore() {
  if (gameManager && gameManager.scoreManager && gameManager.scoreManager.refresh) {
    await gameManager.scoreManager.refresh();
  }
}
