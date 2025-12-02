# Testing GetFrisch3 on Production VPS (Private Testing)

Complete guide to deploying and testing on your production VPS **without** making it publicly accessible. This allows you to test with real server conditions before opening to users.

## Overview

We'll use multiple layers of protection to keep the site private during testing:

1. **IP Whitelist** - Only your IP can access
2. **Basic Auth** - Password-protected Nginx layer
3. **Firewall Rules** - Block all except your IP
4. **Test Subdomain** - Deploy to staging.yourdomain.com first

Choose the method(s) that work best for your setup.

---

## Prerequisites

- VPS with SSH access
- Domain name (e.g., getfrisch.com)
- Root or sudo access
- Basic Linux command knowledge

---

## Method 1: IP Whitelist (Recommended)

### Pros
- ✅ Simplest to set up
- ✅ Transparent to you (no password needed)
- ✅ Most secure (only your IP works)

### Cons
- ❌ Requires static IP or updating when IP changes
- ❌ Doesn't work well with dynamic IPs

### Setup

#### 1.1 Find Your IP Address

On your local machine:
```bash
curl https://api.ipify.org
# or
curl ifconfig.me
```

**Example output:** `123.456.789.101`

**Save this IP!** You'll need it multiple times.

#### 1.2 SSH into VPS

```bash
ssh your_user@your-vps-ip
```

#### 1.3 Deploy Application First

Follow the standard deployment (we'll restrict access after):

```bash
# Upload files
cd /var/www/
sudo git clone https://github.com/yourusername/getfrisch3.git
# Or use scp/rsync to upload files

cd getfrisch3

# Set up database (if not already done)
sudo mysql -u root -p
```

```sql
CREATE DATABASE getfrisch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'getfrisch_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON getfrisch.* TO 'getfrisch_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Configure environment
sudo cp config/.env.example config/.env
sudo nano config/.env
```

Edit `.env` with production values:
```env
FLASK_ENV=production
SECRET_KEY=<generate-strong-key>
JWT_SECRET_KEY=<generate-strong-key>
DB_HOST=localhost
DB_NAME=getfrisch
DB_USER=getfrisch_user
DB_PASSWORD=<your-strong-password>
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
```

Generate keys:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

```bash
# Install dependencies
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Initialize database
python -c "from app import app, db; app.app_context().push(); db.create_all(); print('Database initialized!')"
```

#### 1.4 Configure Nginx with IP Whitelist

Create Nginx config:
```bash
sudo nano /etc/nginx/sites-available/getfrisch-test
```

**Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # IP WHITELIST - ONLY YOUR IP CAN ACCESS
    allow 123.456.789.101;  # YOUR IP HERE
    deny all;

    # Optional: Allow from additional IPs (e.g., your phone, work)
    # allow 111.222.333.444;
    # allow 192.168.1.0/24;  # Entire subnet

    # If denied, return 403 Forbidden
    error_page 403 /403.html;
    location = /403.html {
        root /var/www/html;
        internal;
    }

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Logs for debugging
    access_log /var/log/nginx/getfrisch-test-access.log;
    error_log /var/log/nginx/getfrisch-test-error.log;
}
```

**Important:** Replace `123.456.789.101` with YOUR IP from step 1.1!

#### 1.5 Create Custom 403 Page (Optional)

```bash
sudo nano /var/www/html/403.html
```

```html
<!DOCTYPE html>
<html>
<head>
    <title>Access Denied</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: #f0f0f0;
        }
        h1 { color: #A31F34; }
    </style>
</head>
<body>
    <h1>Access Denied</h1>
    <p>This site is currently in private testing.</p>
    <p>If you believe you should have access, please contact the administrator.</p>
</body>
</html>
```

#### 1.6 Enable and Test

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/getfrisch-test /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# If successful:
sudo systemctl reload nginx
```

#### 1.7 Start Flask Server

Create systemd service:
```bash
sudo nano /etc/systemd/system/getfrisch-test.service
```

```ini
[Unit]
Description=GetFrisch Test Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/getfrisch3/server
Environment="PATH=/var/www/getfrisch3/server/venv/bin"
ExecStart=/var/www/getfrisch3/server/venv/bin/gunicorn -k eventlet -w 1 --bind 127.0.0.1:5000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Install gunicorn
source /var/www/getfrisch3/server/venv/bin/activate
pip install gunicorn

# Start service
sudo systemctl daemon-reload
sudo systemctl start getfrisch-test
sudo systemctl enable getfrisch-test
sudo systemctl status getfrisch-test
```

#### 1.8 Test Access

**From your computer:**
```bash
# Should work
curl http://yourdomain.com

# Should see the game
# Open browser: http://yourdomain.com
```

**From another device (or VPN/mobile):**
- Should get "403 Forbidden" or your custom error page

**Check logs:**
```bash
# Nginx logs
sudo tail -f /var/log/nginx/getfrisch-test-access.log

# Flask logs
sudo journalctl -u getfrisch-test -f
```

---

## Method 2: Basic Authentication (Password Protected)

### Pros
- ✅ Works with dynamic IPs
- ✅ Can share access easily (give password)
- ✅ Simple to remove when ready

### Cons
- ❌ Extra login step (annoying for testing)
- ❌ Less secure than IP whitelist

### Setup

#### 2.1 Create Password File

```bash
# Install htpasswd utility
sudo apt install apache2-utils

# Create password (username: admin)
sudo htpasswd -c /etc/nginx/.htpasswd admin
# Enter password when prompted: testing123
```

#### 2.2 Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/getfrisch-test
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # BASIC AUTHENTICATION
    auth_basic "Private Testing - GetFrisch";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /socket.io {
        # WebSocket needs auth too
        auth_basic "Private Testing";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://127.0.0.1:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 2.3 Test

- Open http://yourdomain.com
- Browser will prompt for username/password
- Enter: `admin` / `testing123`
- Should see the game

---

## Method 3: Firewall Rules (UFW)

### Pros
- ✅ Network-level protection
- ✅ Works with any service

### Cons
- ❌ Blocks ALL traffic (SSH too if misconfigured!)
- ❌ Requires careful setup

### Setup

#### 3.1 Check Current Firewall

```bash
sudo ufw status
```

#### 3.2 Configure Firewall

**CAREFUL:** Don't lock yourself out!

```bash
# Allow SSH first (IMPORTANT!)
sudo ufw allow 22/tcp

# Allow from your IP only
sudo ufw allow from 123.456.789.101 to any port 80
sudo ufw allow from 123.456.789.101 to any port 443

# Deny all other HTTP/HTTPS
sudo ufw deny 80/tcp
sudo ufw deny 443/tcp

# Enable firewall
sudo ufw enable

# Check rules
sudo ufw status numbered
```

#### 3.3 Remove When Done Testing

```bash
# Remove restrictions
sudo ufw delete <rule-number>

# Or allow everyone
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Method 4: Test Subdomain (Recommended for High-Traffic Sites)

### Pros
- ✅ Production site stays up during testing
- ✅ Can test without affecting main domain
- ✅ Easy to add IP whitelist or auth

### Cons
- ❌ Requires DNS configuration
- ❌ Need separate SSL certificate

### Setup

#### 4.1 Create DNS Record

In your domain registrar (Cloudflare, GoDaddy, etc.):

**Add A record:**
- **Type**: A
- **Name**: `staging` or `test`
- **Value**: Your VPS IP
- **TTL**: 300 (or Auto)

**Result:** `staging.yourdomain.com` → Your VPS

#### 4.2 Nginx Configuration for Staging

```bash
sudo nano /etc/nginx/sites-available/getfrisch-staging
```

```nginx
server {
    listen 80;
    server_name staging.yourdomain.com;

    # ADD IP WHITELIST
    allow 123.456.789.101;  # Your IP
    deny all;

    # OR ADD BASIC AUTH
    # auth_basic "Staging Environment";
    # auth_basic_user_file /etc/nginx/.htpasswd;

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

```bash
sudo ln -s /etc/nginx/sites-available/getfrisch-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4.3 Get SSL Certificate (Optional but Recommended)

```bash
sudo certbot --nginx -d staging.yourdomain.com
```

#### 4.4 Test

- Visit: https://staging.yourdomain.com
- Should work for you, blocked for others
- Main site (yourdomain.com) still shows old version

---

## Testing Workflow

### Phase 1: Initial Setup (30 min)

1. **Deploy application** to VPS
2. **Configure database** (production DB or separate test DB)
3. **Set up IP whitelist** or basic auth in Nginx
4. **Start Flask service**
5. **Test from your computer**

```bash
# From your local machine
curl -I http://yourdomain.com
# Should see: HTTP/1.1 200 OK (for you)

# From another IP (use online tools)
# Should see: HTTP/1.1 403 Forbidden
```

### Phase 2: Functionality Testing (1-2 hours)

Use the same tests from PYCHARM_TESTING.md, but on production:

#### 2.1 Authentication Tests

1. Open https://yourdomain.com (or staging subdomain)
2. Test anonymous login
3. Test account registration
4. Test login/logout
5. Verify JWT tokens persist

#### 2.2 Game Submission Tests

1. Play complete game
2. Check score submits automatically
3. Verify in database:
   ```bash
   ssh your-vps
   mysql -u getfrisch_user -p getfrisch
   ```
   ```sql
   SELECT * FROM games ORDER BY id DESC LIMIT 5;
   ```

#### 2.3 Real-Time Leaderboard Tests

1. Open in two browsers (or devices you've whitelisted)
2. Submit score in Browser 1
3. Verify leaderboard updates in Browser 2 automatically

#### 2.4 Performance Tests

Monitor server resources:

```bash
# CPU and memory usage
htop

# Check Flask service
sudo systemctl status getfrisch-test

# Check Nginx access
sudo tail -f /var/log/nginx/getfrisch-test-access.log

# Check Flask logs
sudo journalctl -u getfrisch-test -f
```

#### 2.5 Database Tests

```bash
mysql -u getfrisch_user -p getfrisch
```

```sql
-- Check user count
SELECT COUNT(*) FROM users;

-- Check game count
SELECT COUNT(*) FROM games;

-- Check validation rate
SELECT
  COUNT(*) as total,
  SUM(is_validated) as validated,
  SUM(is_flagged) as flagged
FROM games;

-- Top scores
SELECT u.username, g.score, g.best_tile
FROM games g
JOIN users u ON g.user_id = u.id
WHERE g.is_validated = 1
ORDER BY g.score DESC
LIMIT 10;
```

### Phase 3: Stress Testing (Optional)

If you want to test under load:

#### 3.1 Create Test Data

```bash
ssh your-vps
cd /var/www/getfrisch3/server
source venv/bin/activate
python
```

```python
from app import app, db
from models.user import User
from models.game import Game
import random

with app.app_context():
    # Create 100 test users
    for i in range(100):
        user = User(username=f'testuser{i}')
        user.set_password('test123')
        db.session.add(user)
        db.session.flush()

        # 3-5 games per user
        for j in range(random.randint(3, 5)):
            game = Game(
                user_id=user.id,
                score=random.randint(500, 50000),
                best_tile=random.choice([128, 256, 512, 1024, 2048]),
                moves_count=random.randint(50, 500),
                game_duration=random.randint(60, 1800),
                is_win=random.choice([True, False]),
                is_validated=True,
                is_flagged=False
            )
            game.set_move_history([])
            game.set_final_board([])
            db.session.add(game)

    db.session.commit()
    print("Created 100 users with ~400 games")
```

#### 3.2 Monitor Performance

```bash
# Watch server load
htop

# Watch MySQL
sudo mysqladmin -p -i 1 status

# Watch Nginx
watch -n 1 'tail -20 /var/log/nginx/getfrisch-test-access.log'
```

### Phase 4: Mobile Testing

Add your phone's IP to whitelist:

```bash
# Find phone's IP (when on mobile data)
# Visit http://whatismyip.com from phone
# Add to Nginx config:

sudo nano /etc/nginx/sites-available/getfrisch-test
```

Add line:
```nginx
allow 123.456.789.101;  # Your computer
allow 222.333.444.555;  # Your phone
deny all;
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Test on phone:
- Portrait and landscape modes
- Touch controls
- Score submission
- Leaderboard updates

---

## Transitioning to Public Access

Once testing is complete:

### Option 1: Remove IP Whitelist

```bash
sudo nano /etc/nginx/sites-available/getfrisch-test
```

**Remove or comment out:**
```nginx
# allow 123.456.789.101;
# deny all;
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Remove Basic Auth

```nginx
# auth_basic "Private Testing";
# auth_basic_user_file /etc/nginx/.htpasswd;
```

### Option 3: Remove Firewall Rules

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### Option 4: Switch from Staging to Production

If using test subdomain:

1. **Backup production database** (if migrating data):
   ```bash
   mysqldump -u getfrisch_user -p getfrisch > backup.sql
   ```

2. **Update DNS** to point main domain to new server

3. **Get SSL for main domain**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

4. **Update Nginx** config to use main domain

5. **Remove staging** when ready

---

## Monitoring During Private Testing

### Check Who's Accessing

```bash
# Real-time access log
sudo tail -f /var/log/nginx/getfrisch-test-access.log

# Count unique IPs accessing
sudo awk '{print $1}' /var/log/nginx/getfrisch-test-access.log | sort | uniq -c | sort -rn

# Check for 403 errors (blocked access attempts)
sudo grep " 403 " /var/log/nginx/getfrisch-test-error.log | tail -20
```

### Flask Service Health

```bash
# Is service running?
sudo systemctl status getfrisch-test

# Recent logs
sudo journalctl -u getfrisch-test -n 50

# Follow logs in real-time
sudo journalctl -u getfrisch-test -f

# Check for errors
sudo journalctl -u getfrisch-test | grep -i error
```

### Database Health

```bash
mysql -u getfrisch_user -p getfrisch
```

```sql
-- Connection count
SHOW STATUS LIKE 'Threads_connected';

-- Slow queries
SHOW STATUS LIKE 'Slow_queries';

-- Recent games
SELECT COUNT(*) FROM games WHERE created_at > NOW() - INTERVAL 1 HOUR;
```

---

## Emergency Rollback

If something goes wrong:

### Quick Disable

```bash
# Stop Flask service
sudo systemctl stop getfrisch-test

# Disable Nginx site
sudo rm /etc/nginx/sites-enabled/getfrisch-test
sudo systemctl reload nginx
```

### Restore Old Version

```bash
# If you have old version backed up
sudo systemctl stop getfrisch-test
cd /var/www/
sudo mv getfrisch3 getfrisch3-broken
sudo cp -r getfrisch3-backup getfrisch3
sudo systemctl start getfrisch-test
```

### Maintenance Page

Create `/var/www/html/maintenance.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Maintenance - GetFrisch</title>
    <meta http-equiv="refresh" content="300">
    <style>
        body {
            font-family: 'Clear Sans', Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: #faf8ef;
        }
        h1 { color: #A31F34; font-size: 64px; }
        p { font-size: 18px; color: #776e65; }
    </style>
</head>
<body>
    <h1>GetFrisch</h1>
    <p>🔧 We're currently upgrading the game!</p>
    <p>Check back in a few minutes...</p>
    <p><small>Auto-refreshing every 5 minutes</small></p>
</body>
</html>
```

Nginx config for maintenance:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /var/www/html;
        try_files /maintenance.html =503;
    }
}
```

---

## Testing Checklist

### Pre-Launch Checks

- [ ] IP whitelist configured correctly
- [ ] Flask service starts automatically
- [ ] Database connection works
- [ ] Nginx proxying correctly
- [ ] WebSocket connects
- [ ] SSL certificate valid (if using HTTPS)
- [ ] Logs are being written
- [ ] Firewall allows your IP

### Functionality Checks

- [ ] Auth modal appears
- [ ] Anonymous login works
- [ ] Account registration works
- [ ] Password login works
- [ ] Game plays normally
- [ ] Scores submit automatically
- [ ] Validation works
- [ ] Leaderboard displays
- [ ] Real-time updates work
- [ ] Mobile responsive
- [ ] Touch controls work

### Performance Checks

- [ ] Page loads quickly
- [ ] No 500 errors
- [ ] Database queries fast
- [ ] Memory usage acceptable
- [ ] CPU usage reasonable
- [ ] No memory leaks over time

### Security Checks

- [ ] Other IPs blocked (test with VPN)
- [ ] HTTPS enabled (if applicable)
- [ ] .env file not accessible
- [ ] Database credentials secure
- [ ] No debug mode in production
- [ ] No sensitive data in logs

---

## Quick Reference

### Your IP
```bash
curl ifconfig.me
```

### Reload Nginx
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### View Logs
```bash
# Nginx access
sudo tail -f /var/log/nginx/getfrisch-test-access.log

# Nginx errors
sudo tail -f /var/log/nginx/getfrisch-test-error.log

# Flask
sudo journalctl -u getfrisch-test -f
```

### Restart Flask
```bash
sudo systemctl restart getfrisch-test
sudo systemctl status getfrisch-test
```

### Test from Command Line
```bash
# Should work (from your IP)
curl -I http://yourdomain.com

# Test WebSocket
curl -I http://yourdomain.com/socket.io/
```

### Remove All Restrictions (Go Live!)
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/getfrisch-test

# Remove:
# - allow/deny lines
# - auth_basic lines

# Reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## Next Steps

1. Complete testing using this guide
2. If all tests pass, remove restrictions
3. Monitor for first few hours after public launch
4. Keep staging environment for future updates

## Support

If you encounter issues:
- Check logs first
- Verify firewall rules
- Test from different IPs
- Check systemd service status

Happy testing! 🚀
