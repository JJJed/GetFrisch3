# High Score Debugging Implementation Summary

## The Problem

Scores above ~37,000 are not being submitted to the leaderboard, with no records in submission logs. This indicates a **front-end issue** since the requests aren't reaching your server logs.

## Root Cause Analysis

After analyzing your codebase, I identified **the most likely culprit**:

### Score-to-Moves Ratio Validation (server/utils/game_validator.py:235)

```python
if avg_score_per_move > 2000:  # Anti-cheat threshold
    return {'valid': False, 'reason': 'Unrealistic score-to-moves ratio'}
```

**For a score of 37,000:**
- If achieved in fewer than 19 moves: **REJECTED**
- The game is flagged but the client only logs to console
- Users with restricted console access can't see the error

**The Problem with High Scores:**
- Late-game merges (combining 4096 + 4096 = 8192) add thousands of points per move
- Legitimate high-scoring games naturally have higher points-per-move ratios
- The current 2000 threshold may be too strict for scores above 50k

## The Solution: Remote Error Logging

Since users can't access browser consoles, I've implemented a **remote logging system** that captures all client-side errors and sends them to your server where you can view them.

## Files Created

### 1. Client-Side Logger
- **`client/js/remote_logger.js`**
  - Captures all console logs (info, warn, error, debug)
  - Automatically sends to server via `/api/logs/client`
  - Works even when browser console is restricted

### 2. Server-Side Logging Endpoint
- **`server/routes/logs.py`**
  - POST `/api/logs/client` - Receives logs from clients
  - GET `/api/logs/client/recent` - Query historical logs
  - Prints to server console for immediate visibility

### 3. Database Model
- **`server/models/client_log.py`**
  - Stores logs with user_id, level, message, data, timestamp
  - Indexed for fast queries

### 4. Database Migration
- **`server/migrations/add_client_logs.sql`**
  - Creates the client_logs table

### 5. Log Viewer Script
- **`server/view_client_logs.py`**
  - Real-time log following: `python view_client_logs.py --follow`
  - Filter by level: `--level error`
  - Filter by user: `--user-id 123`

### 6. Setup Script
- **`setup_debugging.sh`**
  - Automated setup with database migration
  - Usage: `./setup_debugging.sh`

### 7. Documentation
- **`HIGH_SCORE_DEBUGGING_GUIDE.md`**
  - Complete guide with examples and troubleshooting
  - Shows what different errors look like
  - Explains how to adjust validation thresholds

## Files Modified

### 1. Enhanced Submission Logging
- **`client/js/leaderboard_handler.js`**
  - Added remote logging before every submission attempt
  - Logs: score, moves, best_tile, avg_score_per_move
  - Captures full error details with stack traces
  - Logs validation failures from server

### 2. Script Inclusion
- **`client/index.html`**
  - Added `<script src="js/remote_logger.js"></script>`

### 3. Blueprint Registration
- **`server/app.py`**
  - Registered logs_bp for `/api/logs/*` endpoints

## Quick Start

### 1. Run Database Migration

```bash
cd /Users/jed/getfrisch3/getfrisch3
./setup_debugging.sh
```

Or manually:
```bash
mysql -u root -p getfrisch < server/migrations/add_client_logs.sql
```

### 2. Restart Your Server

```bash
cd server
python app.py
```

### 3. Monitor Logs in Real-Time

Open a new terminal:
```bash
cd /Users/jed/getfrisch3/getfrisch3/server
python view_client_logs.py --follow
```

### 4. Ask Users to Try Again

Have affected users play and submit their high scores. You'll now see:
- Every submission attempt
- Validation failures with reasons
- Network errors with response codes
- JavaScript errors with stack traces

## What You'll See

### When Score-to-Moves Ratio is Exceeded:
```
[WARN] Game was flagged by server
  Data: {
    "score": 37500,
    "validation_error": "Unrealistic score-to-moves ratio (2100.0 per move)",
    "moves_count": 18,
    "avg_score_per_move": "2083.33"
  }
```

### When Submission Succeeds:
```
[INFO] Game submission attempt
  Data: {"score": 37500, "moves_count": 150, "avg_score_per_move": "250.00"}

[INFO] Game submission successful
  Data: {"score": 37500, "validated": true}
```

## Likely Fix Required

If logs show the score-to-moves ratio is the issue, you have two options:

### Option 1: Increase Threshold
Edit `server/utils/game_validator.py:235`:
```python
# Change from 2000 to 3000 or higher
if avg_score_per_move > 3000:
```

### Option 2: Dynamic Threshold
```python
# Scale threshold based on score
max_ratio = 2000 if score < 50000 else 3500
if avg_score_per_move > max_ratio:
```

## Testing

### Test the Remote Logger
Open your game in browser console:
```javascript
remoteLogger.info('Test', {foo: 'bar'})
```

Then check:
```bash
python server/view_client_logs.py --limit 1
```

### Test High Score Submission
In browser console:
```javascript
testHighScoreSubmission(37500, 150)
testSubmitHighScore()
```

Watch in terminal:
```bash
python server/view_client_logs.py --follow
```

## Next Steps

1. ✅ **Deploy these changes** to your production server
2. ✅ **Run the database migration**
3. ✅ **Restart your Flask server**
4. ✅ **Start log monitoring**: `python server/view_client_logs.py --follow`
5. ✅ **Ask affected users to try again**
6. ✅ **Analyze the logs** to confirm root cause
7. ✅ **Adjust validation threshold** if needed

## Important Notes

- The remote logger gracefully handles failures (won't break the game if logging fails)
- Logs are also printed to server console for immediate visibility
- The setup script is idempotent (safe to run multiple times)
- All changes are backward compatible

## Questions or Issues?

Check `HIGH_SCORE_DEBUGGING_GUIDE.md` for detailed troubleshooting and examples.

Key areas to investigate:
1. Score-to-moves ratio validation (most likely)
2. Request payload size (less likely, but possible with 200+ moves)
3. Client-side JavaScript errors (now captured by remote logger)
4. Network issues (timeouts, dropped connections)