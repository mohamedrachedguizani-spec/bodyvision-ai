"""
Routes d'authentification : register, login, refresh, logout.
"""
from fastapi import APIRouter, Request, Response, HTTPException

from app.auth import (
    create_user,
    login_user,
    create_refresh_token,
    verify_refresh_token,
    create_access_token,
    get_user_by_id,
)
from app.models import UserCreate, UserLogin

router = APIRouter(tags=["Authentication"])

REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 jours


def _set_refresh_cookie(response: Response, refresh_token: str):
    """Place le refresh token dans un cookie httpOnly sécurisé."""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,   # Mettre True en production (HTTPS)
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/",
    )


@router.post("/register")
async def register(user_data: UserCreate):
    """Création d'un nouveau compte utilisateur."""
    return create_user(user_data)


@router.post("/login")
async def login(user_data: UserLogin, response: Response):
    """
    Connexion utilisateur.
    - Retourne l'access_token dans le body (stocké en mémoire côté client).
    - Place le refresh_token dans un cookie httpOnly.
    """
    result = login_user(user_data)

    # Extraire le refresh_token pour le placer dans le cookie
    refresh_token = result.pop("refresh_token")
    _set_refresh_cookie(response, refresh_token)

    return result


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    """
    Renouvelle l'access_token à partir du refresh_token (cookie httpOnly).
    Effectue une rotation du refresh_token pour plus de sécurité.
    """
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    payload = verify_refresh_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Vérifier que l'utilisateur existe toujours
    user = get_user_by_id(payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Émettre de nouveaux tokens (rotation)
    token_data = {"sub": payload["email"], "user_id": payload["user_id"]}
    new_access = create_access_token(data=token_data)
    new_refresh = create_refresh_token(data=token_data)

    _set_refresh_cookie(response, new_refresh)

    return {
        "access_token": new_access,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/logout")
async def logout(response: Response):
    """Déconnexion : supprime le cookie refresh_token."""
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}
