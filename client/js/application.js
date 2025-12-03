// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  var gm = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalScoreManager);

  // DEBUG ONLY: Expose game manager for testing
  // Remove this in production or set window.DEBUG_MODE = false
  if (typeof window.DEBUG_MODE === 'undefined' || window.DEBUG_MODE === true) {
    window.gameManager = gm;
  }
});
