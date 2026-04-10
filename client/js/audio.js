/**
 * Sound & Haptics for GetFrisch
 * Procedural Web Audio API sounds — no audio files needed
 */

var GameAudio = (function () {
  var ctx = null;
  var muted = false;

  function getContext() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    return ctx;
  }

  function isMuted() {
    return muted;
  }

  function setMuted(val) {
    muted = val;
    localStorage.setItem('gameMuted', val ? 'true' : 'false');
    var icon = document.getElementById('muteIcon');
    if (icon) icon.innerHTML = muted ? '&#x1F507;' : '&#x1F50A;';
  }

  function toggleMute() {
    setMuted(!muted);
  }

  function init() {
    var stored = localStorage.getItem('gameMuted');
    if (stored === 'true') {
      muted = true;
      var icon = document.getElementById('muteIcon');
      if (icon) icon.innerHTML = '&#x1F507;';
    }
  }

  // Play a simple tone
  function playTone(freq, duration, type, volume) {
    if (muted) return;
    var c = getContext();
    if (!c) return;

    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = volume || 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  // Tile slide — soft click
  function playSlide() {
    playTone(800, 0.06, 'sine', 0.05);
  }

  // Tile merge — satisfying pop
  function playMerge() {
    playTone(520, 0.12, 'sine', 0.08);
    setTimeout(function () { playTone(780, 0.1, 'sine', 0.06); }, 30);

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  // Game win — short fanfare
  function playWin() {
    playTone(523, 0.15, 'sine', 0.1);
    setTimeout(function () { playTone(659, 0.15, 'sine', 0.1); }, 120);
    setTimeout(function () { playTone(784, 0.15, 'sine', 0.1); }, 240);
    setTimeout(function () { playTone(1047, 0.3, 'sine', 0.12); }, 360);
  }

  // Game over — subtle descending tone
  function playGameOver() {
    playTone(400, 0.2, 'triangle', 0.06);
    setTimeout(function () { playTone(300, 0.3, 'triangle', 0.04); }, 150);
  }

  window.toggleGameMute = toggleMute;

  return {
    init: init,
    playSlide: playSlide,
    playMerge: playMerge,
    playWin: playWin,
    playGameOver: playGameOver,
    isMuted: isMuted,
    toggleMute: toggleMute
  };
})();
