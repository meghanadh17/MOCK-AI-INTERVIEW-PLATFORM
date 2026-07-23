import os
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class LocalStorageClient:
    """Fallback local disk storage engine for development."""
    
    @staticmethod
    def save_file(file_data: bytes, file_name: str, sub_dir: str = "") -> str:
        dest_dir = os.path.join(settings.LOCAL_STORAGE_DIR, sub_dir)
        os.makedirs(dest_dir, exist_ok=True)
        
        file_path = os.path.join(dest_dir, file_name)
        with open(file_path, "wb") as f:
            f.write(file_data)
            
        logger.info(f"Saved file locally to: {file_path}")
        return file_path

    @staticmethod
    def load_file(file_path: str) -> Optional[bytes]:
        if not os.path.exists(file_path):
            return None
        with open(file_path, "rb") as f:
            return f.read()
