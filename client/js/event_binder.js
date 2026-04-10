/**
 * Event Binder for GetFrisch
 * Replaces all inline onclick/onchange/onkeypress handlers with addEventListener calls
 */

document.addEventListener('DOMContentLoaded', function () {

  // --- Utility ---
  function bindClick(selector, handler) {
    var el = document.querySelector(selector);
    if (el) el.addEventListener('click', handler);
  }

  function bindClickAll(selector, handler) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener('click', handler);
    });
  }

  // --- Close buttons (X) on modals ---
  bindClick('#authModal .close', function () { closeAuthModal(); });
  bindClick('#schoolModal .close', function () { closeSchoolModal(); });
  bindClick('#replayModal .close', function () { closeReplay(); });

  // --- Auth form buttons ---
  bindClick('#anonymousForm > button', function () { loginAnonymous(); });
  bindClick('#loginForm > button', function () { login(); });
  bindClick('#registerForm > button', function () { register(); });

  // --- Auth toggle links ---
  // Anonymous form toggles
  var anonToggles = document.querySelectorAll('#anonymousForm .auth-toggle a');
  if (anonToggles.length >= 2) {
    anonToggles[0].addEventListener('click', function () { showRegisterForm(); });
    anonToggles[1].addEventListener('click', function () { showLoginForm(); });
  }

  // Login form toggles
  var loginToggles = document.querySelectorAll('#loginForm .auth-toggle a');
  if (loginToggles.length >= 2) {
    loginToggles[0].addEventListener('click', function () { showAnonymousForm(); });
    loginToggles[1].addEventListener('click', function () { showRegisterForm(); });
  }

  // Register form toggles
  var registerToggles = document.querySelectorAll('#registerForm .auth-toggle a');
  if (registerToggles.length >= 2) {
    registerToggles[0].addEventListener('click', function () { showAnonymousForm(); });
    registerToggles[1].addEventListener('click', function () { showLoginForm(); });
  }

  // --- Google username modal ---
  bindClick('#usernameModal button', function () { completeGoogleSignup(); });
  var googleUsernameInput = document.getElementById('googleUsername');
  if (googleUsernameInput) {
    googleUsernameInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') completeGoogleSignup();
    });
  }

  // --- School modal ---
  bindClick('#schoolModal button#saveSchoolBtn', function () { saveSchool(); });
  bindClick('#schoolModal button#clearSchoolBtn', function () { clearSchool(); });
  var schoolInput = document.getElementById('schoolInput');
  if (schoolInput) {
    schoolInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') saveSchool();
    });
  }

  // --- Replay controls ---
  bindClick('#replay-back', function () { replayStepBack(); });
  bindClick('#replay-play', function () { replayTogglePlay(); });
  bindClick('#replay-fwd', function () { replayStepFwd(); });
  var replaySpeed = document.getElementById('replay-speed');
  if (replaySpeed) {
    replaySpeed.addEventListener('change', function () { replaySetSpeed(this.value); });
  }

  // --- Top controls ---
  bindClick('#muteToggleBtn', function () { toggleGameMute(); });
  bindClick('#darkModeToggle', function () { toggleDarkMode(); });

  // --- Auth buttons (not logged in) ---
  bindClick('#authButtons button', function () { showAuthModal(); });

  // --- Game overlay ---
  bindClick('.share-button', function () { shareGame(); });

  // --- Profile panel ---
  bindClick('#toggle-history-btn', function () { toggleHistory(); });
  bindClick('#history-load-more', function () { loadMoreHistory(); });

  // --- Leaderboard tabs ---
  bindClickAll('.lb-tab', function () {
    switchLeaderboardTab(this.getAttribute('data-tab'));
  });

  // --- Period filter buttons ---
  bindClickAll('.period-btn', function () {
    var period = this.getAttribute('data-period');
    setPeriodFilter(period === 'all' ? null : period);
  });

  // --- School filter dropdown ---
  var schoolFilter = document.getElementById('school-filter');
  if (schoolFilter) {
    schoolFilter.addEventListener('change', function () { setSchoolFilter(this.value); });
  }

  // --- Vote button ---
  bindClick('.vote-btn', function () {
    window.open('https://docs.google.com/forms/d/e/1FAIpQLSeSS8AC_Z0FrtSu4qS28rapr0WfIA7chX62vTNu-aUeAw3KYw/viewform?usp=dialog', '_blank');
  });
});
