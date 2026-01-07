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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_user(user_data: UserCreate):
    db = get_db()
    if db:
        cursor = db.cursor()
        
        try:
            # Vérifier si l'utilisateur existe déjà
            cursor.execute("SELECT id FROM users WHERE email = %s", (user_data.email,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="User with this email already exists")
            
            # Hasher le mot de passe
            hashed_password = get_password_hash(user_data.password)
            
            # Insérer l'utilisateur avec toutes les données
            cursor.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, age, weight, height, sex)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_data.email, 
                hashed_password, 
                user_data.first_name, 
                user_data.last_name,
                user_data.age, 
                user_data.weight, 
                user_data.height, 
                user_data.sex
            ))
            
            db.commit()
            user_id = cursor.lastrowid
            
            # Récupérer l'utilisateur créé
            cursor.execute("""
                SELECT id, email, first_name, last_name, age, weight, height, sex 
                FROM users WHERE id = %s
            """, (user_id,))
            
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
                "sex": user_data_db[7] or 'male'
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
    else:
        raise HTTPException(status_code=500, detail="Database connection failed")

def login_user(user_data: UserLogin):
    db = get_db()
    if db:
        cursor = db.cursor(dictionary=True)
        
        try:
            cursor.execute("SELECT * FROM users WHERE email = %s", (user_data.email,))
            user = cursor.fetchone()
            cursor.close()
            db.close()
            
            if user and verify_password(user_data.password, user["password_hash"]):
                # Créer le token JWT
                access_token = create_access_token(data={"sub": user["email"], "user_id": user["id"]})
                
                # S'assurer que le sexe a une valeur par défaut
                sex = user["sex"] or 'male'
                
                return {
                    "access_token": access_token,
                    "token_type": "bearer",
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "first_name": user["first_name"],
                        "last_name": user["last_name"],
                        "age": user["age"],
                        "weight": user["weight"],
                        "height": user["height"],
                        "sex": sex
                    }
                }
            else:
                raise HTTPException(status_code=401, detail="Invalid email or password")
                
        except mysql.connector.Error as db_error:
            cursor.close()
            db.close()
            raise HTTPException(status_code=500, detail=f"Database error: {db_error}")
        except Exception as e:
            cursor.close()
            db.close()
            raise HTTPException(status_code=500, detail=f"Error during login: {str(e)}")
    else:
        raise HTTPException(status_code=500, detail="Database connection failed")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """Fonction pour vérifier la validité d'un token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            return None
        return {"email": email, "user_id": user_id}
    except JWTError:
        return None

async def get_current_user(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Récupérer l'utilisateur depuis la base de données
        db = get_db()
        if db:
            cursor = db.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, email, first_name, last_name, age, weight, height, sex 
                FROM users WHERE id = %s
            """, (user_id,))
            user = cursor.fetchone()
            cursor.close()
            db.close()
            
            if user is None:
                raise HTTPException(status_code=401, detail="User not found")
            
            # S'assurer que le sexe a une valeur par défaut
            if user["sex"] is None:
                user["sex"] = 'male'
            
            return User(**user)
        else:
            raise HTTPException(status_code=500, detail="Database connection failed")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user: {str(e)}")