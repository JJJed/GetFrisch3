# GetFrisch3 - Server-Based Game

A fully server-validated version of the GetFrisch game with real-time leaderboard, user authentication, and anti-cheat mechanisms.

## Overview

GetFrisch3 transforms the original client-side game into a secure, server-based application with:

- **Server-side validation** - All games are validated by replaying move history
- **Real-time leaderboard** - Live updates via WebSocket when new scores are submitted
- **Optional authentication** - Play anonymously or create an account for verified status
- **Anti-cheat detection** - Server validates move sequences and game state
- **Automated leaderboard** - No manual submission needed
- **Identical UI/UX** - Same look and feel as the original game

## Architecture

### Backend (Python + Flask)
- **Flask** - Web framework
- **Flask-SQLAlchemy** - Database ORM
- **Flask-SocketIO** - WebSocket support for real-time updates
- **Flask-JWT-Extended** - JWT authentication
- **MySQL** - Database (via PyMySQL)
- **eventlet** - Async server for WebSocket

### Frontend (JavaScript)
- **Original game logic** - Preserved from getfrisch2
- **API Client** - REST API communication
- **Socket.io** - WebSocket client for real-time updates
- **Authentication UI** - Modal-based login/register
- **Automated submission** - Games submitted on completion

## Directory Structure

```
getfrisch3/
├── server/               # Backend Flask application
│   ├── app.py           # Main Flask app
│   ├── models/          # Database models
│   │   ├── user.py      # User model
│   │   └── game.py      # Game model
│   ├── routes/          # API routes
│   │   ├── auth.py      # Authentication endpoints
│   │   ├── game.py      # Game submission endpoints
│   │   └── leaderboard.py  # Leaderboard endpoints
│   ├── utils/           # Utility modules
│   │   └── game_validator.py  # Server-side game validation
│   └── requirements.txt # Python dependencies
├── client/              # Frontend (static files served by Flask)
│   ├── index.html       # Main HTML with auth UI
│   ├── js/              # JavaScript
│   │   ├── api_client.js  # API communication
│   │   ├── auth_handler.js  # Authentication UI
│   │   ├── leaderboard_handler.js  # Real-time leaderboard
│   │   ├── game_manager.js  # Modified game logic
│   │   └── [original game files]
│   ├── style/           # CSS (from original)
│   ├── img/             # Images (from original)
│   └── meta/            # Icons (from original)
├── config/              # Configuration
│   ├── .env.example     # Environment variables template
│   └── .gitignore       # Git ignore rules
└── docs/                # Documentation
    └── API.md           # API documentation
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- MySQL 5.7+ or MariaDB 10.3+
- pip (Python package manager)

### 1. Database Setup

Create a MySQL database:

```sql
CREATE DATABASE getfrisch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'getfrisch_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON getfrisch.* TO 'getfrisch_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cd getfrisch3
cp config/.env.example config/.env
```

Edit `config/.env` with your settings:

```env
# Flask Configuration
SECRET_KEY=your-random-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=getfrisch
DB_USER=getfrisch_user
DB_PASSWORD=your_password

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
FLASK_ENV=production

# CORS (if frontend is on different domain)
CORS_ORIGINS=http://yourdomain.com,https://yourdomain.com

# Game Configuration
MAX_LEADERBOARD_SIZE=100
MOVE_VALIDATION_ENABLED=true
```

**Security Note**: Generate strong random keys for production:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Install Dependencies

```bash
cd server
pip install -r requirements.txt
```

For production, consider using a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Initialize Database

```bash
cd server
flask init-db
```

Or manually with Python:

```python
from app import app, db
with app.app_context():
    db.create_all()
```

### 5. Run the Server

**Development:**
```bash
cd server
python app.py
```

**Production (with Gunicorn):**
```bash
pip install gunicorn
gunicorn -k eventlet -w 1 --bind 0.0.0.0:5000 app:app
```

The server will start on `http://localhost:5000`

### 6. Access the Game

Open your browser to:
- **Local**: http://localhost:5000
- **VPS**: http://your-vps-ip:5000

## VPS Deployment

### Nginx Configuration

Create `/etc/nginx/sites-available/getfrisch`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/getfrisch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Systemd Service

Create `/etc/systemd/system/getfrisch.service`:

```ini
[Unit]
Description=GetFrisch Game Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/getfrisch3/server
Environment="PATH=/path/to/getfrisch3/venv/bin"
ExecStart=/path/to/getfrisch3/venv/bin/gunicorn -k eventlet -w 1 --bind 127.0.0.1:5000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable getfrisch
sudo systemctl start getfrisch
sudo systemctl status getfrisch
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## API Documentation

See `docs/API.md` for complete API documentation.

### Quick API Reference

**Authentication:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/anonymous` - Create anonymous session
- `GET /api/auth/me` - Get current user

**Game:**
- `POST /api/game/submit` - Submit completed game
- `GET /api/game/history` - Get user's game history
- `GET /api/game/stats` - Get user statistics

**Leaderboard:**
- `GET /api/leaderboard/` - Get global leaderboard
- `GET /api/leaderboard/user/{id}` - Get user's rank
- `GET /api/leaderboard/top-players` - Get top players
- `GET /api/leaderboard/recent` - Get recent games

**WebSocket Events:**
- `connect` - Client connects
- `request_leaderboard` - Request leaderboard data
- `leaderboard_update` - Server sends leaderboard
- `leaderboard_changed` - Notification of new score

## Game Validation

The server validates all submitted games by:

1. **Replay validation** - Replays entire move history to verify final score
2. **Timing analysis** - Checks for suspicious completion times
3. **Pattern detection** - Identifies bot-like behavior (repeated moves)
4. **Score consistency** - Validates score-to-moves ratio

Games that fail validation are flagged and excluded from the leaderboard.

## User Types

### Anonymous Users
- Quick play without registration
- Scores submitted to leaderboard
- No verified badge
- Session expires when browser closes

### Registered Users
- Persistent account
- Email (optional)
- Password protected
- Can view game history and statistics
- No verified badge initially

### Verified Users
- Manually verified by admin
- Green checkmark on leaderboard
- Indicates trusted/legitimate player

## Security Features

- **JWT authentication** - Secure token-based auth
- **Password hashing** - bcrypt with salt
- **Move history validation** - Server replays all moves
- **Rate limiting** - Prevents spam (configure in app)
- **CORS protection** - Restricts cross-origin requests
- **SQL injection protection** - SQLAlchemy ORM
- **XSS prevention** - Escaped HTML output

## Troubleshooting

### Database Connection Errors

Check MySQL is running:
```bash
sudo systemctl status mysql
```

Test connection:
```bash
mysql -u getfrisch_user -p getfrisch
```

### WebSocket Not Working

Ensure eventlet is installed:
```bash
pip install eventlet
```

Check firewall allows port 5000:
```bash
sudo ufw allow 5000
```

### Games Not Submitting

Check browser console for errors:
- Open DevTools (F12)
- Check Console tab
- Look for API errors

Verify user is authenticated:
- Check for auth token in localStorage
- Try logging out and back in

### Validation Failures

Check server logs for validation errors:
```bash
tail -f /path/to/server/logs/app.log
```

Common causes:
- Move history corrupted
- Client clock wrong (affects timing)
- Modified client code

## Development

### Reset Database

```bash
cd server
flask reset-db
```

### Run in Debug Mode

Edit `config/.env`:
```env
FLASK_ENV=development
```

This enables:
- Auto-reload on code changes
- Detailed error pages
- Debug logging

### Testing

Create test users:
```python
from app import app, db
from models.user import User

with app.app_context():
    user = User(username='testuser')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
```

## Credits

- **Modified by**: Josh Davis ([@JJJed](https://github.com/JJJed))
- **Created by**: Oran Goodman ([@Oran-G](https://github.com/Oran-G))
- **Inspired by**: [Get MIT](https://mitchgu.github.io/GetMIT/) by Mitchell Gu
- **Based on**: [2048](http://gabrielecirulli.com) by Gabriele Cirulli

## License

See LICENSE.txt for details.
