from typing import Any, Tuple, Optional, Dict
import os
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select
from app.storage.local_storage import LocalStorageClient

from app.database.base import get_db
from app.dependencies import get_current_user
from app.domains.auth.models import User
from app.domains.auth.schemas import (
    UserRegister, UserOut, Token, TokenResponse, UserProfileUpdate,
    VerifyEmailRequest, ResendVerificationRequest, ForgotPasswordRequest,
    ResetPasswordRequest, ChangePasswordRequest, MfaVerifyRequest, MfaEnableResponse
)
from app.domains.auth.service import AuthService
from app.database.repositories.user_repository import UserRepository

router = APIRouter()


class OAuth2PasswordRequestFormFlexible:
    """Flexible form/JSON reader supporting both OAuth2 form data and JSON login requests."""
    @classmethod
    async def get_credentials(cls, request: Request) -> Tuple[str, str]:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body = await request.json()
                username = body.get("email") or body.get("username")
                password = body.get("password")
                if username and password:
                    return str(username), str(password)
            except Exception:
                pass
                
        try:
            form = await request.form()
            username = form.get("username") or form.get("email")
            password = form.get("password")
            if username and password:
                return str(username), str(password)
        except Exception:
            pass
            
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)) -> Any:
    """Register a new candidate and send email verification code."""
    return await AuthService.register_user(db, user_in)


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserRegister, db: AsyncSession = Depends(get_db)) -> Any:
    """Backward-compatible register alias to satisfy existing integration test suites."""
    return await AuthService.register_user(db, user_in)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Login with credentials. Returns short-lived Bearer JWT and sets HttpOnly rotation token cookie."""
    username, password = await OAuth2PasswordRequestFormFlexible.get_credentials(request)
    user = await AuthService.authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
        
    from app.config import settings
    if settings.EMAIL_VERIFICATION_REQUIRED and not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email address is not verified. Please verify your email first.",
        )
        
    access_token, refresh_token = await AuthService.create_tokens(
        db, 
        user_id=user.id,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7 * 24 * 3600,
        path="/api/v1/auth/refresh"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user_id": user.id
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Rotate access and refresh tokens using RTR reuse detection security policy."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        # Check header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            refresh_token = auth_header.replace("Bearer ", "")
        else:
            try:
                body = await request.json()
                refresh_token = body.get("refresh_token")
            except Exception:
                pass
                
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token is missing"
        )
        
    access_token, new_refresh_token = await AuthService.rotate_refresh_token(
        db,
        raw_refresh_token=refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7 * 24 * 3600,
        path="/api/v1/auth/refresh"
    )
    
    from app.core import security
    payload = security.decode_access_token(access_token)
    user_id = payload.get("sub")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token,
        "user_id": user_id
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Logout current user session, revoking current refresh token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        try:
            body = await request.json()
            refresh_token = body.get("refresh_token")
        except Exception:
            pass
            
    if refresh_token:
        await AuthService.logout(db, refresh_token)
        
    response.delete_cookie(key="refresh_token", path="/api/v1/auth/refresh")
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=UserOut)
async def read_user_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve profile and calculate usage stats dynamically from the SQL database."""
    from app.domains.resume.models import Resume
    from app.domains.interview.models import Interview
    from app.domains.quiz.models import QuizAttempt
    from datetime import date, timedelta
    
    # 1. Base counts
    resume_count = await db.scalar(select(func.count()).select_from(Resume).where(Resume.user_id == current_user.id)) or 0
    interview_count = await db.scalar(select(func.count()).select_from(Interview).where(Interview.user_id == current_user.id, Interview.status == "completed")) or 0
    quiz_count = await db.scalar(select(func.count()).select_from(QuizAttempt).where(QuizAttempt.user_id == current_user.id)) or 0
    
    # 2. Score metrics (normalize interview score to 0-100 scale by multiplying by 10)
    interview_scores_res = await db.execute(
        select(Interview.total_score).where(
            Interview.user_id == current_user.id,
            Interview.status == "completed",
            Interview.total_score != None
        )
    )
    interview_scores = [r[0] * 10.0 for r in interview_scores_res.all()]
    
    quiz_scores_res = await db.execute(
        select(QuizAttempt.score).where(
            QuizAttempt.user_id == current_user.id,
            QuizAttempt.score != None
        )
    )
    quiz_scores = [r[0] for r in quiz_scores_res.all()]
    
    all_scores = interview_scores + quiz_scores
    avg_score = 0.0
    highest_score = 0.0
    if all_scores:
        avg_score = round(sum(all_scores) / len(all_scores), 1)
        highest_score = round(max(all_scores), 1)

    # 3. Dynamic streak calculation based on user activity timestamps
    resume_dates_res = await db.execute(select(func.date(Resume.created_at)).where(Resume.user_id == current_user.id))
    resume_dates = [r[0] for r in resume_dates_res.all() if r[0] is not None]
    
    interview_dates_res = await db.execute(select(func.date(Interview.created_at)).where(Interview.user_id == current_user.id))
    interview_dates = [r[0] for r in interview_dates_res.all() if r[0] is not None]
    
    quiz_dates_res = await db.execute(select(func.date(QuizAttempt.started_at)).where(QuizAttempt.user_id == current_user.id))
    quiz_dates = [r[0] for r in quiz_dates_res.all() if r[0] is not None]
    
    all_dates = set()
    for d in resume_dates + interview_dates + quiz_dates:
        if isinstance(d, str):
            try:
                from datetime import datetime
                d = datetime.strptime(d[:10], "%Y-%m-%d").date()
            except Exception:
                continue
        all_dates.add(d)
        
    streak = 0
    if all_dates:
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        current_date = None
        if today in all_dates:
            current_date = today
        elif yesterday in all_dates:
            current_date = yesterday
            
        if current_date:
            streak = 1
            check_date = current_date - timedelta(days=1)
            while check_date in all_dates:
                streak += 1
                check_date -= timedelta(days=1)
                
    current_user.stats = {
        "resumes_uploaded": resume_count,
        "interviews_taken": interview_count,
        "quizzes_taken": quiz_count,
        "avg_score": avg_score,
        "highest_score": highest_score,
        "active_streak": streak
    }
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_profile(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update current user profile info, preferences, and avatar URL."""
    repo = UserRepository(db)
    content_type = request.headers.get("content-type", "")
    
    update_data = {}
    if "multipart/form-data" in content_type:
        form = await request.form()
        # Handle file upload for avatar
        avatar_file = form.get("avatar")
        if avatar_file and hasattr(avatar_file, "filename"):
            # read file
            file_data = await avatar_file.read()
            # save file
            file_path = LocalStorageClient.save_file(
                file_data=file_data,
                file_name=f"{current_user.id}_{avatar_file.filename}",
                sub_dir="avatars"
            )
            # set avatar_url relative path
            filename = os.path.basename(file_path)
            update_data["avatar_url"] = f"/uploads/avatars/{filename}"
        
        # Handle other text fields in form data if any
        full_name = form.get("full_name")
        if full_name is not None:
            update_data["full_name"] = str(full_name)
            
        preferences_str = form.get("preferences")
        if preferences_str is not None:
            import json
            try:
                update_data["preferences"] = json.loads(str(preferences_str))
            except Exception:
                pass
    else:
        # standard JSON request
        try:
            body = await request.json()
            profile_in = UserProfileUpdate(**body)
            update_data = profile_in.model_dump(exclude_unset=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")

    return await repo.update(current_user, update_data)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Response:
    """Delete current user account."""
    repo = UserRepository(db)
    await repo.remove(current_user.id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """Verify email address via 6-digit OTP code."""
    await AuthService.verify_email_otp(db, payload.email, payload.otp)
    return {"detail": "Email verified successfully."}


@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """Resend email verification OTP code (rate-limited)."""
    await AuthService.resend_verification_email(db, payload.email)
    return {"detail": "Verification email resent successfully."}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """Generate and trigger a password reset email link asynchronously."""
    await AuthService.forgot_password(db, payload.email)
    return {"detail": "If the email exists, a password reset OTP has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """Reset candidate password using the reset OTP code."""
    await AuthService.reset_password(db, payload.email, payload.otp, payload.new_password)
    return {"detail": "Password has been reset successfully."}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update candidate password with verification validation."""
    await AuthService.change_password(db, current_user, payload.current_password, payload.new_password)
    return {"detail": "Password changed successfully."}


@router.post("/mfa/enable", response_model=MfaEnableResponse)
async def enable_mfa(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Enable TOTP-based Multi-Factor Authentication, returning a secret key and URI."""
    secret, provisioning_uri = await AuthService.enable_mfa(db, current_user)
    return {"secret": secret, "provisioning_uri": provisioning_uri}


@router.post("/mfa/verify")
async def verify_mfa(
    payload: MfaVerifyRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Verify MFA token and active TOTP enforcement on candidate account."""
    await AuthService.verify_mfa_token(db, current_user, payload.code)
    return {"detail": "MFA enabled successfully."}
