from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class StudentBase(BaseModel):
    names: str
    lastnames: str
    age: int
    cui: str
    phone: str
    is_adult: bool
    plan: str
    guardian1_name: Optional[str] = None
    guardian1_phone: Optional[str] = None
    guardian2_name: Optional[str] = None
    guardian2_phone: Optional[str] = None
    photo_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: bool = True

class StudentCreate(StudentBase):
    pass

class StudentSchema(StudentBase):
    carnet: str
    registration_date: Optional[str] = None
    hash_carnet: Optional[str] = None

    class Config:
        from_attributes = True

class AssistanceBase(BaseModel):
    student_id: str
    date: date
    assistance: bool

class AssistanceCreate(AssistanceBase):
    pass

class AssistanceSchema(AssistanceBase):
    id: int
    student_id: str
    date: str
    assistance: bool

    class Config:
        from_attributes = True

class SearchRequest(BaseModel):
    query: str
    folder_type: str