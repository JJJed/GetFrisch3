# GetFrisch3 API Documentation

Base URL: `http://your-server:5000/api`

All API requests must include `Content-Type: application/json` header.
Authenticated endpoints require `Authorization: Bearer {token}` header.

## Authentication Endpoints

### POST /auth/register

Create a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "password123",
  "email": "john@example.com"  // optional
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "is_anonymous": false,
    "is_verified": false,
    "created_at": "2025-12-02T10:30:00",
    "email": "john@example.com"
  }
}
```

**Errors:**
- `400` - Validation error (username format, password length, email invalid)
- `400` - Username or email already exists

---

### POST /auth/login

Login with username and password.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "is_anonymous": false,
    "is_verified": false,
    "created_at": "2025-12-02T10:30:00",
    "email": "john@example.com"
  }
}
```

**Errors:**
- `400` - Username and password required
- `401` - Invalid username or password
- `403` - Account has been banned

---

### POST /auth/anonymous

Create an anonymous user session.

**Request Body:**
```json
{
  "username": "GuestPlayer"
}
```

**Response (201 Created):**
```json
{
  "message": "Anonymous user created",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "GuestPlayer",
    "is_anonymous": true,
    "is_verified": false,
    "created_at": "2025-12-02T10:35:00"
  }
}
```

**Note:** If username exists, a unique variation will be created (e.g., "GuestPlayer_1")

---

### GET /auth/me

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "is_anonymous": false,
    "is_verified": false,
    "created_at": "2025-12-02T10:30:00",
    "email": "john@example.com"
  }
}
```

**Errors:**
- `401` - Invalid or expired token
- `404` - User not found

---

### POST /auth/check-username

Check if a username is available.

**Request Body:**
```json
{
  "username": "newuser"
}
```

**Response (200 OK):**
```json
{
  "username": "newuser",
  "available": true
}
```

---

## Game Endpoints

### POST /game/submit

Submit a completed game for validation and leaderboard.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "score": 12345,
  "best_tile": 2048,
  "moves_count": 234,
  "game_duration": 300,
  "is_win": true,
  "move_history": [
    {"tile": {"x": 0, "y": 1, "value": 2}, "direction": null},
    {"tile": {"x": 2, "y": 3, "value": 2}, "direction": null},
    {"direction": 0, "tile": null},
    {"tile": {"x": 1, "y": 2, "value": 2}, "direction": null},
    {"direction": 1, "tile": null}
  ],
  "final_board": [
    {"x": 0, "y": 0, "value": 4},
    {"x": 1, "y": 0, "value": 8},
    {"x": 2, "y": 1, "value": 2048}
  ]
}
```

**Field Descriptions:**
- `score` - Final score
- `best_tile` - Highest tile value achieved
- `moves_count` - Number of moves made
- `game_duration` - Duration in seconds
- `is_win` - Whether 2048 tile was reached
- `move_history` - Complete sequence of tile spawns and moves
  - Entries with `direction: null` are tile spawns
  - Entries with `direction: 0-3` are moves (0=up, 1=right, 2=down, 3=left)
- `final_board` - Final board state

**Response (201 Created):**
```json
{
  "message": "Game submitted successfully",
  "game": {
    "id": 42,
    "user_id": 1,
    "username": "johndoe",
    "score": 12345,
    "best_tile": 2048,
    "moves_count": 234,
    "game_duration": 300,
    "is_win": true,
    "is_validated": true,
    "is_verified": false,
    "created_at": "2025-12-02T11:00:00"
  },
  "validated": true
}
```

**If validation fails:**
```json
{
  "message": "Game submitted successfully",
  "game": {...},
  "validated": false,
  "validation_error": "Score mismatch: expected 12345, got 11000"
}
```

**Errors:**
- `400` - Invalid game data (negative values, missing fields)
- `401` - Not authenticated
- `403` - User is banned
- `404` - User not found

---

### GET /game/history

Get authenticated user's game history.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `per_page` (default: 20, max: 100) - Games per page

**Response (200 OK):**
```json
{
  "games": [
    {
      "id": 42,
      "user_id": 1,
      "username": "johndoe",
      "score": 12345,
      "best_tile": 2048,
      "moves_count": 234,
      "game_duration": 300,
      "is_win": true,
      "is_validated": true,
      "is_verified": false,
      "created_at": "2025-12-02T11:00:00"
    }
  ],
  "total": 15,
  "page": 1,
  "per_page": 20,
  "pages": 1
}
```

---

### GET /game/{game_id}

Get detailed information about a specific game.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "game": {
    "id": 42,
    "user_id": 1,
    "username": "johndoe",
    "score": 12345,
    "best_tile": 2048,
    "moves_count": 234,
    "game_duration": 300,
    "is_win": true,
    "is_validated": true,
    "is_verified": false,
    "created_at": "2025-12-02T11:00:00",
    "move_history": [...],
    "final_board": [...]
  }
}
```

**Errors:**
- `403` - Unauthorized (can only view own games)
- `404` - Game not found

---

### GET /game/stats

Get authenticated user's game statistics.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "stats": {
    "total_games": 15,
    "total_wins": 3,
    "win_rate": 20.0,
    "best_score": 12345,
    "best_tile": 2048,
    "average_score": 5432.50
  }
}
```

---

## Leaderboard Endpoints

### GET /leaderboard/

Get the global leaderboard.

**Query Parameters:**
- `limit` (default: 100, max: 100) - Number of entries

**Response (200 OK):**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "id": 42,
      "user_id": 1,
      "username": "johndoe",
      "score": 12345,
      "best_tile": 2048,
      "moves_count": 234,
      "game_duration": 300,
      "is_win": true,
      "is_validated": true,
      "is_verified": false,
      "created_at": "2025-12-02T11:00:00"
    },
    {
      "rank": 2,
      "id": 41,
      "user_id": 3,
      "username": "jane",
      "score": 11000,
      "best_tile": 1024,
      "is_verified": true,
      ...
    }
  ],
  "total": 50
}
```

**Note:** Only validated, non-flagged games appear on the leaderboard.

---

### GET /leaderboard/user/{user_id}

Get a specific user's rank and best score.

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "is_anonymous": false,
    "is_verified": false,
    "created_at": "2025-12-02T10:30:00"
  },
  "rank": 5,
  "best_score": 12345,
  "best_game": {
    "id": 42,
    "score": 12345,
    "best_tile": 2048,
    ...
  }
}
```

**If user has no validated games:**
```json
{
  "user": {...},
  "rank": null,
  "best_score": 0,
  "message": "No validated games yet"
}
```

---

### GET /leaderboard/top-players

Get top players by their best score.

**Query Parameters:**
- `limit` (default: 10, max: 50) - Number of players

**Response (200 OK):**
```json
{
  "top_players": [
    {
      "rank": 1,
      "user": {
        "id": 1,
        "username": "johndoe",
        "is_verified": false
      },
      "best_score": 12345,
      "best_tile": 2048,
      "is_win": true,
      "game_date": "2025-12-02T11:00:00"
    }
  ],
  "total": 10
}
```

---

### GET /leaderboard/recent

Get recently submitted validated games.

**Query Parameters:**
- `limit` (default: 20, max: 100) - Number of games

**Response (200 OK):**
```json
{
  "recent_games": [
    {
      "id": 42,
      "user_id": 1,
      "username": "johndoe",
      "score": 12345,
      "best_tile": 2048,
      "is_win": true,
      "is_verified": false,
      "created_at": "2025-12-02T11:00:00"
    }
  ],
  "total": 20
}
```

---

## WebSocket Events

Connect to: `ws://your-server:5000/socket.io`

### Client → Server

#### `connect`
Client connects to server.

**Example:**
```javascript
const socket = io('http://localhost:5000');
```

#### `request_leaderboard`
Request current leaderboard data.

**Example:**
```javascript
socket.emit('request_leaderboard');
```

### Server → Client

#### `connected`
Server acknowledges connection.

**Data:**
```json
{
  "message": "Connected to GetFrisch server"
}
```

#### `leaderboard_update`
Server sends leaderboard data.

**Data:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "username": "johndoe",
      "score": 12345,
      ...
    }
  ]
}
```

#### `leaderboard_changed`
Notification that a new score was submitted.

**Data:**
```json
{
  "game_id": 42
}
```

**Note:** Clients should emit `request_leaderboard` when receiving this event.

#### `error`
Error occurred on server.

**Data:**
```json
{
  "message": "Error description"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- `400` Bad Request - Invalid input
- `401` Unauthorized - Missing or invalid token
- `403` Forbidden - Banned or insufficient permissions
- `404` Not Found - Resource doesn't exist
- `500` Internal Server Error - Server error

---

## Rate Limiting

Currently not implemented. Consider adding rate limiting in production:

- Login attempts: 5/minute per IP
- Game submissions: 10/minute per user
- Leaderboard requests: 60/minute per IP

---

## Authentication Token

Tokens expire after 1 hour (configurable via `JWT_ACCESS_TOKEN_EXPIRES`).

Store token in localStorage:
```javascript
localStorage.setItem('authToken', token);
```

Include in requests:
```javascript
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## Validation Rules

Games are validated by:

1. **Move replay** - Server replays all moves to verify score
2. **Timing checks** - Games completing too quickly are flagged
3. **Pattern analysis** - Detecting bot-like behavior
4. **Score ratio** - Unrealistic score-to-moves ratio

**Example validation failure:**
```json
{
  "validated": false,
  "validation_error": "Suspicious: High score with very few moves"
}
```

Flagged games are stored but excluded from leaderboard.

---

## Example Usage

### JavaScript Client

```javascript
// Register
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    username: 'newuser',
    password: 'password123',
    email: 'user@example.com'
  })
});
const data = await response.json();
localStorage.setItem('authToken', data.access_token);

// Submit game
const gameData = {
  score: 5000,
  best_tile: 512,
  moves_count: 150,
  game_duration: 200,
  is_win: false,
  move_history: [...],
  final_board: [...]
};

await fetch('/api/game/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  },
  body: JSON.stringify(gameData)
});

// Get leaderboard
const leaderboard = await fetch('/api/leaderboard/?limit=50')
  .then(r => r.json());
```

### Python Client

```python
import requests

# Register
response = requests.post('http://localhost:5000/api/auth/register', json={
    'username': 'newuser',
    'password': 'password123',
    'email': 'user@example.com'
})
token = response.json()['access_token']

# Submit game
headers = {'Authorization': f'Bearer {token}'}
game_data = {
    'score': 5000,
    'best_tile': 512,
    'moves_count': 150,
    'game_duration': 200,
    'is_win': False,
    'move_history': [...],
    'final_board': [...]
}
requests.post('http://localhost:5000/api/game/submit',
              json=game_data, headers=headers)

# Get leaderboard
leaderboard = requests.get('http://localhost:5000/api/leaderboard/?limit=50').json()
```
