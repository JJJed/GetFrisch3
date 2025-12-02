import random
import json

class GameValidator:
    """
    Server-side game validation engine that replays a game from move history
    to verify the final score and detect cheating.
    """

    def __init__(self, size=4):
        self.size = size
        self.grid = [[None for _ in range(size)] for _ in range(size)]
        self.score = 0

    def validate_game(self, move_history, expected_score, expected_board, seed=None):
        """
        Replay a game from move history and validate the result.

        Args:
            move_history: List of moves with format: [{'direction': 0-3, 'tile': {'x': 0, 'y': 0, 'value': 2}}]
            expected_score: The score claimed by the client
            expected_board: The final board state claimed by the client
            seed: Optional random seed for tile spawning (for testing)

        Returns:
            dict with validation result and details
        """
        try:
            # Initialize empty grid
            self.grid = [[None for _ in range(self.size)] for _ in range(self.size)]
            self.score = 0

            if seed is not None:
                random.seed(seed)

            # Process each move
            for i, move_data in enumerate(move_history):
                if not isinstance(move_data, dict):
                    return {
                        'valid': False,
                        'reason': f'Invalid move format at index {i}',
                        'actual_score': self.score
                    }

                # Add tile if specified (initial tiles or spawned tiles)
                if 'tile' in move_data and move_data['tile']:
                    tile = move_data['tile']
                    if not self._add_tile(tile['x'], tile['y'], tile['value']):
                        return {
                            'valid': False,
                            'reason': f'Cannot add tile at move {i}: position ({tile["x"]}, {tile["y"]}) occupied',
                            'actual_score': self.score
                        }

                # Execute move if specified
                if 'direction' in move_data and move_data['direction'] is not None:
                    direction = move_data['direction']
                    if direction not in [0, 1, 2, 3]:
                        return {
                            'valid': False,
                            'reason': f'Invalid direction {direction} at move {i}',
                            'actual_score': self.score
                        }

                    moved = self._move(direction)
                    if not moved and i > 0:  # First move might not move anything
                        # This could be a suspicious move (trying to spawn without moving)
                        pass

            # Validate final score
            score_difference = abs(self.score - expected_score)
            tolerance = max(100, expected_score * 0.01)  # 1% tolerance or 100 points

            if score_difference > tolerance:
                return {
                    'valid': False,
                    'reason': f'Score mismatch: expected {expected_score}, got {self.score}',
                    'actual_score': self.score,
                    'expected_score': expected_score
                }

            # Additional validation checks
            validation_result = self._additional_checks(move_history, expected_score)
            if not validation_result['valid']:
                return validation_result

            return {
                'valid': True,
                'actual_score': self.score,
                'expected_score': expected_score,
                'final_board': self._board_to_dict()
            }

        except Exception as e:
            return {
                'valid': False,
                'reason': f'Validation error: {str(e)}',
                'actual_score': self.score
            }

    def _add_tile(self, x, y, value):
        """Add a tile to the grid"""
        if x < 0 or x >= self.size or y < 0 or y >= self.size:
            return False
        if self.grid[y][x] is not None:
            return False
        self.grid[y][x] = value
        return True

    def _move(self, direction):
        """
        Execute a move in the specified direction.
        0 = up, 1 = right, 2 = down, 3 = left
        Returns True if any tiles moved.
        """
        moved = False

        # Build traversal order
        if direction == 0:  # up
            for x in range(self.size):
                moved = self._move_column(x, -1) or moved
        elif direction == 1:  # right
            for y in range(self.size):
                moved = self._move_row(y, 1) or moved
        elif direction == 2:  # down
            for x in range(self.size):
                moved = self._move_column(x, 1) or moved
        elif direction == 3:  # left
            for y in range(self.size):
                moved = self._move_row(y, -1) or moved

        return moved

    def _move_row(self, y, delta):
        """Move a row left (delta=-1) or right (delta=1)"""
        moved = False
        merged = [False] * self.size

        if delta == -1:  # left
            for x in range(1, self.size):
                if self.grid[y][x] is not None:
                    moved = self._slide_tile(x, y, -1, 0, merged) or moved
        else:  # right
            for x in range(self.size - 2, -1, -1):
                if self.grid[y][x] is not None:
                    moved = self._slide_tile(x, y, 1, 0, merged) or moved

        return moved

    def _move_column(self, x, delta):
        """Move a column up (delta=-1) or down (delta=1)"""
        moved = False
        merged = [False] * self.size

        if delta == -1:  # up
            for y in range(1, self.size):
                if self.grid[y][x] is not None:
                    moved = self._slide_tile(x, y, 0, -1, merged) or moved
        else:  # down
            for y in range(self.size - 2, -1, -1):
                if self.grid[y][x] is not None:
                    moved = self._slide_tile(x, y, 0, 1, merged) or moved

        return moved

    def _slide_tile(self, x, y, dx, dy, merged):
        """Slide a single tile as far as possible in the given direction"""
        if self.grid[y][x] is None:
            return False

        value = self.grid[y][x]
        moved = False
        new_x, new_y = x, y

        # Find farthest position
        while True:
            next_x = new_x + dx
            next_y = new_y + dy

            # Check bounds
            if next_x < 0 or next_x >= self.size or next_y < 0 or next_y >= self.size:
                break

            # Check if position is occupied
            if self.grid[next_y][next_x] is not None:
                # Check if we can merge
                if self.grid[next_y][next_x] == value and not merged[next_y if dy else next_x]:
                    # Merge tiles
                    self.grid[y][x] = None
                    self.grid[next_y][next_x] = value * 2
                    self.score += value * 2
                    merged[next_y if dy else next_x] = True
                    return True
                break

            new_x = next_x
            new_y = next_y

        # Move tile if position changed
        if new_x != x or new_y != y:
            self.grid[y][x] = None
            self.grid[new_y][new_x] = value
            moved = True

        return moved

    def _board_to_dict(self):
        """Convert board to dictionary format"""
        board = []
        for y in range(self.size):
            for x in range(self.size):
                if self.grid[y][x] is not None:
                    board.append({
                        'x': x,
                        'y': y,
                        'value': self.grid[y][x]
                    })
        return board

    def _additional_checks(self, move_history, score):
        """Perform additional validation checks"""
        # Check for suspicious patterns
        if len(move_history) < 10 and score > 1000:
            return {
                'valid': False,
                'reason': 'Suspicious: High score with very few moves',
                'actual_score': self.score
            }

        # Check for reasonable score-to-moves ratio
        if len(move_history) > 0:
            avg_score_per_move = score / len(move_history)
            if avg_score_per_move > 500:  # Suspiciously high
                return {
                    'valid': False,
                    'reason': 'Suspicious: Unrealistic score-to-moves ratio',
                    'actual_score': self.score
                }

        # Check for duplicate consecutive moves (potential bot behavior)
        consecutive_same = 0
        last_direction = None
        for move in move_history:
            if 'direction' in move:
                if move['direction'] == last_direction:
                    consecutive_same += 1
                    if consecutive_same > 50:  # More than 50 consecutive same moves
                        return {
                            'valid': False,
                            'reason': 'Suspicious: Too many consecutive identical moves',
                            'actual_score': self.score
                        }
                else:
                    consecutive_same = 0
                    last_direction = move['direction']

        return {'valid': True}
