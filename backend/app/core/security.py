import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
import bcrypt
from jose import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

logger = logging.getLogger(__name__)

# Initialize rate-limiter
limiter = Limiter(key_func=get_remote_address)

# Cached RS256 PEM keys
_private_key_pem: Optional[str] = None
_public_key_pem: Optional[str] = None


def _get_asymmetric_keys() -> tuple[str, str]:
    """Retrieves or generates RSA private/public key PEM strings for RS256 token signing."""
    global _private_key_pem, _public_key_pem
    if not _private_key_pem or not _public_key_pem:
        env_priv = os.getenv("JWT_PRIVATE_KEY")
        env_pub = os.getenv("JWT_PUBLIC_KEY")
        
        if env_priv and env_pub:
            _private_key_pem = env_priv.replace("\\n", "\n")
            _public_key_pem = env_pub.replace("\\n", "\n")
            logger.info("Security: Loaded asymmetric RSA keys from environment configuration.")
        else:
            # Check for locally cached keys first using absolute path
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            keys_dir = os.path.join(base_dir, "uploads", ".keys")
            priv_path = os.path.join(keys_dir, "jwt_private.pem")
            pub_path = os.path.join(keys_dir, "jwt_public.pub")
            
            if os.path.exists(priv_path) and os.path.exists(pub_path):
                try:
                    with open(priv_path, "r", encoding="utf-8") as f:
                        _private_key_pem = f.read()
                    with open(pub_path, "r", encoding="utf-8") as f:
                        _public_key_pem = f.read()
                    logger.info("Security: Loaded cached asymmetric RSA keys from local files.")
                except Exception as e:
                    logger.error(f"Security: Failed to read cached RSA keys: {e}")
            
            if not _private_key_pem or not _public_key_pem:
                logger.warning("Security: Asymmetric RSA keys not configured/cached at " + str(priv_path) + ". Generating new keypair.")
                private_key = rsa.generate_private_key(
                    public_exponent=65537,
                    key_size=2048
                )
                _private_key_pem = private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ).decode('utf-8')
                _public_key_pem = private_key.public_key().public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ).decode('utf-8')
                
                # Cache them locally
                try:
                    os.makedirs(keys_dir, exist_ok=True)
                    with open(priv_path, "w", encoding="utf-8") as f:
                        f.write(_private_key_pem)
                    with open(pub_path, "w", encoding="utf-8") as f:
                        f.write(_public_key_pem)
                    logger.info("Security: Cached new RSA keys in local files.")
                except Exception as e:
                    logger.error(f"Security: Failed to cache RSA keys locally: {e}")
            
    return _private_key_pem, _public_key_pem


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), 
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    
    # Asymmetric sign using private key (RS256)
    priv_key, _ = _get_asymmetric_keys()
    encoded_jwt = jwt.encode(to_encode, priv_key, algorithm="RS256")
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decodes and validates a JWT token using the public key and RS256 algorithm."""
    _, pub_key = _get_asymmetric_keys()
    # jose jwt.decode supports both string and byte key formats
    return jwt.decode(token, pub_key, algorithms=["RS256"])

