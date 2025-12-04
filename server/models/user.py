from . import db
from datetime import datetime
import bcrypt

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    is_anonymous = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    is_banned = db.Column(db.Boolean, default=False)
    high_score = db.Column(db.Integer, default=0, nullable=False, index=True)
    school = db.Column(db.String(100), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)

    # Google OAuth fields
    google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    google_profile_picture = db.Column(db.String(500), nullable=True)

    # Relationships
    games = db.relationship('Game', backref='player', lazy='dynamic', cascade='all, delete-orphan')

    def set_password(self, password):
        """Hash and set the user's password"""
        if password:
            self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            self.is_anonymous = False

    def check_password(self, password):
        """Verify password against hash"""
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self, include_email=False):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'username': self.username,
            'is_anonymous': self.is_anonymous,
            'is_verified': self.is_verified,
            'school': self.school,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_email and self.email:
            data['email'] = self.email
        if self.google_id:
            data['has_google'] = True
            if self.google_profile_picture:
                data['profile_picture'] = self.google_profile_picture
        else:
            data['has_google'] = False
        return data

    @staticmethod
    def find_or_create_google_user(google_id, email, name, picture):
        """Find or create a user from Google OAuth data"""
        # First try to find by Google ID
        user = User.query.filter_by(google_id=google_id).first()
        if user:
            # Update profile picture if changed
            if picture and user.google_profile_picture != picture:
                user.google_profile_picture = picture
            user.last_login = datetime.utcnow()
            return user

        # Try to find by email if provided
        if email:
            user = User.query.filter_by(email=email).first()
            if user:
                # Link Google account to existing user
                user.google_id = google_id
                user.google_profile_picture = picture
                user.is_verified = True
                user.is_anonymous = False
                user.last_login = datetime.utcnow()
                return user

        # Create new user
        # Generate username from name or email
        base_username = name.lower().replace(' ', '_') if name else email.split('@')[0]
        username = base_username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}_{counter}"
            counter += 1

        user = User(
            username=username,
            email=email,
            google_id=google_id,
            google_profile_picture=picture,
            is_anonymous=False,
            is_verified=True
        )
        return user

    def __repr__(self):
        return f'<User {self.username}>'
