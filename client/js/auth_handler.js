/**
 * Authentication Handler for GetFrisch
 * Manages user authentication UI and state
 */

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
  }
}

async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showAuthError('Please enter username and password');
    return;
  }

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
  } else {
    // User is not authenticated
    userInfoDiv.style.display = 'none';
    authButtonsDiv.style.display = 'flex';
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
}

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
    alert('School updated successfully!');
  } catch (error) {
    console.error('Failed to update school:', error);
    errorDiv.textContent = error.message || 'Failed to update school. Please try again.';
    errorDiv.style.display = 'block';
  }
}

async function clearSchool() {
  try {
    const result = await apiClient.updateSchool('');
    console.log('School cleared:', result);

    closeSchoolModal();
    updateUserInfo(result.user);

    // Show success message
    alert('School cleared successfully!');
  } catch (error) {
    console.error('Failed to clear school:', error);
    const errorDiv = document.getElementById('schoolError');
    errorDiv.textContent = error.message || 'Failed to clear school. Please try again.';
    errorDiv.style.display = 'block';
  }
}
