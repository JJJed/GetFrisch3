# Testing GetFrisch3 Locally with PyCharm

Complete guide to setting up and testing the entire application in PyCharm on your local machine.

## Prerequisites

- PyCharm Professional (recommended) or Community Edition
- Python 3.8+
- MySQL/MariaDB installed locally
- Port 5000 available

## Part 1: Database Setup (5 minutes)

### 1.1 Create Local Database

Open your MySQL client (Terminal, MySQL Workbench, or PyCharm Database tool):

```sql
-- Create database
CREATE DATABASE getfrisch_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'getfrisch_test'@'localhost' IDENTIFIED BY 'test_password_123';

-- Grant privileges
GRANT ALL PRIVILEGES ON getfrisch_test.* TO 'getfrisch_test'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES LIKE 'getfrisch_test';
```

### 1.2 PyCharm Database Connection (Optional)

1. Open **Database** tool window (View → Tool Windows → Database)
2. Click **+** → **Data Source** → **MySQL**
3. Configure:
   - **Host**: localhost
   - **Port**: 3306
   - **Database**: getfrisch_test
   - **User**: getfrisch_test
   - **Password**: test_password_123
4. Click **Test Connection**
5. Click **OK**

## Part 2: PyCharm Project Setup (10 minutes)

### 2.1 Open Project

1. **File** → **Open**
2. Navigate to `/Users/jed/getfrisch3/getfrisch3/`
3. Click **Open**
4. Select **This Window** or **New Window**

### 2.2 Configure Python Interpreter

#### Option A: Create Virtual Environment in PyCharm

1. **PyCharm** → **Preferences** (macOS) or **File** → **Settings** (Windows/Linux)
2. **Project: getfrisch3** → **Python Interpreter**
3. Click **⚙️** (gear icon) → **Add...**
4. Select **Virtualenv Environment**
5. Choose **New environment**
6. Set location: `[project_root]/server/venv`
7. Base interpreter: Python 3.8+
8. Check **Inherit global site-packages**: OFF
9. Check **Make available to all projects**: OFF
10. Click **OK**

#### Option B: Use Existing venv

If you already created venv:

1. **Preferences** → **Python Interpreter**
2. Click **⚙️** → **Add...**
3. Select **Virtualenv Environment** → **Existing environment**
4. Browse to: `[project_root]/server/venv/bin/python`
5. Click **OK**

### 2.3 Install Dependencies

#### Via PyCharm Terminal:

1. Open **Terminal** tab (bottom of PyCharm)
2. Navigate to server directory:
   ```bash
   cd server
   ```
3. Activate venv (should auto-activate in PyCharm terminal):
   ```bash
   source venv/bin/activate  # macOS/Linux
   # or
   venv\Scripts\activate  # Windows
   ```
4. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```

#### Via PyCharm UI (Alternative):

1. Open `server/requirements.txt`
2. PyCharm will show banner: "Package requirements are not satisfied"
3. Click **Install requirements**
4. Select all packages
5. Click **Install**

### 2.4 Configure Environment Variables

1. Copy example file:
   ```bash
   cp config/.env.example config/.env
   ```

2. Edit `config/.env` (right-click → **Open With** → **Editor**):

   ```env
   # Flask Configuration
   FLASK_APP=server/app.py
   FLASK_ENV=development
   SECRET_KEY=dev-secret-key-for-testing-only

   # Database Configuration (LOCAL)
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=getfrisch_test
   DB_USER=getfrisch_test
   DB_PASSWORD=test_password_123

   # JWT Configuration
   JWT_SECRET_KEY=dev-jwt-secret-key-for-testing
   JWT_ACCESS_TOKEN_EXPIRES=3600

   # Server Configuration
   SERVER_HOST=0.0.0.0
   SERVER_PORT=5000

   # CORS Configuration
   CORS_ORIGINS=http://localhost:5000,http://127.0.0.1:5000

   # Game Configuration
   MAX_LEADERBOARD_SIZE=100
   MOVE_VALIDATION_ENABLED=true
   ```

3. Save file

### 2.5 Set Content Roots

1. **Right-click** on `server` folder
2. **Mark Directory as** → **Sources Root**

This helps PyCharm resolve imports correctly.

## Part 3: Initialize Database (2 minutes)

### Option A: PyCharm Terminal

```bash
cd server
python -c "from app import app, db; app.app_context().push(); db.create_all(); print('Database initialized!')"
```

### Option B: PyCharm Python Console

1. **Tools** → **Python Console**
2. Run:
   ```python
   from app import app, db
   app.app_context().push()
   db.create_all()
   print('Database initialized!')
   ```

### Verify Database Tables

If using PyCharm Database tool:

1. Open **Database** tool window
2. Expand **getfrisch_test** → **tables**
3. You should see:
   - `users`
   - `games`

Right-click on `users` → **Jump to Console** → Type:
```sql
DESCRIBE users;
DESCRIBE games;
```

## Part 4: Create Run Configuration (5 minutes)

### 4.1 Create Flask Run Configuration

1. **Run** → **Edit Configurations...**
2. Click **+** → **Python**
3. Configure:
   - **Name**: `GetFrisch3 Server`
   - **Script path**: Browse to `server/app.py`
   - **Python interpreter**: Select the venv you created
   - **Working directory**: `/Users/jed/getfrisch3/getfrisch3/server`
   - **Environment variables**: (click folder icon)
     - Click **+** to add:
       - `FLASK_ENV=development`
       - `PYTHONUNBUFFERED=1` (for better logging)
4. Click **OK**

### 4.2 Alternative: Shell Script Configuration

1. **Run** → **Edit Configurations...**
2. Click **+** → **Shell Script**
3. Configure:
   - **Name**: `Start Server (Script)`
   - **Script path**: Browse to `start_server.sh`
   - **Working directory**: `/Users/jed/getfrisch3/getfrisch3`
4. Click **OK**

## Part 5: Run and Test (30 minutes)

### 5.1 Start the Server

#### Method 1: Run Configuration
1. Select **GetFrisch3 Server** from dropdown (top-right)
2. Click **▶️ Run** button (green play icon)
3. Watch **Run** console for output

#### Method 2: Terminal
```bash
cd server
python app.py
```

#### Expected Output:
```
Starting GetFrisch server on 0.0.0.0:5000
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
 * Running on http://192.168.x.x:5000
Press CTRL+C to quit
```

### 5.2 Open the Game

1. In PyCharm, hold **Cmd** (macOS) or **Ctrl** (Windows/Linux)
2. Click the URL: `http://127.0.0.1:5000`
3. Or open browser manually: http://localhost:5000

### 5.3 Test Authentication Flow

#### Test 1: Anonymous User
1. Auth modal should appear automatically
2. Click **"Play Anonymously"** tab (should be default)
3. Enter username: `TestPlayer`
4. Click **"Start Playing"**
5. ✅ Modal closes, username appears at top
6. ✅ Game board appears

#### Test 2: Create Account
1. Refresh page (or logout)
2. Click **"create an account"** link
3. Fill in:
   - Username: `testuser`
   - Email: `test@example.com` (optional)
   - Password: `password123`
4. Click **"Create Account"**
5. ✅ Modal closes, username appears at top
6. ✅ No verified badge (expected for new accounts)

#### Test 3: Login
1. Logout (click **Logout** button)
2. Auth modal appears
3. Click **"login"** link
4. Fill in:
   - Username: `testuser`
   - Password: `password123`
5. Click **"Login"**
6. ✅ Successfully logged in

#### Watch PyCharm Console:
```
Client connected
POST /api/auth/register
Anonymous user created
GET /api/leaderboard/
```

### 5.4 Test Game Submission

1. Play a quick game (make a few moves)
2. Let the game end (Game Over)
3. Watch PyCharm console for:
   ```
   Submitting game to server: {...}
   POST /api/game/submit
   ```
4. Check leaderboard at bottom of page
5. ✅ Your score should appear

### 5.5 Test Real-Time Leaderboard

#### Setup Two Browser Windows:

1. Open game in **Chrome**: http://localhost:5000
2. Open game in **Firefox** or **Safari**: http://localhost:5000
3. Login as different users in each

#### Test:
1. In Browser 1: Play and finish a game
2. In Browser 2: Watch leaderboard
3. ✅ Leaderboard should update automatically in Browser 2

#### Watch PyCharm Console:
```
leaderboard_changed event
Client connected
leaderboard_update sent
```

## Part 6: Testing with PyCharm Debugger (15 minutes)

### 6.1 Set Breakpoints

1. Open `server/routes/game.py`
2. Find the `submit_game()` function (around line 12)
3. Click in the gutter (left of line numbers) on line with:
   ```python
   user = User.query.get(user_id)
   ```
4. Red dot appears = breakpoint set

### 6.2 Debug Mode

1. Stop the server (click **⏹️ Stop** button)
2. Click **🐛 Debug** button (instead of Run)
3. Server starts in debug mode

### 6.3 Trigger Breakpoint

1. Open browser, play a game, let it end
2. PyCharm will pause at your breakpoint
3. Inspect variables in **Debugger** panel:
   - `user_id` - Current user
   - `data` - Game submission data
   - `score`, `move_history`, etc.

### 6.4 Debug Controls

- **F8** (Step Over) - Execute current line
- **F7** (Step Into) - Enter function call
- **F9** (Resume) - Continue to next breakpoint
- **Cmd+F2** (Stop) - Stop debugging

### 6.5 Evaluate Expressions

1. While paused at breakpoint
2. Click **Console** tab in debugger
3. Type Python expressions:
   ```python
   user.username
   len(data.get('move_history'))
   score > 1000
   ```

## Part 7: Testing API Endpoints (10 minutes)

### 7.1 PyCharm HTTP Client

Create file: `server/api_tests.http`

```http
### Register User
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "apitest",
  "password": "password123",
  "email": "api@test.com"
}

> {% client.global.set("auth_token", response.body.access_token); %}

### Login
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "username": "apitest",
  "password": "password123"
}

### Get Current User
GET http://localhost:5000/api/auth/me
Authorization: Bearer {{auth_token}}

### Get Leaderboard
GET http://localhost:5000/api/leaderboard/?limit=10

### Submit Game (requires auth token from register/login)
POST http://localhost:5000/api/game/submit
Content-Type: application/json
Authorization: Bearer {{auth_token}}

{
  "score": 5000,
  "best_tile": 512,
  "moves_count": 150,
  "game_duration": 200,
  "is_win": false,
  "move_history": [
    {"tile": {"x": 0, "y": 1, "value": 2}, "direction": null},
    {"tile": {"x": 2, "y": 3, "value": 2}, "direction": null},
    {"direction": 0, "tile": null}
  ],
  "final_board": [
    {"x": 0, "y": 0, "value": 512}
  ]
}

### Get User Stats
GET http://localhost:5000/api/game/stats
Authorization: Bearer {{auth_token}}
```

**To run:**
1. Open `api_tests.http`
2. Click **▶️** next to each request
3. View response in **Run** panel

### 7.2 Alternative: curl Commands

In PyCharm Terminal:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"curltest","password":"test123"}'

# Get leaderboard
curl http://localhost:5000/api/leaderboard/

# Check health (should return 404 with JSON error)
curl http://localhost:5000/api/test
```

## Part 8: Database Inspection (5 minutes)

### 8.1 View Users

Using PyCharm Database tool:

1. Open **Database** tool window
2. Expand **getfrisch_test** → **tables** → **users**
3. Double-click **users** table
4. You'll see all registered users

Or via console:
```sql
SELECT id, username, is_anonymous, is_verified, created_at FROM users;
```

### 8.2 View Games

```sql
SELECT
  g.id,
  u.username,
  g.score,
  g.best_tile,
  g.is_validated,
  g.created_at
FROM games g
JOIN users u ON g.user_id = u.id
ORDER BY g.score DESC
LIMIT 10;
```

### 8.3 Manual Database Operations

#### Create Test User:
```sql
INSERT INTO users (username, is_anonymous, created_at)
VALUES ('manual_test_user', false, NOW());
```

#### View Move History:
```sql
SELECT id, score, move_history FROM games WHERE id = 1;
```

#### Flag a Game:
```sql
UPDATE games SET is_flagged = true, flag_reason = 'Manual test flag' WHERE id = 1;
```

## Part 9: Common Testing Scenarios

### Scenario 1: Test Validation Failure

Create intentionally invalid game:

```python
# In Python Console
from app import app, db, socketio
from models.user import User
from models.game import Game
import json

with app.app_context():
    user = User.query.first()

    # Create game with impossible score
    game = Game(
        user_id=user.id,
        score=999999,  # Impossible score
        best_tile=2,   # Doesn't match score
        moves_count=5,
        game_duration=1,
        is_win=False
    )
    game.set_move_history([
        {"tile": {"x": 0, "y": 0, "value": 2}, "direction": None}
    ])
    game.set_final_board([{"x": 0, "y": 0, "value": 2}])

    db.session.add(game)
    db.session.commit()

    print(f"Created game {game.id} with score {game.score}")
```

Check if flagged:
```sql
SELECT id, score, is_validated, is_flagged, flag_reason FROM games ORDER BY id DESC LIMIT 1;
```

### Scenario 2: Test Multiple Users

```python
# Create 5 test users with games
from app import app, db
from models.user import User
from models.game import Game
import random

with app.app_context():
    for i in range(5):
        user = User(username=f'testuser{i}')
        user.set_password('test123')
        db.session.add(user)
        db.session.flush()

        # Create random game
        game = Game(
            user_id=user.id,
            score=random.randint(1000, 10000),
            best_tile=random.choice([128, 256, 512, 1024]),
            moves_count=random.randint(100, 300),
            game_duration=random.randint(60, 600),
            is_win=False,
            is_validated=True
        )
        game.set_move_history([])
        game.set_final_board([])
        db.session.add(game)

    db.session.commit()
    print("Created 5 users with games")
```

### Scenario 3: Test WebSocket Manually

```python
# In Python Console (with server running)
from app import socketio

# Emit test event
socketio.emit('leaderboard_changed', {'game_id': 999})
```

Watch browser console for the event.

## Part 10: Troubleshooting

### Issue: ModuleNotFoundError

**Cause**: Wrong Python interpreter or venv not activated

**Fix**:
1. Check interpreter in bottom-right of PyCharm
2. Should show: `Python 3.x (getfrisch3)`
3. If not: **Preferences** → **Python Interpreter** → Select correct one

### Issue: Database Connection Error

**Cause**: MySQL not running or wrong credentials

**Fix**:
```bash
# Check MySQL is running
sudo systemctl status mysql  # Linux
brew services list | grep mysql  # macOS

# Test connection
mysql -u getfrisch_test -p getfrisch_test
```

### Issue: Port 5000 Already in Use

**Cause**: Another application using port 5000

**Fix**:
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 <PID>

# Or change port in config/.env
SERVER_PORT=8000
```

### Issue: WebSocket Not Working

**Cause**: eventlet not installed

**Fix**:
```bash
pip install eventlet
```

### Issue: CORS Errors in Console

**Cause**: Frontend URL not in CORS_ORIGINS

**Fix**: Edit `config/.env`:
```env
CORS_ORIGINS=http://localhost:5000,http://127.0.0.1:5000,http://localhost:3000
```

## Part 11: Useful PyCharm Features

### 11.1 View Server Logs

- **Run** panel shows all Flask output
- Click **🔍** (magnifying glass) to search logs
- Click **🧹** (trash) to clear logs

### 11.2 Stop/Restart Server

- **⏹️ Stop** - Stop server
- **⟳ Rerun** - Restart server
- **Cmd+F5** - Restart with debugger

### 11.3 View Structure

- **Cmd+7** or **Structure** tool window
- Shows all functions, classes in current file
- Double-click to jump to definition

### 11.4 Find Usages

- Right-click on function name → **Find Usages**
- Or press **Option+F7**
- Shows everywhere the function is called

### 11.5 Database Queries

- Open **Database** tool
- Right-click table → **Jump to Query Console**
- Write SQL queries with autocomplete

## Testing Checklist

### Backend Tests
- [ ] Server starts without errors
- [ ] Database tables created correctly
- [ ] User registration works
- [ ] User login works
- [ ] Anonymous users work
- [ ] JWT tokens generated
- [ ] Game submission works
- [ ] Game validation runs
- [ ] Leaderboard API returns data
- [ ] WebSocket connects

### Frontend Tests
- [ ] Page loads at localhost:5000
- [ ] Auth modal appears
- [ ] Login form works
- [ ] Register form works
- [ ] Anonymous login works
- [ ] Game renders correctly
- [ ] Game plays normally
- [ ] Scores submit automatically
- [ ] Leaderboard displays
- [ ] Real-time updates work

### Integration Tests
- [ ] Full flow: register → play → submit → leaderboard
- [ ] Multiple users simultaneously
- [ ] Leaderboard updates for all clients
- [ ] Logout/login persists state
- [ ] Validation flags invalid games
- [ ] Valid games appear on leaderboard

## Next Steps

Once everything works locally:
- Read `PRODUCTION_TESTING.md` for VPS testing
- Read `README.md` for full deployment

## Quick Reference

### Start Server
```bash
cd server
python app.py
```

### Reset Database
```python
from app import app, db
with app.app_context():
    db.drop_all()
    db.create_all()
```

### View Logs
- PyCharm **Run** panel
- Or check `server/logs/` if logging configured

### Test URL
http://localhost:5000

### Database
- Host: localhost:3306
- Database: getfrisch_test
- User: getfrisch_test
- Pass: test_password_123

Happy testing! 🚀
