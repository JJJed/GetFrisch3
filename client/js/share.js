/**
 * Share Functionality for GetFrisch
 * Web Share API on mobile, clipboard fallback on desktop
 */

var Share = (function () {

  function getShareText() {
    if (typeof gameManager === 'undefined') return null;

    var score = gameManager.score || 0;
    var bestTile = gameManager.bestTileValue || 0;
    var won = gameManager.won;
    var tileSchool = (typeof TILE_SCHOOLS !== 'undefined') ? TILE_SCHOOLS[bestTile] : null;
    var tileLabel = tileSchool ? tileSchool : bestTile;

    var text = won
      ? 'I reached Frisch with a score of ' + score.toLocaleString() + '! Can you beat me?'
      : 'I scored ' + score.toLocaleString() + ' on GetFrisch (reached ' + tileLabel + ')! Can you beat me?';

    return text + ' https://getfrisch.jedd.dev';
  }

  async function share() {
    var text = getShareText();
    if (!text) return;

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GetFrisch!',
          text: text
        });
        return;
      } catch (e) {
        // User cancelled or share failed — fall through to clipboard
        if (e.name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      Toast.show('Copied to clipboard!', 'success');
    } catch (e) {
      // Final fallback for older browsers
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      Toast.show('Copied to clipboard!', 'success');
    }
  }

  // Expose globally
  window.shareGame = share;

  return { share: share };
})();
