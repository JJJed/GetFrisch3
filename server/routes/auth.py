from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db
from models.user import User
from datetime import datetime
import re
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

bp = Blueprint('auth', __name__)

def validate_email(email):
    """Simple email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_username(username):
    """Validate username format"""
    if not username or len(username) < 3 or len(username) > 50:
        return False
    # Allow letters, numbers, underscores, hyphens
    pattern = r'^[a-zA-Z0-9_-]+$'
    return re.match(pattern, username) is not None

@bp.route('/register', methods=['POST'])
def register():
    """Register a new user account"""
    try:
        data = request.get_json()

        username = data.get('username', '').strip()
        email = data.get('email', '').strip() if data.get('email') else None
        password = data.get('password', '')

        # Validate username
        if not validate_username(username):
            return jsonify({
                'error': 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens'
            }), 400

        # Check if username exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400

        # Validate email if provided
        if email:
            if not validate_email(email):
                return jsonify({'error': 'Invalid email format'}), 400

            if User.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already registered'}), 400

        # Validate password
        if not password or len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        # Create user
        user = User(username=username, email=email, is_anonymous=False)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        # Create access token (identity must be a string)
        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': user.to_dict(include_email=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/login', methods=['POST'])
def login():
    """Login with username and password"""
    try:
        data = request.get_json()

        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400

        # Find user
        user = User.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401

        if user.is_banned:
            return jsonify({'error': 'Account has been banned'}), 403

        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()

        # Create access token (identity must be a string)
        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': user.to_dict(include_email=True)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/anonymous', methods=['POST'])
def create_anonymous():
    """Create an anonymous user session"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()

        if not validate_username(username):
            return jsonify({
                'error': 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens'
            }), 400

        # Check if username exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            # If it's an anonymous user with same name, create variation
            counter = 1
            new_username = f"{username}_{counter}"
            while User.query.filter_by(username=new_username).first():
                counter += 1
                new_username = f"{username}_{counter}"
            username = new_username

        # Create anonymous user
        user = User(username=username, is_anonymous=True)
        db.session.add(user)
        db.session.commit()

        # Create access token (identity must be a string)
        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            'message': 'Anonymous user created',
            'access_token': access_token,
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info"""
    try:
        user_id = int(get_jwt_identity())  # Convert string back to int
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'user': user.to_dict(include_email=True)}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/check-username', methods=['POST'])
def check_username():
    """Check if username is available"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()

        if not username:
            return jsonify({'error': 'Username required'}), 400

        exists = User.query.filter_by(username=username).first() is not None

        return jsonify({
            'username': username,
            'available': not exists
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/google', methods=['POST'])
def google_auth():
    """Authenticate with Google OAuth"""
    try:
        data = request.get_json()
        token = data.get('credential')

        if not token:
            return jsonify({'error': 'Google credential token required'}), 400

        # Verify the Google token
        try:
            google_client_id = os.getenv('GOOGLE_CLIENT_ID')
            if not google_client_id:
                return jsonify({'error': 'Google OAuth not configured on server'}), 500

            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                google_client_id
            )

            # Extract user info from token
            google_id = idinfo['sub']
            email = idinfo.get('email')
            name = idinfo.get('name', '')
            picture = idinfo.get('picture')

            # Verify email if present
            email_verified = idinfo.get('email_verified', False)
            if email and not email_verified:
                return jsonify({'error': 'Google email not verified'}), 400

        except ValueError as e:
            return jsonify({'error': 'Invalid Google token'}), 401

        # Check if user exists
        user = User.query.filter_by(google_id=google_id).first()

        # If user doesn't exist by Google ID, check by email
        if not user and email:
            user = User.query.filter_by(email=email).first()
            # If found by email, link the Google account
            if user:
                user.google_id = google_id
                user.google_profile_picture = picture
                user.is_verified = True
                user.is_anonymous = False
                user.last_login = datetime.utcnow()
                db.session.commit()

        # If user exists, log them in
        if user:
            # Check if user is banned
            if user.is_banned:
                return jsonify({'error': 'Account has been banned'}), 403

            # Update profile picture if changed
            if picture and user.google_profile_picture != picture:
                user.google_profile_picture = picture
            user.last_login = datetime.utcnow()
            db.session.commit()

            # Create access token
            access_token = create_access_token(identity=str(user.id))

            return jsonify({
                'message': 'Google authentication successful',
                'access_token': access_token,
                'user': user.to_dict(include_email=True)
            }), 200

        # New user - return flag to request username
        return jsonify({
            'needs_username': True,
            'google_data': {
                'google_id': google_id,
                'email': email,
                'name': name,
                'picture': picture
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/google/complete', methods=['POST'])
def google_complete_registration():
    """Complete Google sign-in by choosing a username"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        google_id = data.get('google_id')
        email = data.get('email')
        name = data.get('name')
        picture = data.get('picture')

        # Validate inputs
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        if not google_id:
            return jsonify({'error': 'Google authentication data missing'}), 400

        # Validate username format
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400

        if len(username) > 20:
            return jsonify({'error': 'Username must be less than 20 characters'}), 400

        if not username.replace('_', '').isalnum():
            return jsonify({'error': 'Username can only contain letters, numbers, and underscores'}), 400

        # Check if username is already taken
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'error': 'Username already taken'}), 400

        # Check if user was already created (shouldn't happen but be safe)
        user = User.query.filter_by(google_id=google_id).first()
        if user:
            return jsonify({'error': 'Account already exists'}), 400

        # Create new user with chosen username
        user = User(
            username=username,
            email=email,
            google_id=google_id,
            google_profile_picture=picture,
            is_anonymous=False,
            is_verified=True
        )

        db.session.add(user)
        db.session.commit()

        # Create access token
        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            'message': 'Registration completed successfully',
            'access_token': access_token,
            'user': user.to_dict(include_email=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/update-school', methods=['POST'])
@jwt_required()
def update_school():
    """Update user's school affiliation"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        school = data.get('school', '').strip()

        # Allow null/empty to clear school
        if not school:
            user.school = None
        else:
            # Validate school name length
            if len(school) > 100:
                return jsonify({'error': 'School name must be less than 100 characters'}), 400
            user.school = school

        db.session.commit()

        return jsonify({
            'message': 'School updated successfully',
            'user': user.to_dict(include_email=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
