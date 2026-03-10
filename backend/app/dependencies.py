"""
Dépendances partagées pour les routes FastAPI.
"""
from typing import Optional
from fastapi import Header, HTTPException

from app.auth import get_current_user
from app.models import User


async def get_current_user_from_header(authorization: Optional[str] = Header(None)) -> User:
    """Dépendance pour récupérer l'utilisateur depuis le header Authorization."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        return await get_current_user(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
