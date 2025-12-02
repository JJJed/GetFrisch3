# GetFrisch3 Quick Start Guide

Get the game running in 5 minutes!

## Prerequisites

- Python 3.8+
- MySQL/MariaDB
- Basic command line knowledge

## Step 1: Database Setup (2 minutes)

```bash
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE getfrisch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'getfrisch_user'@'localhost' IDENTIFIED BY 'SecurePassword123';
GRANT ALL PRIVILEGES ON getfrisch.* TO 'getfrisch_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 2: Configuration (1 minute)

```bash
cd getfrisch3

# Copy environment file
cp config/.env.example config/.env

# Generate secret keys
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"

# Edit config/.env with your keys and database password
nano config/.env
```

**Minimum required settings in `.env`:**
```env
SECRET_KEY=<generated-key>
JWT_SECRET_KEY=<generated-key>
DB_PASSWORD=SecurePassword123
```

## Step 3: Install Dependencies (1 minute)

```bash
cd server

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

## Step 4: Initialize Database (30 seconds)

```bash
# Still in server directory
python -c "from app import app, db; app.app_context().push(); db.create_all(); print('Database initialized!')"
```

## Step 5: Run the Server (30 seconds)

```bash
# Development mode
python app.py

# Server will start on http://localhost:5000
```

## Step 6: Play! 🎮

1. Open browser to http://localhost:5000
2. Create an account or play anonymously
3. Play the game!
4. Your score automatically submits when the game ends
5. Check the real-time leaderboard below the game

## What's Next?

### For Production Deployment

See [README.md](../README.md) for:
- Nginx configuration
- Systemd service setup
- SSL with Let's Encrypt
- Production best practices

### Troubleshooting

**Can't connect to database?**
```bash
# Test MySQL connection
mysql -u getfrisch_user -p getfrisch
# If this works, check your .env file
```

**Port 5000 already in use?**
```bash
# Change port in config/.env
SERVER_PORT=8000
```

**WebSocket not working?**
```bash
# Ensure eventlet is installed
pip install eventlet
```

**Games not submitting?**
- Open browser DevTools (F12)
- Check Console for errors
- Verify you're logged in (check for username at top)

### Development Tips

**Reset database:**
```python
from app import app, db
with app.app_context():
    db.drop_all()
    db.create_all()
```

**Create test user:**
```python
from app import app, db
from models.user import User

with app.app_context():
    user = User(username='testuser')
    user.set_password('test123')
    db.session.add(user)
    db.session.commit()
    print(f'Created user: {user.username}')
```

**View logs:**
```bash
# In server directory
tail -f app.log  # If logging configured
# Or just watch the terminal where app.py is running
```

### Testing the API

```bash
# Check server is running
curl http://localhost:5000/api/leaderboard/

# Create anonymous user
curl -X POST http://localhost:5000/api/auth/anonymous \
  -H "Content-Type: application/json" \
  -d '{"username":"TestPlayer"}'
```

## Common Issues

### "Module not found" errors
```bash
# Make sure you're in the venv
source venv/bin/activate
pip install -r requirements.txt
```

### Database permissions error
```bash
# Grant all privileges again
mysql -u root -p
GRANT ALL PRIVILEGES ON getfrisch.* TO 'getfrisch_user'@'localhost';
FLUSH PRIVILEGES;
```

### CORS errors in browser
```bash
# Add your frontend URL to config/.env
CORS_ORIGINS=http://localhost:3000,http://yourdomain.com
```

## Architecture Overview

```
Browser
  ↓ HTTP
Flask Server (app.py)
  ↓
Routes (auth, game, leaderboard)
  ↓
Database (MySQL)

Browser ←→ WebSocket (Socket.io) ←→ Flask Server
```

## Key Features

✅ **Server-side validation** - Can't cheat by editing client code
✅ **Real-time leaderboard** - Updates instantly when scores are submitted
✅ **Optional accounts** - Play anonymously or register
✅ **Move history tracking** - Every game is validated by replay
✅ **Anti-cheat detection** - Flags suspicious games
✅ **Identical UI** - Same look and feel as original

## Next Steps

1. **Customize** - Modify colors, schools, images in `client/` directory
2. **Deploy** - Follow production setup in README.md
3. **Monitor** - Watch game submissions and validation results
4. **Moderate** - Add admin panel to manage flagged games
5. **Scale** - Add Redis caching for leaderboard

## Support

- GitHub Issues: https://github.com/JJJed/getfrisch3/issues
- Original Game: https://github.com/Oran-G/getfrisch2

## Credits

Built with ❤️ by Josh Davis
Based on GetFrisch by Oran Goodman
Inspired by Get MIT and 2048
