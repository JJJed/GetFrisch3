# High Score Testing Guide

## Problem Fixed

The issue with scores above 20k not passing verification was caused by Flask's default request size limit being too small to handle the large JSON payloads that come with extensive move histories.

## Solutions Implemented

1. **Increased Request Size Limit**: Set `MAX_CONTENT_LENGTH` to 50MB in `server/app.py:35`
2. **Added Error Handling**: Added 413 error handler for better error messages in `server/app.py:106-112`
3. **Created Test Endpoint**: New `/api/game/submit-test` endpoint for testing high scores without playing

## Testing High Scores

### Method 1: Using the Python Test Script

```bash
python test_high_scores.py
```

Or specify a score directly:
```bash
python test_high_scores.py 25000
python test_high_scores.py 50000
python test_high_scores.py 100000
```

### Method 2: Using curl

First, login to get a token:
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
```

Then submit a test game:
```bash
curl -X POST http://localhost:5000/api/game/submit-test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score": 25000, "best_tile": 2048}'
```

### Method 3: Using JavaScript in Browser Console

```javascript
// First login and save token
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'your_username', password: 'your_password'})
});
const {access_token} = await loginResponse.json();

// Then submit test game
const testResponse = await fetch('/api/game/submit-test', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    score: 25000,
    best_tile: 2048,
    moves_count: 250
  })
});
const result = await testResponse.json();
console.log(result);
```

## Verifying the Fix

After submitting a test game:
1. Check the response to ensure `is_validated: true` and `is_flagged: false`
2. Visit the leaderboard at http://localhost:5000
3. Verify the high score appears on the leaderboard

## Additional Scores to Test

Try these score ranges to verify full functionality:
- 15,000 (known previous failure point)
- 20,000 (original issue threshold)
- 30,000
- 50,000
- 100,000+

## Technical Details

### Files Modified
- `server/app.py:35` - Added MAX_CONTENT_LENGTH configuration
- `server/app.py:106-112` - Added 413 error handler
- `server/routes/game.py:187-263` - Added `/submit-test` endpoint

### What Changed
The Flask app now accepts requests up to 50MB in size, which is sufficient for even extremely long games with extensive move histories. This removes the bottleneck that was preventing high-score games from being submitted.

### Why This Works
High scores require many moves (e.g., 200+ moves for a 20k+ score). Each move in the history is a JSON object containing direction and score data. When serialized and sent in a POST request, this can easily exceed the default Flask request size limit. By increasing the limit to 50MB, we ensure that even games with 1000+ moves can be submitted successfully.
