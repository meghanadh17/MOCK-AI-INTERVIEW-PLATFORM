import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup_user(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": "user@example.com", "password": "password123", "full_name": "Test User"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["full_name"] == "Test User"
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_signup_duplicate_email(client: AsyncClient) -> None:
    # First signup
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "dup@example.com", "password": "password123"},
    )
    # Duplicate signup
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": "dup@example.com", "password": "anotherpassword"},
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_user(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "login@example.com", "password": "correctpassword"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "login@example.com", "password": "correctpassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_incorrect_password(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "wrongpass@example.com", "password": "correctpassword"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "wrongpass@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 400
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "me@example.com", "password": "password123", "full_name": "Me User"},
    )
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": "me@example.com", "password": "password123"},
    )
    token = login_response.json()["access_token"]
    
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["full_name"] == "Me User"


@pytest.mark.asyncio
async def test_register_and_verify_email(client: AsyncClient) -> None:
    # 1. Register
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={"email": "verify@example.com", "password": "password123", "full_name": "Verify User"},
    )
    assert reg_response.status_code == 201
    
    # 2. Get OTP from local cache helper
    from app.domains.auth.service import get_cache_val
    cache_key = "mocrai:otp:verify-email:verify@example.com"
    otp = get_cache_val(cache_key)
    assert otp is not None
    
    # 3. Verify email
    ver_response = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": "verify@example.com", "otp": otp}
    )
    assert ver_response.status_code == 200
    assert "verified successfully" in ver_response.json()["detail"]


@pytest.mark.asyncio
async def test_forgot_and_reset_password_flow(client: AsyncClient) -> None:
    # 1. Register
    await client.post(
        "/api/v1/auth/register",
        json={"email": "reset@example.com", "password": "password123"},
    )
    
    # 2. Trigger forgot password
    forgot_resp = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset@example.com"}
    )
    assert forgot_resp.status_code == 200
    
    # 3. Retrieve OTP from cache
    from app.domains.auth.service import get_cache_val
    otp = get_cache_val("mocrai:otp:forgot-password:reset@example.com")
    assert otp is not None
    
    # 4. Reset password
    reset_resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"email": "reset@example.com", "otp": otp, "new_password": "newpassword123"}
    )
    assert reset_resp.status_code == 200
    
    # 5. Login with new password
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "newpassword123"}
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


@pytest.mark.asyncio
async def test_mfa_flow(client: AsyncClient) -> None:
    # 1. Register and Login
    await client.post(
        "/api/v1/auth/register",
        json={"email": "mfa@example.com", "password": "password123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "mfa@example.com", "password": "password123"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Enable MFA
    enable_resp = await client.post("/api/v1/auth/mfa/enable", headers=headers)
    assert enable_resp.status_code == 200
    secret = enable_resp.json()["secret"]
    assert secret is not None
    
    # 3. Generate correct TOTP token and verify it
    import pyotp
    totp = pyotp.TOTP(secret)
    code = totp.now()
    
    verify_resp = await client.post(
        "/api/v1/auth/mfa/verify",
        headers=headers,
        json={"code": code}
    )
    assert verify_resp.status_code == 200
    assert "MFA enabled successfully" in verify_resp.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_revocation(client: AsyncClient) -> None:
    # 1. Register and Login
    await client.post(
        "/api/v1/auth/register",
        json={"email": "rtr@example.com", "password": "password123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "rtr@example.com", "password": "password123"}
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    refresh_token = data["refresh_token"]
    
    # 2. Rotate refresh token once
    rot_resp = await client.post(
        "/api/v1/auth/refresh",
        headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert rot_resp.status_code == 200
    new_data = rot_resp.json()
    new_refresh_token = new_data["refresh_token"]
    assert new_refresh_token != refresh_token
    
    # 3. Attempt to rotate using the OLD revoked refresh token (RTR breach simulation!)
    bad_resp = await client.post(
        "/api/v1/auth/refresh",
        headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert bad_resp.status_code == 401
    assert "breach" in bad_resp.json()["detail"].lower()
