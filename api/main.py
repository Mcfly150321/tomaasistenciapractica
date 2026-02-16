from fastapi import FastAPI, Depends, HTTPException, APIRouter, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import date

from .database import SessionLocal, init_db
from . import schemas, models


app = FastAPI()
router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/students/", response_model=list[schemas.StudentSchema])
def read_students(
    status: str = Query("active", enum=["active", "inactive", "all"]),
    plan: str | None = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Students)

    if status == "active":
        query = query.filter(
            models.Students.is_active.is_(True),
            models.Students.is_graduated.is_(False)
        )
    elif status == "inactive":
        query = query.filter(
            or_(
                models.Students.is_active.is_(False),
                models.Students.is_graduated.is_(True)
            )
        )

    if plan:
        if plan not in {"diario", "fin_de_semana", "ejecutivo"}:
            raise HTTPException(status_code=400, detail="Plan inválido")
        query = query.filter(models.Students.plan == plan)

    return query.all()


@router.post("/assistance/{carnet}")
def take_assistance(
    carnet: str,
    date: date,
    assistance: bool = Query(True),
    db: Session = Depends(get_db)
):
    student = db.query(models.Students).filter(
        models.Students.carnet == carnet
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing = db.query(models.Assistance).filter(
        models.Assistance.student_id == carnet,
        models.Assistance.date == date
    ).first()

    if existing:
        existing.assistance = assistance
    else:
        db.add(models.Assistance(
            student_id=carnet,
            date=date,
            assistance=assistance
        ))

    db.commit()
    return {
        "status": "ok",
        "student_id": carnet,
        "date": date.isoformat(),
        "assistance": assistance
    }


app.include_router(router)
