from flask import Blueprint, request, jsonify
from models import db
from models.game import Game
from models.user import User
from sqlalchemy import func
import os

bp = Blueprint('leaderboard', __name__)

@bp.route('/', methods=['GET'])
def get_leaderboard():
    """Get the global leaderboard - shows only best score per player"""
    try:
        # Get parameters
        limit = request.args.get('limit', 100, type=int)
        limit = min(limit, int(os.getenv('MAX_LEADERBOARD_SIZE', 100)))

        # Get best score and the most recent game ID for each user (deduplicate by player)
        # Using MAX(id) as tiebreaker when multiple games have the same best score
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

        leaderboard_data = []
        rank = 1
        for game in top_games:
            game_dict = game.to_dict()
            game_dict['rank'] = rank
            # Add school from user if available
            if game.player:
                game_dict['school'] = game.player.school
            leaderboard_data.append(game_dict)
            rank += 1

        return jsonify({
            'leaderboard': leaderboard_data,
            'total': len(leaderboard_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_rank(user_id):
    """Get a specific user's rank and best score"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get user's best game
        best_game = Game.query.filter_by(user_id=user_id, is_validated=True, is_flagged=False)\
            .order_by(Game.score.desc())\
            .first()

        if not best_game:
            return jsonify({
                'user': user.to_dict(),
                'rank': None,
                'best_score': 0,
                'message': 'No validated games yet'
            }), 200

        # Calculate rank (count how many PLAYERS have a higher best score)
        # Use subquery to get each player's best score, then count those higher than user's best
        higher_players = db.session.query(Game.user_id)\
            .filter(Game.is_validated == True, Game.is_flagged == False)\
            .group_by(Game.user_id)\
            .having(func.max(Game.score) > best_game.score)\
            .count()

        rank = higher_players + 1

        return jsonify({
            'user': user.to_dict(),
            'rank': rank,
            'best_score': best_game.score,
            'best_game': best_game.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/top-players', methods=['GET'])
def get_top_players():
    """Get top players by best score"""
    try:
        limit = request.args.get('limit', 10, type=int)
        limit = min(limit, 50)

        # Get best score for each user
        subquery = db.session.query(
            Game.user_id,
            func.max(Game.score).label('best_score')
        ).filter_by(is_validated=True, is_flagged=False)\
            .group_by(Game.user_id)\
            .subquery()

        # Join with users and games to get full info
        top_players = db.session.query(User, Game)\
            .join(subquery, User.id == subquery.c.user_id)\
            .join(Game, (Game.user_id == User.id) & (Game.score == subquery.c.best_score))\
            .filter(Game.is_validated == True, Game.is_flagged == False)\
            .order_by(subquery.c.best_score.desc())\
            .limit(limit)\
            .all()

        players_data = []
        rank = 1
        for user, game in top_players:
            players_data.append({
                'rank': rank,
                'user': user.to_dict(),
                'best_score': game.score,
                'best_tile': game.best_tile,
                'is_win': game.is_win,
                'game_date': game.created_at.isoformat() if game.created_at else None
            })
            rank += 1

        return jsonify({
            'top_players': players_data,
            'total': len(players_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/recent', methods=['GET'])
def get_recent_games():
    """Get recent validated games"""
    try:
        limit = request.args.get('limit', 20, type=int)
        limit = min(limit, 100)

        recent_games = Game.query.filter_by(is_validated=True, is_flagged=False)\
            .order_by(Game.created_at.desc())\
            .limit(limit)\
            .all()

        return jsonify({
            'recent_games': [game.to_dict() for game in recent_games],
            'total': len(recent_games)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
