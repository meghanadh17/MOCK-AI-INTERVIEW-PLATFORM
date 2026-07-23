import logging
from typing import Optional, List, Tuple
import redis
from app.config import settings

logger = logging.getLogger(__name__)

# Fallback local memory leaderboard boards for offline testing
_LOCAL_BOARDS = {}


class QuizLeaderboard:
    """Manages global, weekly, and quiz-specific candidate leaderboard positions using Redis Sorted Sets."""
    
    @classmethod
    def _get_client(cls) -> Optional[redis.Redis]:
        if not settings.REDIS_URL:
            return None
        try:
            return redis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception:
            return None

    @classmethod
    def get_board_key(cls, board_name: str) -> str:
        """Determines Redis key name for a given board type."""
        if board_name == "global":
            return "quiz:leaderboard:global"
        elif board_name == "weekly":
            # Partition weekly leaderboard dynamically by ISO year and week number
            from datetime import datetime, timezone
            year, week_num, _ = datetime.now(timezone.utc).isocalendar()
            return f"quiz:leaderboard:weekly:{year}_w{week_num}"
        else:
            # Quiz-specific leaderboard
            return f"quiz:leaderboard:quiz:{board_name}"

    @classmethod
    def add_score(cls, board_name: str, user_id: str, score: float) -> None:
        """Appends or updates user score on a specific board."""
        key = cls.get_board_key(board_name)
        client = cls._get_client()
        if client:
            try:
                # Keep highest score in Redis
                existing = client.zscore(key, user_id)
                if existing is None or score > float(existing):
                    client.zadd(key, {user_id: score})
                return
            except Exception as e:
                logger.error(f"Redis zadd failed for key {key}: {e}")
        
        # Local fallback
        board = _LOCAL_BOARDS.setdefault(key, {})
        board[user_id] = max(board.get(user_id, 0.0), score)

    @classmethod
    def get_top_users(cls, board_name: str, limit: int = 20) -> List[Tuple[str, float]]:
        """Retrieves top ranks on a specific board."""
        key = cls.get_board_key(board_name)
        client = cls._get_client()
        if client:
            try:
                raw_data = client.zrevrange(key, 0, limit - 1, withscores=True)
                return [(uid, float(score)) for uid, score in raw_data]
            except Exception as e:
                logger.error(f"Redis zrevrange failed for key {key}: {e}")
                
        # Local fallback
        board = _LOCAL_BOARDS.get(key, {})
        sorted_items = sorted(board.items(), key=lambda x: x[1], reverse=True)
        return [(uid, float(score)) for uid, score in sorted_items[:limit]]

    @classmethod
    def get_user_rank_and_score(cls, board_name: str, user_id: str) -> Tuple[Optional[int], float]:
        """Retrieves user 1-based rank and current top score on a specific board."""
        key = cls.get_board_key(board_name)
        client = cls._get_client()
        if client:
            try:
                score = client.zscore(key, user_id)
                if score is not None:
                    rank = client.zrevrank(key, user_id)
                    return (rank + 1 if rank is not None else None, float(score))
                return (None, 0.0)
            except Exception as e:
                logger.error(f"Redis Z-rank query failed for key {key}: {e}")
                
        # Local fallback
        board = _LOCAL_BOARDS.get(key, {})
        if user_id in board:
            score = board[user_id]
            sorted_items = sorted(board.items(), key=lambda x: x[1], reverse=True)
            for idx, (uid, _) in enumerate(sorted_items):
                if uid == user_id:
                    return (idx + 1, score)
        return (None, 0.0)

    @classmethod
    def get_user_percentile(cls, board_name: str, user_id: str) -> float:
        """Computes rank percentile for a user on a specific board."""
        key = cls.get_board_key(board_name)
        client = cls._get_client()
        if client:
            try:
                total = client.zcard(key)
                if total <= 1:
                    return 100.0
                rank = client.zrevrank(key, user_id)
                if rank is None:
                    return 0.0
                return round(((total - rank) / total) * 100.0, 1)
            except Exception as e:
                logger.error(f"Redis Z-card query failed for key {key}: {e}")
                
        # Local fallback
        board = _LOCAL_BOARDS.get(key, {})
        total = len(board)
        if total <= 1:
            return 100.0
        sorted_items = sorted(board.items(), key=lambda x: x[1], reverse=True)
        rank = None
        for idx, (uid, _) in enumerate(sorted_items):
            if uid == user_id:
                rank = idx
                break
        if rank is None:
            return 0.0
        return round(((total - rank) / total) * 100.0, 1)
