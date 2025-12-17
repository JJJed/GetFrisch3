#!/usr/bin/env python3
"""
View Client Logs - Real-time debugging for high score submission issues
Usage: python view_client_logs.py [--level ERROR] [--user-id 123] [--limit 50] [--follow]
"""

import argparse
import time
from datetime import datetime
import json
import sys
import os

# Add parent directory to path so we can import from server
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.client_log import ClientLog
from models import db
from app import app

def format_log(log):
    """Format a log entry for display"""
    timestamp = log.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    level_colors = {
        'info': '\033[94m',     # Blue
        'warn': '\033[93m',     # Yellow
        'error': '\033[91m',    # Red
        'debug': '\033[90m'     # Gray
    }
    reset = '\033[0m'
    color = level_colors.get(log.level, '')

    data_str = ''
    if log.data:
        try:
            data_obj = json.loads(log.data)
            data_str = f"\n  Data: {json.dumps(data_obj, indent=4)}"
        except:
            data_str = f"\n  Data: {log.data}"

    user_info = f"User {log.user_id}" if log.user_id else "Anonymous"

    return f"{color}[{timestamp}] {log.level.upper()}{reset} - {user_info}\n  {log.message}{data_str}\n"

def view_logs(level=None, user_id=None, limit=50, follow=False):
    """View client logs with optional filtering"""
    with app.app_context():
        last_id = 0

        while True:
            query = ClientLog.query

            if follow:
                query = query.filter(ClientLog.id > last_id)

            if level:
                query = query.filter_by(level=level)

            if user_id:
                query = query.filter_by(user_id=user_id)

            logs = query.order_by(ClientLog.timestamp.asc() if follow else ClientLog.timestamp.desc()).limit(limit).all()

            if not follow and logs:
                # Reverse for most recent last
                logs = reversed(logs)

            for log in logs:
                print(format_log(log))
                if follow and log.id > last_id:
                    last_id = log.id

            if not follow:
                break

            # Wait before checking for new logs
            time.sleep(2)

def main():
    parser = argparse.ArgumentParser(description='View client-side logs for debugging')
    parser.add_argument('--level', choices=['info', 'warn', 'error', 'debug'], help='Filter by log level')
    parser.add_argument('--user-id', type=int, help='Filter by user ID')
    parser.add_argument('--limit', type=int, default=50, help='Number of logs to show (default: 50)')
    parser.add_argument('--follow', '-f', action='store_true', help='Follow logs in real-time (like tail -f)')
    parser.add_argument('--score-issues', action='store_true', help='Show only score submission related logs')

    args = parser.parse_args()

    if args.score_issues:
        print("Showing only score submission related logs...\n")
        # This would require custom filtering - for now just show errors and warnings
        args.level = 'error'

    if args.follow:
        print("Following logs in real-time (Ctrl+C to stop)...\n")

    try:
        view_logs(
            level=args.level,
            user_id=args.user_id,
            limit=args.limit,
            follow=args.follow
        )
    except KeyboardInterrupt:
        print("\nStopped following logs.")

if __name__ == '__main__':
    main()