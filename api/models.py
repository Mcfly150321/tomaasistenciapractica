from calendar import Day
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base
from sqlalchemy import Date


class Students(Base):
    __tablename__ = "students"

    carnet = Column(String, primary_key=True, index=True)
    names = Column(String)
    lastnames = Column(String)
    age = Column(Integer)
    cui = Column(String, unique=True, index=True)
    phone = Column(String)
    is_adult = Column(Boolean)
    plan = Column(String) # diario, fin_de_semana, ejecutivo
    guardian1_name = Column(String, nullable=True)
    guardian1_phone = Column(String, nullable=True)
    guardian2_name = Column(String, nullable=True)
    guardian2_phone = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True) # Nueva columna para miniaturas rápidas
    carnet_pdf_url = Column(String, nullable=True) # URL del PDF del carnet en Google Drive
    registration_date = Column(String, nullable=True) # YYYY-MM
    is_graduated = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True) # Para dar de baja sin borrar
    hash_carnet = Column(String, nullable=True, index=True)
    
    assistances = relationship(
        "Assistance",
        back_populates="student",
        cascade="all, delete-orphan"
    )

class Assistance(Base):
    __tablename__ = "assistance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.carnet"))
    date = Column(Date)
    assistance = Column(Boolean, default=False)

    student = relationship("Student", back_populates="assistances")

    __table_args__ = (
        UniqueConstraint('student_id', 'date', name='_assistance_student_date_uc'),
    )
