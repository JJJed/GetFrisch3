from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
from sqlalchemy import func

from models import db
from models.user import User
from models.game import Game

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../config/.env'))

# Initialize Flask app
app = Flask(__name__, static_folder='../client', static_url_path='')

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:"
    f"{os.getenv('DB_PASSWORD', '')}@"
    f"{os.getenv('DB_HOST', 'localhost')}:"
    f"{os.getenv('DB_PORT', '3306')}/"
    f"{os.getenv('DB_NAME', 'getfrisch')}"
)
app.config['SQLALCHEMY_POOL_SIZE'] = 10
app.config['SQLALCHEMY_MAX_OVERFLOW'] = 20
app.config['SQLALCHEMY_POOL_RECYCLE'] = 3600
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
CORS(app, origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(','))
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Import routes after app initialization
from routes import auth, game, leaderboard

# Register blueprints
app.register_blueprint(auth.bp, url_prefix='/api/auth')
app.register_blueprint(game.bp, url_prefix='/api/game')
app.register_blueprint(leaderboard.bp, url_prefix='/api/leaderboard')

# Serve static files (client)
@app.route('/')
def index():
    return app.send_static_file('index.html')

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connected', {'message': 'Connected to GetFrisch server'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('request_leaderboard')
def handle_leaderboard_request():
    """Send current leaderboard to client - shows only best score per player"""
    try:
        limit = int(os.getenv('MAX_LEADERBOARD_SIZE', 100))

        # Get best score for each user (deduplicate by player)
        subquery = db.session.query(
            Game.user_id,
            func.max(Game.score).label('best_score')
        ).filter_by(is_validated=True, is_flagged=False)\
            .group_by(Game.user_id)\
            .subquery()

        # Subquery to get the game ID for each user's best score (most recent if tied)
        game_id_subquery = db.session.query(
            Game.user_id,
            func.max(Game.id).label('game_id')
        ).join(subquery, (Game.user_id == subquery.c.user_id) & (Game.score == subquery.c.best_score))\
            .filter(Game.is_validated == True, Game.is_flagged == False)\
            .group_by(Game.user_id)\
            .subquery()

        # Join to get the actual game records - one per player
        top_games = db.session.query(Game)\
            .join(game_id_subquery, Game.id == game_id_subquery.c.game_id)\
            .order_by(Game.score.desc())\
            .limit(limit)\
            .all()

        leaderboard_data = [game.to_dict() for game in top_games]
        emit('leaderboard_update', {'leaderboard': leaderboard_data})
    except Exception as e:
        emit('error', {'message': str(e)})

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

# Database initialization
@app.cli.command()
def init_db():
    """Initialize the database."""
    db.create_all()
    print('Database initialized.')

@app.cli.command()
def reset_db():
    """Reset the database."""
    db.drop_all()
    db.create_all()
    print('Database reset.')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    host = os.getenv('SERVER_HOST', '0.0.0.0')
    port = int(os.getenv('SERVER_PORT', 5000))

    print(f"Starting GetFrisch server on {host}:{port}")
    socketio.run(app, host=host, port=port, debug=(os.getenv('FLASK_ENV') == 'development'))
