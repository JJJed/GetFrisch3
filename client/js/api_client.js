/**
 * API Client for GetFrisch
 * Handles all communication with the backend server
 */

const API_BASE_URL = window.location.origin + '/api';

class APIClient {
  constructor() {
    this.token = localStorage.getItem('authToken');
    // Load user from localStorage if available
    const storedUser = localStorage.getItem('authUser');
    this.user = storedUser ? JSON.parse(storedUser) : null;
  }

  /**
   * Make an authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      // Try to parse response as JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, get as text
        const text = await response.text();
        console.error('Non-JSON response:', text);
        data = { error: text || `HTTP ${response.status}` };
      }

      if (!response.ok) {
        console.error(`API Error ${response.status}:`, data);
        const error = new Error(data.error || data.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  /**
   * Set user data
   */
  setUser(user) {
    this.user = user;
    localStorage.setItem('authUser', JSON.stringify(user));
  }

  /**
   * Get stored user
   */
  getStoredUser() {
    return this.user;
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token;
  }

  // ===== AUTH ENDPOINTS =====

  /**
   * Register a new user account
   */
  async register(username, password, email = null) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email })
    });

    if (data.access_token) {
      this.setToken(data.access_token);
      this.setUser(data.user);
    }

    return data;
  }

  /**
   * Login with username and password
   */
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (data.access_token) {
      this.setToken(data.access_token);
      this.setUser(data.user);
    }

    return data;
  }

  /**
   * Create an anonymous user session
   */
  async loginAnonymous(username) {
    const data = await this.request('/auth/anonymous', {
      method: 'POST',
      body: JSON.stringify({ username })
    });

    if (data.access_token) {
      this.setToken(data.access_token);
      this.setUser(data.user);
    }

    return data;
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    const data = await this.request('/auth/me');
    this.setUser(data.user);
    return data.user;
  }

  /**
   * Check if username is available
   */
  async checkUsername(username) {
    return await this.request('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  }

  /**
   * Authenticate with Google OAuth
   */
  async loginWithGoogle(credential) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });

    if (data.access_token) {
      this.setToken(data.access_token);
      this.setUser(data.user);
    }

    return data;
  }

  /**
   * Complete Google sign-in by choosing a username
   */
  async completeGoogleSignup(username, googleData) {
    const data = await this.request('/auth/google/complete', {
      method: 'POST',
      body: JSON.stringify({
        username,
        google_id: googleData.google_id,
        email: googleData.email,
        name: googleData.name,
        picture: googleData.picture
      })
    });

    if (data.access_token) {
      this.setToken(data.access_token);
      this.setUser(data.user);
    }

    return data;
  }

  /**
   * Update user's school affiliation
   */
  async updateSchool(school) {
    const data = await this.request('/auth/update-school', {
      method: 'POST',
      body: JSON.stringify({ school })
    });

    if (data.user) {
      this.setUser(data.user);
    }

    return data;
  }

  // ===== GAME ENDPOINTS =====

  /**
   * Submit a completed game
   */
  async submitGame(gameData) {
    return await this.request('/game/submit', {
      method: 'POST',
      body: JSON.stringify(gameData)
    });
  }

  /**
   * Get user's game history
   */
  async getGameHistory(page = 1, perPage = 20) {
    return await this.request(`/game/history?page=${page}&per_page=${perPage}`);
  }

  /**
   * Get game details by ID
   */
  async getGameDetails(gameId) {
    return await this.request(`/game/${gameId}`);
  }

  /**
   * Get user's game statistics
   */
  async getUserStats() {
    return await this.request('/game/stats');
  }

  // ===== LEADERBOARD ENDPOINTS =====

  /**
   * Get the global leaderboard
   */
  async getLeaderboard(limit = 100) {
    return await this.request(`/leaderboard/?limit=${limit}`);
  }

  /**
   * Get a user's rank
   */
  async getUserRank(userId) {
    return await this.request(`/leaderboard/user/${userId}`);
  }

  /**
   * Get top players
   */
  async getTopPlayers(limit = 10) {
    return await this.request(`/leaderboard/top-players?limit=${limit}`);
  }

  /**
   * Get recent games
   */
  async getRecentGames(limit = 20) {
    return await this.request(`/leaderboard/recent?limit=${limit}`);
  }
}

// Create a global instance
const apiClient = new APIClient();
