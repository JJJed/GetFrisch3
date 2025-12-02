# Google OAuth Setup Checklist

Use this checklist to ensure you've completed all steps for Google Sign-In integration.

## Backend Setup

- [x] Install Google OAuth dependencies (`pip install -r requirements.txt`)
- [x] Update User model with Google fields
- [x] Add Google OAuth endpoint to auth routes
- [ ] Run database migration (`mysql -u root -p your_database < migrations/add_google_oauth.sql`)
- [ ] Set `GOOGLE_CLIENT_ID` in `config/.env`
- [ ] Set `GOOGLE_CLIENT_SECRET` in `config/.env` (optional, for future use)
- [ ] Restart Flask server

## Google Cloud Console Setup

- [ ] Create Google Cloud Project
- [ ] Enable Google+ API (or Google Identity Services)
- [ ] Configure OAuth Consent Screen
  - [ ] Add app name
  - [ ] Add support email
  - [ ] Add scopes (email, profile)
- [ ] Create OAuth 2.0 Client ID
  - [ ] Select "Web application"
  - [ ] Add Authorized JavaScript origins (e.g., http://localhost:5000)
  - [ ] Add Authorized redirect URIs
  - [ ] Copy Client ID
  - [ ] Copy Client Secret
- [ ] Update `.env` with credentials

## Frontend Integration

- [ ] Add Google Platform Library script to HTML
- [ ] Add Google Sign-In button HTML
- [ ] Implement `handleCredentialResponse()` function
- [ ] Test sign-in flow
- [ ] Handle success response (store token, redirect)
- [ ] Handle error cases

## Testing

- [ ] Test new user registration via Google
- [ ] Test existing user login via Google
- [ ] Test account linking (existing email + Google)
- [ ] Test token verification
- [ ] Test banned user rejection
- [ ] Verify profile picture display
- [ ] Verify user is marked as verified

## Production Deployment

- [ ] Update Authorized JavaScript origins with production domain
- [ ] Update Authorized redirect URIs with production domain
- [ ] Set production environment variables
- [ ] Run database migration on production database
- [ ] Enable HTTPS
- [ ] Test in production environment
- [ ] Publish OAuth consent screen (optional)

## Documentation Review

- [ ] Read `GOOGLE_OAUTH_SETUP.md` for detailed instructions
- [ ] Review `GOOGLE_OAUTH_SUMMARY.md` for implementation overview
- [ ] Check `examples/google_signin_example.html` for frontend example

## Optional Enhancements

- [ ] Add "Link Google Account" feature for existing users
- [ ] Add ability to unlink Google account
- [ ] Display Google profile picture in UI
- [ ] Add option to update username after Google sign-in
- [ ] Implement "Sign in with Google" on mobile app

## Troubleshooting

If you encounter issues:
- [ ] Check server logs for errors
- [ ] Verify `GOOGLE_CLIENT_ID` is set correctly
- [ ] Ensure domain is in Authorized JavaScript origins
- [ ] Confirm Google token is being sent correctly
- [ ] Test with different Google accounts
- [ ] Check database migration was applied

---

**Quick Test Command:**
```bash
curl -X POST http://localhost:5000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"credential": "test-token"}'
```

Expected error (confirms endpoint is working):
```json
{"error": "Invalid Google token"}
```
