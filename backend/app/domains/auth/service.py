import time
import random
import logging
import hashlib
import uuid
import secrets
import pyotp
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Any, Dict
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core import security
from app.config import settings
from app.database.repositories.user_repository import UserRepository
from app.domains.auth.models import User, RefreshToken
from app.domains.auth.schemas import UserRegister
from app.domains.quiz.leaderboard import QuizLeaderboard
from app.tasks.notification_tasks import send_email_task

logger = logging.getLogger(__name__)

# Resilient in-memory fallback caches
_LOCAL_OTP_CACHE: Dict[str, Tuple[str, float]] = {}  # key -> (otp_code, expires_at)
_LOCAL_RATELIMIT_CACHE: Dict[str, list[float]] = {}  # key -> list of timestamps


def set_cache_val(key: str, value: str, ttl_seconds: int) -> None:
    client = QuizLeaderboard._get_client()
    if client:
        try:
            client.setex(key, ttl_seconds, value)
            return
        except Exception:
            pass
    _LOCAL_OTP_CACHE[key] = (value, time.time() + ttl_seconds)


def get_cache_val(key: str) -> Optional[str]:
    client = QuizLeaderboard._get_client()
    if client:
        try:
            val = client.get(key)
            if val:
                return val.decode("utf-8") if isinstance(val, bytes) else val
        except Exception:
            pass
    if key in _LOCAL_OTP_CACHE:
        val, expires_at = _LOCAL_OTP_CACHE[key]
        if time.time() < expires_at:
            return val
        else:
            del _LOCAL_OTP_CACHE[key]
    return None


def delete_cache_val(key: str) -> None:
    client = QuizLeaderboard._get_client()
    if client:
        try:
            client.delete(key)
            return
        except Exception:
            pass
    if key in _LOCAL_OTP_CACHE:
        del _LOCAL_OTP_CACHE[key]


def check_rate_limit(key: str, max_requests: int = 3, window_seconds: int = 3600) -> bool:
    """Returns True if rate limit is exceeded, False otherwise."""
    client = QuizLeaderboard._get_client()
    if client:
        try:
            current = client.get(key)
            if current and int(current) >= max_requests:
                return True
            pipe = client.pipeline()
            pipe.incr(key)
            pipe.expire(key, window_seconds)
            pipe.execute()
            return False
        except Exception:
            pass
    now = time.time()
    if key not in _LOCAL_RATELIMIT_CACHE:
        _LOCAL_RATELIMIT_CACHE[key] = []
    _LOCAL_RATELIMIT_CACHE[key] = [t for t in _LOCAL_RATELIMIT_CACHE[key] if now - t < window_seconds]
    if len(_LOCAL_RATELIMIT_CACHE[key]) >= max_requests:
        return True
    _LOCAL_RATELIMIT_CACHE[key].append(now)
    return False


class AuthService:
    """Orchestrates authentication, signups, token rotation, password management, and TOTP-MFA."""

    @staticmethod
    async def register_user(db: AsyncSession, user_in: UserRegister) -> User:
        repo = UserRepository(db)
        existing_user = await repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists in the system.",
            )

        hashed_password = security.get_password_hash(user_in.password)
        new_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            is_active=True,
            is_verified=False,
            role="user"
        )
        created_user = await repo.create(new_user)
        await db.commit()
        await db.refresh(created_user)
        
        # Send verification email asynchronously
        await AuthService.send_verification_otp(created_user)
        return created_user

    @staticmethod
    async def send_verification_otp(user: User) -> None:
        """Generates a 6-digit OTP, caches it, and triggers a background email task."""
        otp = f"{random.randint(100000, 999999)}"
        cache_key = f"mocrai:otp:verify-email:{user.email}"
        set_cache_val(cache_key, otp, ttl_seconds=900)  # 15 min TTL
        
        # Trigger Celery task
        send_email_task.delay(user.id, f"Your email verification code is {otp}")
        logger.info(f"Verification OTP sent asynchronously to user: {user.email}")

    @staticmethod
    async def resend_verification_email(db: AsyncSession, email: str) -> None:
        repo = UserRepository(db)
        user = await repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        rate_key = f"mocrai:ratelimit:resend-verification:{email}"
        if check_rate_limit(rate_key, max_requests=3, window_seconds=3600):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Resend limit exceeded. Please try again after an hour."
            )
            
        await AuthService.send_verification_otp(user)

    @staticmethod
    async def verify_email_otp(db: AsyncSession, email: str, otp: str) -> bool:
        cache_key = f"mocrai:otp:verify-email:{email}"
        cached_otp = get_cache_val(cache_key)
        if not cached_otp or cached_otp != otp:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
            
        repo = UserRepository(db)
        user = await repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        user.is_verified = True
        delete_cache_val(cache_key)
        await db.flush()
        return True

    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
        repo = UserRepository(db)
        user = await repo.get_by_email(email)
        if not user or not security.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user

    @staticmethod
    async def create_tokens(
        db: AsyncSession, 
        user_id: str, 
        family_id: Optional[str] = None, 
        user_agent: Optional[str] = None, 
        ip_address: Optional[str] = None
    ) -> Tuple[str, str]:
        """Creates a short-lived access token and a refresh token, recording family ID for rotation."""
        access_token_expires = timedelta(minutes=30)
        access_token = security.create_access_token(user_id, expires_delta=access_token_expires)
        
        raw_refresh_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()
        
        if not family_id:
            family_id = str(uuid.uuid4())
            
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        db_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            family_id=family_id,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
            is_revoked=False
        )
        db.add(db_token)
        await db.flush()
        
        return access_token, raw_refresh_token

    @staticmethod
    async def rotate_refresh_token(
        db: AsyncSession, 
        raw_refresh_token: str, 
        user_agent: Optional[str] = None, 
        ip_address: Optional[str] = None
    ) -> Tuple[str, str]:
        """Rotates refresh token and triggers security revocation if token reuse is detected."""
        token_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()
        
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        res = await db.execute(stmt)
        db_token = res.scalar_one_or_none()
        
        if not db_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
            
        now = datetime.now(timezone.utc)
        expires_at = db_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        if expires_at < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
            
        # RTR Breach Detection: Token reuse
        if db_token.is_revoked:
            logger.warning(f"RTR Breach: Refresh token reuse detected for family {db_token.family_id}. Revoking family sessions.")
            stmt = select(RefreshToken).where(RefreshToken.family_id == db_token.family_id)
            family_res = await db.execute(stmt)
            for t in family_res.scalars().all():
                t.is_revoked = True
            await db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Security breach: session revoked.")
            
        db_token.is_revoked = True
        await db.flush()
        
        return await AuthService.create_tokens(
            db, 
            user_id=db_token.user_id, 
            family_id=db_token.family_id,
            user_agent=user_agent,
            ip_address=ip_address
        )

    @staticmethod
    async def forgot_password(db: AsyncSession, email: str) -> None:
        repo = UserRepository(db)
        user = await repo.get_by_email(email)
        if not user:
            # Fail silently to prevent account enumeration
            return
            
        otp = f"{random.randint(100000, 999999)}"
        cache_key = f"mocrai:otp:forgot-password:{email}"
        set_cache_val(cache_key, otp, ttl_seconds=900)  # 15 min TTL
        
        send_email_task.delay(user.id, f"Your password reset OTP is {otp}")
        logger.info(f"Password reset OTP sent to {email}")

    @staticmethod
    async def reset_password(db: AsyncSession, email: str, otp: str, new_password: str) -> None:
        cache_key = f"mocrai:otp:forgot-password:{email}"
        cached_otp = get_cache_val(cache_key)
        if not cached_otp or cached_otp != otp:
            raise HTTPException(status_code=400, detail="Invalid or expired password reset code.")
            
        repo = UserRepository(db)
        user = await repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        user.hashed_password = security.get_password_hash(new_password)
        delete_cache_val(cache_key)
        await db.flush()

    @staticmethod
    async def change_password(db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
        if not security.verify_password(current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect current password.")
            
        user.hashed_password = security.get_password_hash(new_password)
        await db.flush()

    @staticmethod
    async def enable_mfa(db: AsyncSession, user: User) -> Tuple[str, str]:
        """Generates a new TOTP secret, saving it to DB (mfa_enabled stays False until verified)."""
        secret = pyotp.random_base32()
        user.mfa_secret = secret
        await db.flush()
        
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name="MocrAI")
        return secret, provisioning_uri

    @staticmethod
    async def verify_mfa_token(db: AsyncSession, user: User, code: str) -> bool:
        if not user.mfa_secret:
            raise HTTPException(status_code=400, detail="MFA secret not generated.")
            
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(code, valid_window=3):
            raise HTTPException(status_code=400, detail="Invalid MFA verification code.")
            
        user.mfa_enabled = True
        await db.flush()
        return True

    @staticmethod
    async def logout(db: AsyncSession, raw_refresh_token: str) -> None:
        """Revokes refresh token in the database and caches it as blacklisted in Redis."""
        token_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        res = await db.execute(stmt)
        db_token = res.scalar_one_or_none()
        
        if db_token:
            db_token.is_revoked = True
            await db.flush()
            
            # Blacklist in Redis until expires
            expires_in_sec = int((db_token.expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds())
            if expires_in_sec > 0:
                blacklist_key = f"mocrai:blacklist:token:{token_hash}"
                set_cache_val(blacklist_key, "revoked", ttl_seconds=expires_in_sec)
