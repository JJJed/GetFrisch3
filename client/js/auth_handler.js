/**
 * Authentication Handler for GetFrisch
 * Manages user authentication UI and state
 */

// Button loading state utility
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button._originalText = button.textContent;
    button.disabled = true;
    button.classList.add('btn-loading');
    button.innerHTML = '<span class="btn-spinner"></span>';
  } else {
    button.disabled = false;
    button.classList.remove('btn-loading');
    button.textContent = button._originalText || '';
  }
}

// Show/hide auth modal
function showAuthModal() {
  document.getElementById('authModal').style.display = 'block';
  showAnonymousForm();
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
  clearAuthError();
}

// Form switching
function showAnonymousForm() {
  document.getElementById('anonymousForm').style.display = 'flex';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('authTitle').textContent = 'Welcome to GetFrisch';
  clearAuthError();
}

function showLoginForm() {
  document.getElementById('anonymousForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'flex';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('authTitle').textContent = 'Login';
  clearAuthError();
}

function showRegisterForm() {
  document.getElementById('anonymousForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'flex';
  document.getElementById('authTitle').textContent = 'Create Account';
  clearAuthError();
}

// Error handling
function showAuthError(message) {
  document.getElementById('authError').textContent = message;
}

function clearAuthError() {
  document.getElementById('authError').textContent = '';
}

// Auth actions
async function loginAnonymous() {
  const username = document.getElementById('anonUsername').value.trim();

  if (!username) {
    showAuthError('Please enter a name');
    return;
  }

  const btn = document.querySelector('#anonymousForm button');
  setButtonLoading(btn, true);

  try {
    const result = await apiClient.loginAnonymous(username);
    console.log('Anonymous login successful:', result);

    // Track anonymous play start
    if (typeof gtag !== 'undefined') {
      gtag('event', 'anonymous_play_start', {
        'event_category': 'Authentication',
        'event_label': 'Anonymous User'
      });
    }

    closeAuthModal();
    updateUserInfo(result.user);

    // Reinitialize game with account-based score manager
    initializeGame();
  } catch (error) {
    showAuthError(error.message);
  } finally {
    setButtonLoading(btn, false);
  }
}

async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showAuthError('Please enter username and password');
    return;
  }

  const btn = document.querySelector('#loginForm button');
  setButtonLoading(btn, true);

  try {
    const result = await apiClient.login(username, password);
    console.log('Login successful:', result);

    // Track login
    if (typeof gtag !== 'undefined') {
      gtag('event', 'login', {
        'event_category': 'Authentication',
        'event_label': 'Username/Password Login',
        'method': 'password'
      });
    }

    closeAuthModal();
    updateUserInfo(result.user);

    // Reinitialize game with account-based score manager
    initializeGame();
  } catch (error) {
    showAuthError(error.message);
  } finally {
    setButtonLoading(btn, false);
  }
}

async function register() {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!username || !password) {
    showAuthError('Username and password are required');
    return;
  }

  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters');
    return;
  }

  const btn = document.querySelector('#registerForm button');
  setButtonLoading(btn, true);

  try {
    const result = await apiClient.register(username, password, email || null);
    console.log('Registration successful:', result);

    // Track registration
    if (typeof gtag !== 'undefined') {
      gtag('event', 'sign_up', {
        'event_category': 'Authentication',
        'event_label': 'New Account Registration',
        'method': 'password'
      });
    }

    closeAuthModal();
    updateUserInfo(result.user);

    // Reinitialize game with account-based score manager
    initializeGame();
  } catch (error) {
    showAuthError(error.message);
  } finally {
    setButtonLoading(btn, false);
  }
}

function logout() {
  // Track logout
  if (typeof gtag !== 'undefined') {
    gtag('event', 'logout', {
      'event_category': 'Authentication',
      'event_label': 'User Logout'
    });
  }

  apiClient.clearAuth();
  updateUserInfo(null);

  // Reinitialize game with local score manager
  initializeGame();

  showAuthModal();
}

// Store Google data temporarily for username selection
let pendingGoogleData = null;

// Google Sign-In handler
async function handleCredentialResponse(response) {
  try {
    // Send the credential to the backend
    const result = await apiClient.loginWithGoogle(response.credential);
    console.log('Google authentication response:', result);

    // Check if user needs to choose a username (first-time Google user)
    if (result.needs_username) {
      console.log('New Google user - requesting username');
      pendingGoogleData = result.google_data;
      closeAuthModal();
      showUsernameModal();
      return;
    }

    // Existing user - complete login
    // Track Google login
    if (typeof gtag !== 'undefined') {
      gtag('event', 'login', {
        'event_category': 'Authentication',
        'event_label': 'Google Sign-In',
        'method': 'google'
      });
    }

    closeAuthModal();
    updateUserInfo(result.user);

    // Reinitialize game with account-based score manager
    initializeGame();
  } catch (error) {
    console.error('Google authentication failed:', error);
    showAuthError(error.message || 'Google authentication failed. Please try again.');
  }
}

// Show username selection modal
function showUsernameModal() {
  const modal = document.getElementById('usernameModal');
  const input = document.getElementById('googleUsername');
  const errorDiv = document.getElementById('usernameError');

  // Clear previous input and errors
  input.value = '';
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';

  modal.style.display = 'block';
  input.focus();
}

// Hide username selection modal
function closeUsernameModal() {
  const modal = document.getElementById('usernameModal');
  modal.style.display = 'none';
  pendingGoogleData = null;
}

// Complete Google sign-up with chosen username
async function completeGoogleSignup() {
  const input = document.getElementById('googleUsername');
  const errorDiv = document.getElementById('usernameError');
  const username = input.value.trim();

  // Clear previous errors
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';

  // Validate username
  if (!username) {
    errorDiv.textContent = 'Please enter a username';
    errorDiv.style.display = 'block';
    return;
  }

  if (username.length < 3) {
    errorDiv.textContent = 'Username must be at least 3 characters';
    errorDiv.style.display = 'block';
    return;
  }

  if (username.length > 20) {
    errorDiv.textContent = 'Username must be less than 20 characters';
    errorDiv.style.display = 'block';
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errorDiv.textContent = 'Username can only contain letters, numbers, and underscores';
    errorDiv.style.display = 'block';
    return;
  }

  const btn = document.querySelector('#usernameModal button');
  setButtonLoading(btn, true);

  try {
    // Complete registration
    const result = await apiClient.completeGoogleSignup(username, pendingGoogleData);
    console.log('Google registration completed:', result);

    // Track Google sign-up
    if (typeof gtag !== 'undefined') {
      gtag('event', 'sign_up', {
        'event_category': 'Authentication',
        'event_label': 'Google Sign-Up',
        'method': 'google'
      });
    }

    closeUsernameModal();
    updateUserInfo(result.user);

    // Reinitialize game with account-based score manager
    initializeGame();
  } catch (error) {
    console.error('Username selection failed:', error);
    errorDiv.textContent = error.message || 'Failed to complete registration. Please try again.';
    errorDiv.style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
}

// Update UI based on auth state
function updateUserInfo(user) {
  const userInfoDiv = document.getElementById('userInfo');
  const authButtonsDiv = document.getElementById('authButtons');

  if (user) {
    // User is authenticated
    const verifiedBadge = user.is_verified ? '<span class="verified-badge">✓ Verified</span>' : '';
    const anonymousBadge = user.is_anonymous ? '<span style="color: #999;"> (Guest)</span>' : '';

    userInfoDiv.innerHTML = `
      <div class="user-info-content">
        <div class="user-name-section">
          <span class="username">${user.username}</span>${verifiedBadge}${anonymousBadge}
        </div>
        <div class="user-buttons-section">
          <button onclick="showSchoolModal()">Set School</button>
          <button onclick="logout()">Logout</button>
        </div>
      </div>
    `;
    userInfoDiv.style.display = 'block';
    authButtonsDiv.style.display = 'none';

    // Show profile panel for non-anonymous users
    if (!user.is_anonymous && typeof ProfilePanel !== 'undefined') {
      ProfilePanel.show();
    } else if (typeof ProfilePanel !== 'undefined') {
      ProfilePanel.hide();
    }
  } else {
    // User is not authenticated
    userInfoDiv.style.display = 'none';
    authButtonsDiv.style.display = 'flex';
    if (typeof ProfilePanel !== 'undefined') {
      ProfilePanel.hide();
    }
  }
}

// Initialize Google Sign-In
function initializeGoogleSignIn() {
  if (typeof google === 'undefined' || !google.accounts) {
    console.warn('Google Sign-In library not loaded yet');
    return;
  }

  const CLIENT_ID = '655055837752-sv8svj1930m55b0e3las17hr7915krob.apps.googleusercontent.com';

  // Initialize the Google Sign-In library
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredentialResponse
  });

  // Render buttons with maximum width (Google's max is 400px)
  // CSS will handle centering and stretching to container width
  google.accounts.id.renderButton(
    document.getElementById('googleButtonAnon'),
    {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 400
    }
  );

  google.accounts.id.renderButton(
    document.getElementById('googleButtonLogin'),
    {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 400
    }
  );

  google.accounts.id.renderButton(
    document.getElementById('googleButtonRegister'),
    {
      theme: 'outline',
      size: 'large',
      text: 'signup_with',
      shape: 'rectangular',
      width: 400
    }
  );

  console.log('Google Sign-In initialized successfully');
}

// Check authentication on page load
window.addEventListener('DOMContentLoaded', async () => {
  // Check if we have stored auth data
  const storedUser = apiClient.getStoredUser();

  if (apiClient.isAuthenticated() && storedUser) {
    // User is authenticated and we have cached user data
    updateUserInfo(storedUser);

    // Verify token is still valid in the background
    apiClient.getCurrentUser().catch(error => {
      console.error('Token expired or invalid:', error);
      apiClient.clearAuth();
      updateUserInfo(null);
      showAuthModal();
    });
  } else if (apiClient.isAuthenticated()) {
    // We have a token but no user data - fetch it
    try {
      const user = await apiClient.getCurrentUser();
      updateUserInfo(user);
    } catch (error) {
      console.error('Failed to get current user:', error);
      apiClient.clearAuth();
      showAuthModal();
    }
  } else {
    // No authentication - show modal
    showAuthModal();
  }

  // Initialize Google Sign-In after a short delay to ensure library is loaded
  setTimeout(initializeGoogleSignIn, 100);
});

// Close modal when clicking outside of it
window.onclick = function(event) {
  const modal = document.getElementById('authModal');
  if (event.target == modal) {
    // Don't close if user is not authenticated
    if (apiClient.isAuthenticated()) {
      closeAuthModal();
    }
  }

  const schoolModal = document.getElementById('schoolModal');
  if (event.target == schoolModal) {
    closeSchoolModal();
  }

  const replayModal = document.getElementById('replayModal');
  if (event.target == replayModal && typeof closeReplay === 'function') {
    closeReplay();
  }
}

// Escape key to close modals
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    var replayModal = document.getElementById('replayModal');
    if (replayModal && replayModal.style.display !== 'none') {
      if (typeof closeReplay === 'function') closeReplay();
      return;
    }

    var schoolModal = document.getElementById('schoolModal');
    if (schoolModal && schoolModal.style.display !== 'none') {
      closeSchoolModal();
      return;
    }

    var usernameModal = document.getElementById('usernameModal');
    if (usernameModal && usernameModal.style.display !== 'none') {
      return; // Can't escape username selection
    }

    var authModal = document.getElementById('authModal');
    if (authModal && authModal.style.display !== 'none' && apiClient.isAuthenticated()) {
      closeAuthModal();
    }
  }
});

// Focus trapping for modals
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Tab') return;

  var activeModal = document.querySelector('.modal[style*="display: block"], .modal:not([style*="display: none"])[role="dialog"]');
  if (!activeModal || activeModal.style.display === 'none') return;

  var focusable = activeModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;

  var first = focusable[0];
  var last = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      last.focus();
      e.preventDefault();
    }
  } else {
    if (document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }
});

// School Modal Functions
function showSchoolModal() {
  const modal = document.getElementById('schoolModal');
  const input = document.getElementById('schoolInput');
  const errorDiv = document.getElementById('schoolError');

  // Pre-fill with current school if available
  const currentUser = apiClient.getStoredUser();
  input.value = currentUser && currentUser.school ? currentUser.school : '';

  // Clear previous errors
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';

  modal.style.display = 'block';
  input.focus();
}

function closeSchoolModal() {
  const modal = document.getElementById('schoolModal');
  modal.style.display = 'none';
}

async function saveSchool() {
  const input = document.getElementById('schoolInput');
  const errorDiv = document.getElementById('schoolError');
  const school = input.value.trim();

  // Clear previous errors
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';

  // Validate school name
  if (school && school.length > 15) {
    errorDiv.textContent = 'School name must be 15 characters or less';
    errorDiv.style.display = 'block';
    return;
  }

  const btn = document.querySelector('#schoolModal button[onclick="saveSchool()"]');
  setButtonLoading(btn, true);

  try {
    const result = await apiClient.updateSchool(school);
    console.log('School updated:', result);

    // Track school selection
    if (typeof gtag !== 'undefined') {
      gtag('event', 'school_selected', {
        'event_category': 'User Profile',
        'event_label': school || 'None',
        'value': school ? 1 : 0
      });
    }

    closeSchoolModal();
    updateUserInfo(result.user);

    // Show success message
    Toast.show('School updated successfully!', 'success');
  } catch (error) {
    console.error('Failed to update school:', error);
    errorDiv.textContent = error.message || 'Failed to update school. Please try again.';
    errorDiv.style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
}

async function clearSchool() {
  try {
    const result = await apiClient.updateSchool('');
    console.log('School cleared:', result);

    closeSchoolModal();
    updateUserInfo(result.user);

    // Show success message
    Toast.show('School cleared successfully!', 'success');
  } catch (error) {
    console.error('Failed to clear school:', error);
    const errorDiv = document.getElementById('schoolError');
    errorDiv.textContent = error.message || 'Failed to clear school. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// ==========================================
// Real-Time Form Validation
// ==========================================

var _usernameCheckTimer = null;

function setFieldState(input, state, message) {
  // Remove previous states
  input.classList.remove('input-valid', 'input-error');
  var feedback = input.parentNode.querySelector('.field-feedback');
  if (!feedback) {
    feedback = document.createElement('span');
    feedback.className = 'field-feedback';
    input.parentNode.insertBefore(feedback, input.nextSibling);
  }

  if (state === 'valid') {
    input.classList.add('input-valid');
    feedback.textContent = message || '';
    feedback.className = 'field-feedback feedback-valid';
  } else if (state === 'error') {
    input.classList.add('input-error');
    feedback.textContent = message || '';
    feedback.className = 'field-feedback feedback-error';
  } else {
    feedback.textContent = '';
    feedback.className = 'field-feedback';
  }
}

function validateUsernameFormat(value) {
  if (!value) return null;
  if (value.length < 3) return 'Must be at least 3 characters';
  if (value.length > 20) return 'Must be 20 characters or less';
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Letters, numbers, and underscores only';
  return null;
}

function checkUsernameAvailability(input) {
  var value = input.value.trim();
  var formatError = validateUsernameFormat(value);
  if (formatError) {
    setFieldState(input, 'error', formatError);
    return;
  }
  if (!value) {
    setFieldState(input, '', '');
    return;
  }

  // Debounce the server check
  clearTimeout(_usernameCheckTimer);
  _usernameCheckTimer = setTimeout(async function () {
    try {
      var result = await apiClient.checkUsername(value);
      if (result.available) {
        setFieldState(input, 'valid', 'Available');
      } else {
        setFieldState(input, 'error', 'Username taken');
      }
    } catch (e) {
      // Don't show error for network issues during typing
      setFieldState(input, '', '');
    }
  }, 300);
}

function validateEmail(input) {
  var value = input.value.trim();
  if (!value) {
    setFieldState(input, '', '');
    return;
  }
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(value)) {
    setFieldState(input, 'valid', '');
  } else {
    setFieldState(input, 'error', 'Invalid email format');
  }
}

function validatePassword(input) {
  var value = input.value;
  if (!value) {
    setFieldState(input, '', '');
    return;
  }

  var strength = 0;
  if (value.length >= 6) strength++;
  if (value.length >= 10) strength++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) strength++;
  if (/[0-9]/.test(value)) strength++;
  if (/[^a-zA-Z0-9]/.test(value)) strength++;

  if (value.length < 6) {
    setFieldState(input, 'error', 'Min 6 characters');
  } else if (strength <= 2) {
    setFieldState(input, 'error', 'Weak');
    input.classList.remove('input-error');
    input.classList.add('input-warning');
  } else if (strength <= 3) {
    setFieldState(input, 'valid', 'Medium');
  } else {
    setFieldState(input, 'valid', 'Strong');
  }
}

// Attach validation listeners after DOM is ready
window.addEventListener('DOMContentLoaded', function () {
  // Registration form
  var regUsername = document.getElementById('regUsername');
  var regEmail = document.getElementById('regEmail');
  var regPassword = document.getElementById('regPassword');

  if (regUsername) {
    regUsername.addEventListener('blur', function () { checkUsernameAvailability(regUsername); });
    regUsername.addEventListener('input', function () {
      var err = validateUsernameFormat(regUsername.value.trim());
      if (err) setFieldState(regUsername, 'error', err);
      else setFieldState(regUsername, '', '');
    });
  }

  if (regEmail) {
    regEmail.addEventListener('blur', function () { validateEmail(regEmail); });
  }

  if (regPassword) {
    regPassword.addEventListener('input', function () { validatePassword(regPassword); });
  }

  // Google username modal
  var googleUsername = document.getElementById('googleUsername');
  if (googleUsername) {
    googleUsername.addEventListener('blur', function () { checkUsernameAvailability(googleUsername); });
    googleUsername.addEventListener('input', function () {
      var err = validateUsernameFormat(googleUsername.value.trim());
      if (err) setFieldState(googleUsername, 'error', err);
      else setFieldState(googleUsername, '', '');
    });
  }
});
