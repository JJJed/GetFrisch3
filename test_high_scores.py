#!/usr/bin/env python3
"""
Test script for submitting high scores to debug verification issues.
Usage: python test_high_scores.py [score]
"""

import requests
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('config/.env')

# Configuration
BASE_URL = os.getenv('SERVER_URL', 'http://localhost:5000')
API_URL = f'{BASE_URL}/api'

def login(username, password):
    """Login and get JWT token"""
    response = requests.post(
        f'{API_URL}/auth/login',
        json={'username': username, 'password': password}
    )

    if response.status_code == 200:
        return response.json()['access_token']
    else:
        print(f"Login failed: {response.json()}")
        return None

def submit_test_game(token, score=20000):
    """Submit a test game with custom score"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    # Test game data
    game_data = {
        'score': score,
        'best_tile': 2048 if score < 50000 else 4096,
        'moves_count': score // 100,  # Rough estimate
        'game_duration': 300,
        'is_win': True
    }

    print(f"\nSubmitting test game with score: {score}")
    print(f"Estimated moves: {game_data['moves_count']}")

    response = requests.post(
        f'{API_URL}/game/submit-test',
        json=game_data,
        headers=headers
    )

    if response.status_code == 201:
        result = response.json()
        print(f"\n✓ Success! Game submitted successfully")
        print(f"  Game ID: {result['game']['id']}")
        print(f"  Score: {result['game']['score']}")
        print(f"  Validated: {result['game']['is_validated']}")
        print(f"  Flagged: {result['game']['is_flagged']}")
        return True
    else:
        print(f"\n✗ Failed to submit game:")
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

def main():
    """Main test function"""
    print("=== High Score Testing Tool ===\n")

    # Get credentials
    username = input("Enter username: ")
    password = input("Enter password: ")

    # Login
    print("\nLogging in...")
    token = login(username, password)

    if not token:
        print("Failed to login. Exiting.")
        return

    print("✓ Login successful")

    # Get score to test
    if len(sys.argv) > 1:
        try:
            score = int(sys.argv[1])
        except ValueError:
            print(f"Invalid score: {sys.argv[1]}")
            return
    else:
        score_input = input("\nEnter score to test (default: 20000): ").strip()
        score = int(score_input) if score_input else 20000

    # Submit test game
    submit_test_game(token, score)

    print("\n" + "="*40)
    print("Test complete! Check the leaderboard at:")
    print(f"{BASE_URL}")
    print("="*40)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user.")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()
