from pydantic import BaseModel,  EmailStr, validator
from typing import Optional, Dict, Any
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    age: Optional[int] = None
    weight: Optional[float] = None  # en kg
    height: Optional[float] = None  # en cm
    sex: str  # 'male' ou 'female'

    @validator('sex')
    def validate_sex(cls, v):
        # Supprimez la condition 'if v' car v est maintenant obligatoire
        if v not in ['male', 'female']:
            raise ValueError('Sex must be "male" or "female"')
        return v

    # Ajoutez des validateurs pour les champs optionnels
    @validator('age')
    def validate_age(cls, v):
        if v is not None and (v < 1 or v > 120):
            raise ValueError('Age must be between 1 and 120')
        return v

    @validator('weight')
    def validate_weight(cls, v):
        if v is not None and (v < 1 or v > 300):
            raise ValueError('Weight must be between 1 and 300 kg')
        return v

    @validator('height')
    def validate_height(cls, v):
        if v is not None and (v < 50 or v > 250):
            raise ValueError('Height must be between 50 and 250 cm')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    age: Optional[int]
    weight: Optional[float]
    height: Optional[float]
    sex : str

class AnalysisResult(BaseModel):
    id: int
    user_id: int
    image_path: str
    analysis_data: Dict[str, Any]
    created_at: datetime

class BodyMeasurements(BaseModel):
    weight: float  # kg
    height: float  # cm
    bmi: float
    body_fat_percentage: Optional[float] = None