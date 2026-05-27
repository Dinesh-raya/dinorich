import time
from collections import deque
from typing import Deque, Dict


class SocketRateLimiter:
    def __init__(self, max_calls: int = 25, per_seconds: int = 5, cleanup_interval: int = 100) -> None:
        self.max_calls = max_calls
        self.per_seconds = per_seconds
        self._events: Dict[str, Deque[float]] = {}
        self._cleanup_interval = cleanup_interval
        self._call_count = 0

    def allow(self, key: str) -> bool:
        now = time.time()
        queue = self._events.setdefault(key, deque())
        while queue and now - queue[0] > self.per_seconds:
            queue.popleft()
        if len(queue) >= self.max_calls:
            return False
        queue.append(now)

        # Periodic cleanup of stale keys
        self._call_count += 1
        if self._call_count >= self._cleanup_interval:
            self._cleanup_stale_entries(now)
            self._call_count = 0
        return True

    def _cleanup_stale_entries(self, now: float) -> None:
        """Remove keys with no recent events."""
        stale_keys = [
            key for key, queue in self._events.items()
            if not queue or now - queue[-1] > self.per_seconds * 2
        ]
        for key in stale_keys:
            del self._events[key]


rate_limiter = SocketRateLimiter()
# Dedicated connection rate limiter: max 10 connections per 60 seconds per IP
connection_rate_limiter = SocketRateLimiter(max_calls=10, per_seconds=60)
