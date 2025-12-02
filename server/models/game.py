from . import db
from datetime import datetime
import json

class Game(db.Model):
    __tablename__ = 'games'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    score = db.Column(db.Integer, nullable=False, index=True)
    best_tile = db.Column(db.Integer, nullable=False)
    moves_count = db.Column(db.Integer, nullable=False)
    game_duration = db.Column(db.Integer, nullable=False)  # in seconds
    move_history = db.Column(db.Text, nullable=False)  # JSON string of moves
    final_board = db.Column(db.Text, nullable=False)  # JSON string of board state
    is_win = db.Column(db.Boolean, default=False)
    is_validated = db.Column(db.Boolean, default=False)
    is_flagged = db.Column(db.Boolean, default=False)
    flag_reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def set_move_history(self, moves):
        """Store move history as JSON"""
        self.move_history = json.dumps(moves)

    def get_move_history(self):
        """Retrieve move history from JSON"""
        return json.loads(self.move_history) if self.move_history else []

    def set_final_board(self, board):
        """Store final board state as JSON"""
        self.final_board = json.dumps(board)

    def get_final_board(self):
        """Retrieve final board state from JSON"""
        return json.loads(self.final_board) if self.final_board else []

    def to_dict(self, include_history=False):
        """Convert game to dictionary"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.player.username if self.player else 'Unknown',
            'score': self.score,
            'best_tile': self.best_tile,
            'moves_count': self.moves_count,
            'game_duration': self.game_duration,
            'is_win': self.is_win,
            'is_validated': self.is_validated,
            'is_verified': self.player.is_verified if self.player else False,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_history:
            data['move_history'] = self.get_move_history()
            data['final_board'] = self.get_final_board()
        return data

    def __repr__(self):
        return f'<Game {self.id} - Score: {self.score}>'
