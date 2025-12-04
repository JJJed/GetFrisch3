#!/usr/bin/env python3
"""
Backfill high scores for all users

This script updates the high_score field for all users based on their
game history in the database. Run this after applying the migration
to add the high_score column.

Usage:
    python backfill_high_scores.py
"""

from app import app, db
from models.user import User
from models.game import Game
from sqlalchemy import func

def backfill_high_scores():
    """Backfill high_score for all users from their game history"""
    with app.app_context():
        print("Starting high score backfill...")

        # Get all users
        users = User.query.all()
        total_users = len(users)
        updated_count = 0

        print(f"Found {total_users} users to process")

        for i, user in enumerate(users, 1):
            # Get user's highest score from games
            best_game = Game.query.filter_by(user_id=user.id)\
                .order_by(Game.score.desc())\
                .first()

            if best_game:
                old_score = user.high_score
                new_score = best_game.score

                if old_score != new_score:
                    user.high_score = new_score
                    updated_count += 1
                    print(f"[{i}/{total_users}] {user.username}: {old_score} -> {new_score}")
                else:
                    print(f"[{i}/{total_users}] {user.username}: {old_score} (unchanged)")
            else:
                print(f"[{i}/{total_users}] {user.username}: No games found, keeping high_score at {user.high_score}")

        # Commit all changes
        if updated_count > 0:
            db.session.commit()
            print(f"\nSuccessfully updated {updated_count} out of {total_users} users")
        else:
            print(f"\nNo updates needed - all users already have correct high scores")

if __name__ == '__main__':
    backfill_high_scores()
