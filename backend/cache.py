import os
import json
import time
import hashlib
from typing import Any, Optional

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache")

class DiskCache:
    """A lightweight, thread-safe disk cache that stores JSON data with TTL expiration."""
    def __init__(self, cache_dir: str = CACHE_DIR, default_ttl: int = 86400):
        self.cache_dir = cache_dir
        self.default_ttl = default_ttl
        try:
            os.makedirs(self.cache_dir, exist_ok=True)
        except Exception as e:
            print(f"[Cache] Failed to create cache directory {self.cache_dir}: {e}")

    def _get_hash_key(self, key: str) -> str:
        return hashlib.sha256(key.encode("utf-8")).hexdigest() + ".json"

    def get(self, key: str) -> Optional[Any]:
        filename = self._get_hash_key(key)
        filepath = os.path.join(self.cache_dir, filename)

        if not os.path.exists(filepath):
            return None

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                cached_item = json.load(f)
            
            # Check expiration
            expires_at = cached_item.get("expires_at", 0)
            if time.time() > expires_at:
                # Cache expired, remove it asynchronously or lazily
                try:
                    os.remove(filepath)
                except OSError:
                    pass
                return None
            
            return cached_item.get("data")
        except Exception as e:
            print(f"[Cache] Error reading cache file {filepath}: {e}")
            return None

    def set(self, key: str, data: Any, ttl: Optional[int] = None) -> bool:
        if ttl is None:
            ttl = self.default_ttl

        filename = self._get_hash_key(key)
        filepath = os.path.join(self.cache_dir, filename)
        
        cached_item = {
            "expires_at": time.time() + ttl,
            "data": data
        }

        try:
            # Temporary file write and rename for atomicity
            temp_filepath = filepath + ".tmp"
            with open(temp_filepath, "w", encoding="utf-8") as f:
                json.dump(cached_item, f, ensure_ascii=False)
            os.replace(temp_filepath, filepath)
            return True
        except Exception as e:
            print(f"[Cache] Error writing cache file {filepath}: {e}")
            try:
                if os.path.exists(temp_filepath):
                    os.remove(temp_filepath)
            except OSError:
                pass
            return False

# Global cache instance
cache = DiskCache()
