from models import db
from datetime import datetime

class ClientLog(db.Model):
    """
    Model for storing client-side logs
    Useful for debugging issues on devices where console access is restricted
    """
    __tablename__ = 'client_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    level = db.Column(db.String(20), nullable=False, index=True)  # info, warn, error, debug
    message = db.Column(db.Text, nullable=False)
    data = db.Column(db.Text, nullable=True)  # JSON data
    user_agent = db.Column(db.String(500), nullable=True)
    url = db.Column(db.String(500), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationship to user
    user = db.relationship('User', backref='client_logs')

    def __repr__(self):
        return f'<ClientLog {self.id}: [{self.level}] {self.message}>'