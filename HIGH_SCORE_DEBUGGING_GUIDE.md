# High Score Debugging Guide

## Problem Summary
Scores above ~37,000 are not being submitted to the leaderboard, with no records appearing in submission logs. Users experiencing this issue have restricted browser console access.

## Root Causes Identified

### 1. **Score-to-Moves Ratio Validation**
Location: `server/utils/game_validator.py:235`

```python
if avg_score_per_move > 2000:  # 2000 points per move threshold
    return {'valid': False, 'reason': 'Unrealistic score-to-moves ratio'}
```

**Impact**: A score of 37,000 achieved in fewer than ~19 moves will be flagged as invalid.

For high scores (50k+), this threshold may be too strict since:
- Exponential tile growth naturally increases score per move
- Late-game merges of high-value tiles add thousands of points per move

### 2. **Silent Client-Side Failures**
- All errors only logged to console (console.log, console.error)
- Users with restricted console access can't see failures
- No server-side logging of client submission attempts

### 3. **Potential Request Size Issues**
- High-scoring games have extensive move histories (200+ moves)
- JSON payloads can become very large
- Current limit: 50MB (should be sufficient, but worth monitoring)

## Solution Implemented: Remote Error Logging

### New Files Created

1. **`client/js/remote_logger.js`** - Client-side remote logger
   - Captures all console logs and sends to server
   - Includes error details, stack traces, and context
   - Buffers logs for batch sending

2. **`server/routes/logs.py`** - Server endpoint for receiving logs
   - POST `/api/logs/client` - Receive client logs
   - GET `/api/logs/client/recent` - View recent logs
   - Prints to server console for immediate visibility

3. **`server/models/client_log.py`** - Database model for storing logs
   - Stores all client-side events
   - Indexed by user_id, level, and timestamp
   - Includes user_agent and URL for context

4. **`server/migrations/add_client_logs.sql`** - Database migration
   - Creates client_logs table

5. **`server/view_client_logs.py`** - Log viewer script
   - View historical logs
   - Real-time log following (like `tail -f`)
   - Filter by level, user, or search terms

### Modified Files

1. **`client/js/leaderboard_handler.js`** - Updated score submission
   - Added remote logging before submission attempt
   - Logs score, moves, avg per move
   - Captures all errors with full details
   - Logs validation failures with reasons

2. **`client/index.html`** - Added remote logger script
   - Loads remote_logger.js before other scripts

3. **`server/app.py`** - Registered logs blueprint
   - Added logs_bp registration

## Setup Instructions

### 1. Run Database Migration

```bash
cd /Users/jed/getfrisch3/getfrisch3
mysql -u root -p getfrisch < server/migrations/add_client_logs.sql
```

Or connect to your MySQL database and run the migration SQL directly.

### 2. Restart Server

```bash
cd server
python app.py
```

### 3. Deploy Client Changes

If you're using a build process, rebuild the client:
```bash
# Copy new files to your production server
# Or rebuild/redeploy as appropriate for your setup
```

## How to Debug High Score Issues

### Method 1: Real-Time Log Following

Open a terminal and run:
```bash
cd /Users/jed/getfrisch3/getfrisch3
python server/view_client_logs.py --follow
```

Then ask users to play and try to submit their high scores. You'll see all logs in real-time including:
- Submission attempts with score details
- Validation failures with reasons
- Network errors with response codes
- JavaScript errors with stack traces

### Method 2: View Recent Error Logs

```bash
python server/view_client_logs.py --level error --limit 100
```

This shows the last 100 error logs, which should include any submission failures.

### Method 3: Filter by User

If you know a specific user is having issues:
```bash
python server/view_client_logs.py --user-id 123 --limit 50
```

### Method 4: Check Server Console

When logs are received, they're also printed to the server console:
```
[CLIENT ERROR] Game submission failed | User: 42 | Data: {...}
```

### Method 5: Web API

You can also query logs via HTTP:
```bash
# Get recent error logs
curl http://localhost:5000/api/logs/client/recent?level=error&limit=50

# Get logs for specific user
curl http://localhost:5000/api/logs/client/recent?user_id=123
```

## What to Look For

When a high score fails to submit, you'll see logs like this:

### Successful Submission
```
[INFO] Game submission attempt
  Data: {
    "score": 37500,
    "moves_count": 150,
    "best_tile": 8192,
    "avg_score_per_move": "250.00"
  }

[INFO] Game submission successful
  Data: {"score": 37500, "validated": true}
```

### Validation Failure (Score-to-Moves Ratio)
```
[WARN] Game was flagged by server
  Data: {
    "score": 37500,
    "validation_error": "Unrealistic score-to-moves ratio (2100.0 per move)",
    "moves_count": 18,
    "avg_score_per_move": "2083.33"
  }
```

### Network/Server Error
```
[ERROR] Game submission failed
  Data: {
    "score": 37500,
    "moves_count": 150,
    "error_message": "Network request failed",
    "response_status": 413,
    "response_data": {"error": "Request too large"}
  }
```

## Potential Fixes

### If Score-to-Moves Ratio is Too Strict

Edit `server/utils/game_validator.py:235`:

```python
# Current threshold
if avg_score_per_move > 2000:

# Increase to be more lenient for high scores
if avg_score_per_move > 3000:  # or higher

# Or use dynamic threshold based on score
max_ratio = 2000 if score < 50000 else 3500
if avg_score_per_move > max_ratio:
```

### If Request Size is Too Large

Edit `server/app.py:35`:

```python
# Current limit: 50MB
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

# Increase to 100MB
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
```

### If Move History Recording is Failing

Check the browser console (for users who can access it) to see if moves are being recorded:
```javascript
// In browser console
console.log(gameManager.moveHistory.length)
console.log(gameManager.moveHistory.slice(-5))  // Last 5 moves
```

## Testing

### Test Remote Logging

1. Open your game in a browser
2. Open browser console
3. Run: `remoteLogger.info('Test log', {test: 'data'})`
4. Check server console or run: `python server/view_client_logs.py --limit 1`

### Test High Score Submission

Use the existing debug utilities:

```javascript
// In browser console
testHighScoreSubmission(37500, 150)  // Creates a test game
testSubmitHighScore()  // Submits it
```

Watch the logs in real-time:
```bash
python server/view_client_logs.py --follow
```

## Next Steps

1. **Deploy the changes** to your production environment
2. **Run the database migration** to create the client_logs table
3. **Ask affected users to try again** and watch the logs
4. **Analyze the logs** to identify the specific failure point
5. **Adjust validation thresholds** if needed based on legitimate gameplay patterns

## Questions?

If you see unexpected behavior in the logs, share the relevant log entries and we can investigate further.

Key files to check:
- `client/js/game_manager.js:157-194` - Where game data is prepared and submitted
- `client/js/leaderboard_handler.js:167-255` - Submission logic with logging
- `server/routes/game.py:30-144` - Server-side submission handling
- `server/utils/game_validator.py:233-240` - Score-to-moves validation
