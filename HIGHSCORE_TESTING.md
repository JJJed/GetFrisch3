# High Score Submission Testing Guide

## Summary of Changes

We've added comprehensive logging and debugging tools to identify why high scores (44k, 56k) aren't being saved to the database.

### Changes Made:

1. **Added detailed logging** (`server/routes/game.py`)
   - Logs to `/var/www/getfrisch3/logs/game_submission.log`
   - Tracks every step: authentication, validation, database commit, errors

2. **Fixed overly strict validation** (`server/utils/game_validator.py`)
   - Increased score-per-move threshold from 500 to 2000
   - Prevents false positives on legitimate high-score games

3. **Added error recovery** (`server/routes/game.py`)
   - Validation errors now flag the game but still save it to database
   - Previously, validation crashes would cause full rollback

4. **Enhanced client error logging** (`client/js/api_client.js`)
   - More detailed browser console errors

5. **Added debug utilities** (`client/js/debug_utils.js`)
   - Test high-score submissions with custom score and move counts

---

## Testing on VPS

### Step 1: Deploy Changes

```bash
# On your local machine
cd /Users/jed/getfrisch3/getfrisch3
git add -A
git commit -m "Add high score debugging and fix validation"
git push

# SSH to VPS
ssh your-vps

# Pull and restart
cd /var/www/getfrisch3
git pull
sudo systemctl restart getfrisch3  # Adjust based on your setup
```

### Step 2: Set Up Log Monitoring

```bash
# Create logs directory
mkdir -p /var/www/getfrisch3/logs

# Set permissions (adjust user/group as needed)
sudo chown -R www-data:www-data /var/www/getfrisch3/logs
sudo chmod 755 /var/www/getfrisch3/logs

# Monitor logs in real-time
tail -f /var/www/getfrisch3/logs/game_submission.log
```

### Step 3: Test High Score Submission

1. **Open your site in browser** (navigate to your VPS URL)

2. **Open browser console** (F12 → Console tab)

3. **Log in to your account**

4. **Run test commands in console:**

```javascript
// Test with 44k score and 1000 moves (like the user reported)
testHighScoreSubmission(44000, 1000)

// Then submit it
testSubmitHighScore()
```

5. **Watch for output in:**
   - Browser console (client-side errors)
   - Server log: `/var/www/getfrisch3/logs/game_submission.log` (server-side processing)

### Step 4: Test Variations

Try different scenarios to isolate the issue:

```javascript
// Test 1: Lower score, fewer moves (should definitely work)
testHighScoreSubmission(10000, 200)
testSubmitHighScore()

// Test 2: High score, moderate moves
testHighScoreSubmission(44000, 1000)
testSubmitHighScore()

// Test 3: Very high score, many moves
testHighScoreSubmission(56000, 2000)
testSubmitHighScore()

// Test 4: Extreme case - very many moves
testHighScoreSubmission(56000, 5000)
testSubmitHighScore()
```

---

## What to Look For

### In Browser Console:

**Success:**
```
=== HIGH SCORE SUBMISSION TEST ===
Setting up game with score: 44000, moves: 1000
Generating 1000 moves...
Test game state created:
  Score: 44000
  Best Tile: 2048
  Move History Length: 1000
  Estimated move_history size: 87.23 KB
Ready to submit! Run testSubmitHighScore() to submit this game.

=== SUBMITTING HIGH SCORE TEST ===
Triggering submission...
Submission complete! Check the logs and database.
```

**Failure (example):**
```
API Error 413: Request too large
API Error 500: Internal server error
Failed to submit game: ...
```

### In Server Logs (`/var/www/getfrisch3/logs/game_submission.log`):

**Success:**
```
2025-12-09 10:30:15 - INFO - === GAME SUBMISSION START === User: testuser (ID: 123)
2025-12-09 10:30:15 - INFO - Score: 44000, Best Tile: 2048, Moves: 1000, Duration: 600s, Move History Length: 1000
2025-12-09 10:30:15 - INFO - Starting validation...
2025-12-09 10:30:16 - INFO - Validation result: {'valid': True, ...}
2025-12-09 10:30:16 - INFO - Creating game record (validated=True, flagged=False)
2025-12-09 10:30:16 - INFO - Setting move history and final board...
2025-12-09 10:30:16 - INFO - Adding game to session...
2025-12-09 10:30:16 - INFO - Updating user high score: 33000 -> 44000
2025-12-09 10:30:16 - INFO - Committing to database...
2025-12-09 10:30:16 - INFO - SUCCESS! Game ID 456 saved. Validated: True
2025-12-09 10:30:16 - INFO - === GAME SUBMISSION COMPLETE ===
```

**Flagged but saved:**
```
2025-12-09 10:30:15 - WARNING - Game flagged: Suspicious: Unrealistic score-to-moves ratio (2800.0 per move)
2025-12-09 10:30:15 - INFO - Creating game record (validated=False, flagged=True)
...
2025-12-09 10:30:15 - INFO - SUCCESS! Game ID 457 saved. Validated: False
```

**Fatal error:**
```
2025-12-09 10:30:15 - ERROR - FATAL ERROR in submit_game: ValueError: invalid value
2025-12-09 10:30:15 - ERROR - Traceback (most recent call last):
  File "/var/www/getfrisch3/server/routes/game.py", line 72, in submit_game
    ...
```

---

## Checking Database

After testing, verify games were saved:

```bash
cd /var/www/getfrisch3/server
source venv/bin/activate
python3 << 'EOF'
from models import db
from models.game import Game
from models.user import User
from app import create_app

app = create_app()
with app.app_context():
    # Replace with your username
    user = User.query.filter_by(username='YOUR_USERNAME').first()

    if user:
        print(f'User: {user.username} (ID: {user.id})')
        print(f'High Score in User table: {user.high_score}')

        games = Game.query.filter_by(user_id=user.id).order_by(Game.created_at.desc()).limit(5).all()
        print(f'\nRecent 5 games:')
        for g in games:
            print(f'  Game {g.id}: Score={g.score}, Moves={g.moves_count}, Validated={g.is_validated}, Flagged={g.is_flagged}')
            if g.flag_reason:
                print(f'    Flag reason: {g.flag_reason}')
    else:
        print('User not found')
EOF
```

---

## Common Issues & Solutions

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| No logs appear at all | Request not reaching server | Check nginx/apache logs, verify JWT token, check network tab in browser |
| "User not found" in logs | Invalid JWT token | Re-login and try again |
| "Validation exception" in logs | Bug in validator | Check traceback, game now saved despite error |
| "Unrealistic score-to-moves ratio" | Too high score/move average | Increase threshold further in game_validator.py |
| "Request too large" (HTTP 413) | Move history payload too big | Increase MAX_CONTENT_LENGTH (currently 50MB) |
| Game saved but `is_validated=False` | Validation failed | Check `flag_reason` field to see why |
| No error but game not in DB | Silent exception before commit | Check full traceback in logs |

---

## Next Steps

Once you identify the issue:

1. **If validation is too strict**: Adjust thresholds in `game_validator.py`
2. **If payload too large**: Increase `MAX_CONTENT_LENGTH` or optimize move history storage
3. **If database constraint**: Check error in traceback and fix schema/model
4. **If network/auth issue**: Fix JWT, CORS, or nginx configuration

Share the logs and I can help diagnose further!
