"""
Module d'authentification — JWT access + refresh tokens.

Stratégie de sécurité :
  • access_token  : courte durée (15 min), envoyé via header Authorization.
  • refresh_token : longue durée (7 jours), envoyé via cookie httpOnly.
  • Aucun token n'est stocké en base de données.
  • Aucun token n'est stocké côté client dans localStorage / AsyncStorage.
"""
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
import mysql.connector

from app.database import get_db
from app.models import User, UserCreate, UserLogin
import os
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", "your-refresh-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


# ──────────────────────────────────────────────────────────────
# Helpers mot de passe
# ──────────────────────────────────────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# ──────────────────────────────────────────────────────────────
# Création / vérification de tokens
# ──────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """Vérifie un access_token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            return None
        return {"email": email, "user_id": user_id}
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[dict]:
    """Vérifie un refresh_token (secret différent)."""
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            return None
        return {"email": email, "user_id": user_id}
    except JWTError:
        return None


# ──────────────────────────────────────────────────────────────
# Récupération utilisateur
# ──────────────────────────────────────────────────────────────
def get_user_by_id(user_id: int) -> Optional[dict]:
    """Récupère un utilisateur par son ID (sans mot de passe)."""
    db = get_db()
    if not db:
        return None
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, email, first_name, last_name, age, weight, height, sex,
                   COALESCE(activity_level, 'moderate') AS activity_level
            FROM users WHERE id = %s
            """,
            (user_id,),
        )
        user = cursor.fetchone()
        cursor.close()
        db.close()
        if user:
            if user["sex"] is None:
                user["sex"] = "male"
            return user
        return None
    except Exception:
        return None


async def get_current_user(token: str) -> User:
    """Décode un access_token et renvoie l'objet User correspondant."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")

        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return User(**user)

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user: {str(e)}")


# ──────────────────────────────────────────────────────────────
# Inscription
# ──────────────────────────────────────────────────────────────
def create_user(user_data: UserCreate) -> dict:
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = db.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (user_data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User with this email already exists")

        hashed_password = get_password_hash(user_data.password)

        cursor.execute(
            """
            INSERT INTO users (email, password_hash, first_name, last_name, age, weight, height, sex)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_data.email,
                hashed_password,
                user_data.first_name,
                user_data.last_name,
                user_data.age,
                user_data.weight,
                user_data.height,
                user_data.sex,
            ),
        )
        db.commit()
        user_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT id, email, first_name, last_name, age, weight, height, sex
            FROM users WHERE id = %s
            """,
            (user_id,),
        )
        user_data_db = cursor.fetchone()
        cursor.close()
        db.close()

        if not user_data_db:
            raise HTTPException(status_code=500, detail="Failed to create user")

        user_dict = {
            "id": user_data_db[0],
            "email": user_data_db[1],
            "first_name": user_data_db[2],
            "last_name": user_data_db[3],
            "age": user_data_db[4],
            "weight": user_data_db[5],
            "height": user_data_db[6],
            "sex": user_data_db[7] or "male",
        }

        return {"message": "User created successfully", "user": user_dict}

    except mysql.connector.Error as db_error:
        cursor.close()
        db.close()
        raise HTTPException(status_code=500, detail=f"Database error: {db_error}")
    except HTTPException:
        cursor.close()
        db.close()
        raise
    except Exception as e:
        cursor.close()
        db.close()
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")


# ──────────────────────────────────────────────────────────────
# Connexion
# ──────────────────────────────────────────────────────────────
def login_user(user_data: UserLogin) -> dict:
    """
    Authentifie l'utilisateur et retourne access_token + refresh_token.
    Le refresh_token sera extrait par la route pour être placé dans un cookie httpOnly.
    """
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (user_data.email,))
        user = cursor.fetchone()
        cursor.close()
        db.close()

        if not user or not verify_password(user_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        sex = user["sex"] or "male"
        token_data = {"sub": user["email"], "user_id": user["id"]}

        return {
            "access_token": create_access_token(data=token_data),
            "refresh_token": create_refresh_token(data=token_data),
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "age": user["age"],
                "weight": user["weight"],
                "height": user["height"],
                "sex": sex,
            },
        }

    except HTTPException:
        raise
    except mysql.connector.Error as db_error:
        raise HTTPException(status_code=500, detail=f"Database error: {db_error}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during login: {str(e)}")
