from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.user import User
from models.game import Game
from utils.game_validator import GameValidator
import os
import logging
import traceback

# Set up logging for game submissions
logger = logging.getLogger(__name__)
try:
    log_dir = '/var/www/getfrisch3/logs'
    os.makedirs(log_dir, exist_ok=True)

    # Configure file handler
    file_handler = logging.FileHandler(os.path.join(log_dir, 'game_submission.log'))
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)
    logger.setLevel(logging.DEBUG)
except Exception as e:
    # If logging setup fails, just use basic console logging
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logger.warning(f'Could not set up file logging: {e}. Using console logging instead.')

bp = Blueprint('game', __name__)

@bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_game():
    """Submit a completed game for validation and leaderboard"""
    try:
        user_id = int(get_jwt_identity())  # Convert string to int
        user = User.query.get(user_id)

        if not user:
            logger.warning(f'User not found: {user_id}')
            return jsonify({'error': 'User not found'}), 404

        if user.is_banned:
            logger.warning(f'Banned user attempted submission: {user.username}')
            return jsonify({'error': 'Account is banned'}), 403

        data = request.get_json()
        logger.info(f'=== GAME SUBMISSION START === User: {user.username} (ID: {user_id})')

        # Extract game data
        score = data.get('score', 0)
        best_tile = data.get('best_tile', 0)
        moves_count = data.get('moves_count', 0)
        game_duration = data.get('game_duration', 0)
        move_history = data.get('move_history', [])
        final_board = data.get('final_board', [])
        is_win = data.get('is_win', False)

        logger.info(f'Score: {score}, Best Tile: {best_tile}, Moves: {moves_count}, Duration: {game_duration}s, Move History Length: {len(move_history)}')

        # Basic validation
        if score < 0 or best_tile < 0 or moves_count < 0 or game_duration < 0:
            logger.error(f'Invalid data: negative values')
            return jsonify({'error': 'Invalid game data: negative values'}), 400

        if not move_history:
            logger.error(f'Invalid data: no move history')
            return jsonify({'error': 'Move history required for validation'}), 400

        # Validate game using server-side validator
        validator = GameValidator()
        validation_enabled = os.getenv('MOVE_VALIDATION_ENABLED', 'true').lower() == 'true'

        is_validated = True
        flag_reason = None

        if validation_enabled:
            try:
                logger.info(f'Starting validation...')
                validation_result = validator.validate_game(move_history, score, final_board)
                logger.info(f'Validation result: {validation_result}')

                if not validation_result['valid']:
                    is_validated = False
                    flag_reason = validation_result.get('reason', 'Validation failed')
                    logger.warning(f'Game flagged: {flag_reason}')
            except Exception as validation_error:
                logger.error(f'Validation exception: {type(validation_error).__name__}: {str(validation_error)}')
                logger.error(traceback.format_exc())
                is_validated = False
                flag_reason = f'Validation error: {str(validation_error)}'

        # Create game record
        logger.info(f'Creating game record (validated={is_validated}, flagged={not is_validated})')
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

        logger.info(f'Setting move history and final board...')
        game.set_move_history(move_history)
        game.set_final_board(final_board)

        logger.info(f'Adding game to session...')
        db.session.add(game)

        # Update user's high score if this game beats it AND is validated
        if score > user.high_score and is_validated:
            logger.info(f'Updating user high score: {user.high_score} -> {score} (validated)')
            user.high_score = score
        elif score > user.high_score and not is_validated:
            logger.warning(f'High score NOT updated: {score} is unvalidated (reason: {flag_reason})')

        logger.info(f'Committing to database...')
        db.session.commit()
        logger.info(f'SUCCESS! Game ID {game.id} saved. Validated: {is_validated}')

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

        logger.info(f'=== GAME SUBMISSION COMPLETE ===')
        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f'FATAL ERROR in submit_game: {type(e).__name__}: {str(e)}')
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'type': type(e).__name__}), 500

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

        # Get best tile from best game
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
            'best_score': user.high_score,  # Use high_score from user model
            'best_tile': best_game.best_tile if best_game else 0,
            'average_score': round(avg_score, 2)
        }

        return jsonify({'stats': stats}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/submit-test', methods=['POST'])
@jwt_required()
def submit_test_game():
    """Test endpoint to submit games with custom scores (for debugging high score issues)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.is_banned:
            return jsonify({'error': 'Account is banned'}), 403

        data = request.get_json()

        # Extract game data with defaults for testing
        score = data.get('score', 20000)  # Default to 20k for testing
        best_tile = data.get('best_tile', 2048)
        moves_count = data.get('moves_count', score // 100)  # Estimate moves based on score
        game_duration = data.get('game_duration', 300)

        # Generate minimal synthetic move history for testing
        # This creates a small, valid move history regardless of score
        move_history = data.get('move_history', [
            {'direction': 'right', 'score': 0},
            {'direction': 'down', 'score': 4},
            {'direction': 'left', 'score': 8},
            {'direction': 'up', 'score': 12}
        ])

        # Generate minimal final board for testing
        final_board = data.get('final_board', [
            [2, 4, 8, 16],
            [32, 64, 128, 256],
            [512, 1024, 2048, 0],
            [0, 0, 0, 0]
        ])

        is_win = data.get('is_win', True)

        # For testing, we skip validation
        is_validated = True
        flag_reason = None

        # Create game record
        game = Game(
            user_id=user_id,
            score=score,
            best_tile=best_tile,
            moves_count=moves_count,
            game_duration=game_duration,
            is_win=is_win,
            is_validated=is_validated,
            is_flagged=False,
            flag_reason=flag_reason
        )

        game.set_move_history(move_history)
        game.set_final_board(final_board)

        db.session.add(game)

        # Update user's high score if this game beats it AND is validated
        if score > user.high_score and is_validated:
            user.high_score = score

        db.session.commit()

        # Emit leaderboard update via WebSocket
        from app import socketio
        socketio.emit('leaderboard_changed', {'game_id': game.id})

        return jsonify({
            'message': 'Test game submitted successfully',
            'game': game.to_dict(),
            'note': 'This is a test submission for debugging purposes'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
