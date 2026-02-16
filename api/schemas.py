from pydantic import BaseModel
from typing import Optional
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


class StudentCreate(StudentBase):
    pass


class StudentSchema(BaseModel):
    carnet: str
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
    carnet_pdf_url: Optional[str] = None

    registration_date: Optional[str] = None
    hash_carnet: Optional[str] = None

    is_graduated: bool
    is_active: bool

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

    class Config:
        from_attributes = True
