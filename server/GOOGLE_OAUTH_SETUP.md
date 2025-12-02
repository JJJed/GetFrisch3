# Google OAuth Setup Guide for GetFrisch3

This guide will walk you through setting up Google Sign-In for your GetFrisch3 application.

## Prerequisites

- A Google account
- Access to the Google Cloud Console
- GetFrisch3 server running

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "GetFrisch3")
5. Click "Create"

## Step 2: Enable Google+ API

1. In your Google Cloud project, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" (or "Internal" if using Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - App name: GetFrisch3
   - User support email: Your email
   - Developer contact information: Your email
5. Click "Save and Continue"
6. On the Scopes page, click "Add or Remove Scopes"
7. Add the following scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
8. Click "Save and Continue"
9. Add test users if using External (optional for testing)
10. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Enter a name (e.g., "GetFrisch3 Web Client")
5. Add Authorized JavaScript origins:
   - `http://localhost:5000` (for development)
   - `http://localhost:3000` (if using separate frontend)
   - Add your production domain (e.g., `https://yourdomain.com`)
6. Add Authorized redirect URIs:
   - `http://localhost:5000` (for development)
   - Add your production domain
7. Click "Create"
8. Copy the **Client ID** and **Client Secret**

## Step 5: Update Environment Variables

1. Open `config/.env`
2. Add your Google OAuth credentials:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

3. Save the file

## Step 6: Run Database Migration

Run the SQL migration to add Google OAuth fields to the users table:

```bash
mysql -u your_username -p your_database < server/migrations/add_google_oauth.sql
```

Or if using the Flask CLI:

```bash
cd server
python -c "from app import app, db; app.app_context().push(); db.create_all()"
```

## Step 7: Update Frontend (Client)

You need to add the Google Sign-In button to your frontend. Here's how:

### Add Google Platform Library

Add this script to your HTML `<head>`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### Add Google Sign-In Button

Add this to your login/signup page:

```html
<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"
     data-callback="handleCredentialResponse">
</div>
<div class="g_id_signin" data-type="standard"></div>
```

### Add JavaScript Handler

```javascript
function handleCredentialResponse(response) {
  // Send the credential to your backend
  fetch('/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credential: response.credential
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.access_token) {
      // Store the token
      localStorage.setItem('token', data.access_token);
      // Store user info
      localStorage.setItem('user', JSON.stringify(data.user));
      // Redirect to dashboard or home
      window.location.href = '/';
    } else {
      console.error('Authentication failed:', data.error);
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
}
```

## API Endpoint

The Google OAuth endpoint is available at:

```
POST /api/auth/google
```

**Request Body:**
```json
{
  "credential": "google-jwt-token-here"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Google authentication successful",
  "access_token": "jwt-token-here",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "is_anonymous": false,
    "is_verified": true,
    "has_google": true,
    "profile_picture": "https://..."
  }
}
```

**Error Responses:**
- `400`: Missing credential token
- `401`: Invalid Google token
- `403`: Account banned
- `500`: Server error or Google OAuth not configured

## How It Works

1. User clicks "Sign in with Google" button on your frontend
2. Google handles the authentication and returns a JWT credential
3. Frontend sends this credential to `/api/auth/google`
4. Backend verifies the token with Google
5. Backend finds or creates a user account
6. Backend returns a JWT access token for your application
7. Frontend stores the token and user info

## User Account Linking

If a user signs in with Google using an email that already exists in your database:
- The Google account will be linked to the existing user account
- The user will be marked as verified
- The user can use either password or Google Sign-In in the future

## Security Notes

- Always use HTTPS in production
- Keep your `GOOGLE_CLIENT_SECRET` secure and never commit it to version control
- The backend verifies all Google tokens to prevent tampering
- Email must be verified by Google to authenticate

## Troubleshooting

### "Google OAuth not configured on server"
- Make sure `GOOGLE_CLIENT_ID` is set in your `.env` file
- Restart your Flask server after adding environment variables

### "Invalid Google token"
- Check that your Client ID matches between frontend and backend
- Verify the token hasn't expired
- Ensure your domain is added to Authorized JavaScript origins

### "Account has been banned"
- The user account has been flagged in your system
- Contact support or check the `is_banned` field in the database

## Testing

1. Start your server: `cd server && python app.py`
2. Open your frontend in a browser
3. Click the Google Sign-In button
4. Authenticate with a Google account
5. Verify you're logged in with the returned JWT token

## Production Deployment

Before deploying to production:

1. Update Authorized JavaScript origins with your production domain
2. Update Authorized redirect URIs with your production domain
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in production environment
4. Run the database migration on your production database
5. Use HTTPS for all requests
6. Consider publishing your OAuth consent screen (remove test mode)
