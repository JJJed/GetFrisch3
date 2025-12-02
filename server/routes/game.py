from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.user import User
from models.game import Game
from utils.game_validator import GameValidator
import os

bp = Blueprint('game', __name__)

@bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_game():
    """Submit a completed game for validation and leaderboard"""
    try:
        user_id = int(get_jwt_identity())  # Convert string to int
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.is_banned:
            return jsonify({'error': 'Account is banned'}), 403

        data = request.get_json()

        # Extract game data
        score = data.get('score', 0)
        best_tile = data.get('best_tile', 0)
        moves_count = data.get('moves_count', 0)
        game_duration = data.get('game_duration', 0)
        move_history = data.get('move_history', [])
        final_board = data.get('final_board', [])
        is_win = data.get('is_win', False)

        # Basic validation
        if score < 0 or best_tile < 0 or moves_count < 0 or game_duration < 0:
            return jsonify({'error': 'Invalid game data: negative values'}), 400

        if not move_history:
            return jsonify({'error': 'Move history required for validation'}), 400

        # Validate game using server-side validator
        validator = GameValidator()
        validation_enabled = os.getenv('MOVE_VALIDATION_ENABLED', 'true').lower() == 'true'

        is_validated = True
        flag_reason = None

        if validation_enabled:
            validation_result = validator.validate_game(move_history, score, final_board)

            if not validation_result['valid']:
                is_validated = False
                flag_reason = validation_result.get('reason', 'Validation failed')

        # Create game record
        game = Game(
            user_id=user_id,
            score=score,
            best_tile=best_tile,
            moves_count=moves_count,
            game_duration=game_duration,
            is_win=is_win,
            is_validated=is_validated,
            is_flagged=not is_validated,
            flag_reason=flag_reason
        )

        game.set_move_history(move_history)
        game.set_final_board(final_board)

        db.session.add(game)
        db.session.commit()

        # Emit leaderboard update via WebSocket
        from app import socketio
        socketio.emit('leaderboard_changed', {'game_id': game.id})

        response_data = {
            'message': 'Game submitted successfully',
            'game': game.to_dict(),
            'validated': is_validated
        }

        if not is_validated:
            response_data['validation_error'] = flag_reason

        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/history', methods=['GET'])
@jwt_required()
def get_game_history():
    """Get user's game history"""
    try:
        user_id = int(get_jwt_identity())  # Convert string to int
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        per_page = min(per_page, 100)  # Max 100 per page

        # Query games
        games_query = Game.query.filter_by(user_id=user_id)\
            .order_by(Game.created_at.desc())

        games_paginated = games_query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'games': [game.to_dict() for game in games_paginated.items],
            'total': games_paginated.total,
            'page': page,
            'per_page': per_page,
            'pages': games_paginated.pages
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:game_id>', methods=['GET'])
@jwt_required()
def get_game_details(game_id):
    """Get detailed information about a specific game"""
    try:
        user_id = int(get_jwt_identity())  # Convert string to int
        game = Game.query.get(game_id)

        if not game:
            return jsonify({'error': 'Game not found'}), 404

        # Only allow user to view their own game details
        if game.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'game': game.to_dict(include_history=True)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    """Get user's game statistics"""
    try:
        user_id = int(get_jwt_identity())  # Convert string to int
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Calculate statistics
        total_games = Game.query.filter_by(user_id=user_id).count()
        total_wins = Game.query.filter_by(user_id=user_id, is_win=True).count()

        best_game = Game.query.filter_by(user_id=user_id)\
            .order_by(Game.score.desc())\
            .first()

        avg_score = db.session.query(db.func.avg(Game.score))\
            .filter_by(user_id=user_id)\
            .scalar() or 0

        stats = {
            'total_games': total_games,
            'total_wins': total_wins,
            'win_rate': (total_wins / total_games * 100) if total_games > 0 else 0,
            'best_score': best_game.score if best_game else 0,
            'best_tile': best_game.best_tile if best_game else 0,
            'average_score': round(avg_score, 2)
        }

        return jsonify({'stats': stats}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
