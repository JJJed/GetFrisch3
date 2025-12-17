from flask import Blueprint, request, jsonify
from models import db
from models.client_log import ClientLog
from datetime import datetime
import json

logs_bp = Blueprint('logs', __name__, url_prefix='/api/logs')

@logs_bp.route('/client', methods=['POST'])
def log_client_event():
    """
    Receive and store client-side logs for debugging
    Useful for capturing errors from devices where console access is restricted
    """
    try:
        data = request.get_json()

        # Extract log data
        level = data.get('level', 'info')
        message = data.get('message', '')
        log_data = data.get('data', {})
        timestamp = data.get('timestamp')
        user_agent = data.get('userAgent', '')
        url = data.get('url', '')

        # Get user ID if authenticated
        user_id = None
        if hasattr(request, 'current_user'):
            user_id = request.current_user.id

        # Create log entry
        client_log = ClientLog(
            user_id=user_id,
            level=level,
            message=message,
            data=json.dumps(log_data) if log_data else None,
            user_agent=user_agent,
            url=url,
            timestamp=datetime.fromisoformat(timestamp.replace('Z', '+00:00')) if timestamp else datetime.utcnow()
        )

        db.session.add(client_log)
        db.session.commit()

        # Also log to server console for immediate visibility
        print(f"[CLIENT {level.upper()}] {message} | User: {user_id} | Data: {log_data}")

        return jsonify({'success': True}), 200

    except Exception as e:
        print(f"Error storing client log: {str(e)}")
        # Don't fail the request even if logging fails
        return jsonify({'success': False, 'error': str(e)}), 200


@logs_bp.route('/client/recent', methods=['GET'])
def get_recent_client_logs():
    """
    Get recent client logs for debugging
    Requires authentication
    """
    try:
        # Get query parameters
        limit = request.args.get('limit', 100, type=int)
        level = request.args.get('level', None)
        user_id = request.args.get('user_id', None, type=int)

        # Build query
        query = ClientLog.query

        if level:
            query = query.filter_by(level=level)

        if user_id:
            query = query.filter_by(user_id=user_id)

        # Get recent logs
        logs = query.order_by(ClientLog.timestamp.desc()).limit(limit).all()

        return jsonify({
            'logs': [{
                'id': log.id,
                'user_id': log.user_id,
                'level': log.level,
                'message': log.message,
                'data': json.loads(log.data) if log.data else None,
                'user_agent': log.user_agent,
                'url': log.url,
                'timestamp': log.timestamp.isoformat()
            } for log in logs]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
