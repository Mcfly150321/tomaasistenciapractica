from fastapi import FastAPI, Depends, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_
import datetime

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

# Initialize Database
init_db()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/students/", response_model=list[schemas.StudentSchema])
def read_students(
    status: str = Query("active", enum=["active", "inactive", "all"]),
    plan: str | None = Query(
        None,
        description="Filtrar por plan: diario, fin_de_semana, ejecutivo"
    ),
    db: Session = Depends(get_db)
):
    query = db.query(models.Student)

    # 🔹 Filtro por estado
    if status == "active":
        query = query.filter(
            models.Student.is_active.is_(True),
            models.Student.is_graduated.is_(False)
        )
    elif status == "inactive":
        query = query.filter(
            or_(
                models.Student.is_active.is_(False),
                models.Student.is_graduated.is_(True)
            )
        )
    # status == "all" → no filtra

    # 🔹 Filtro por plan
    if plan:
        query = query.filter(models.Student.plan == plan)

    return query.all()

@router.post("/assistance/{carnet}")
def take_assistance(
    carnet: str,
    date: date,
    assistance: bool = True,
    db: Session = Depends(get_db)
):
    student = db.query(models.Student).filter(
        models.Student.carnet == carnet
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
        db.add(
            models.Assistance(
                student_id=carnet,
                date=date,
                assistance=assistance
            )
        )

    db.commit()
    return {
        "status": "ok",
        "student_id": carnet,
        "date": date.isoformat(),
        "assistance": assistance
    }


app.include_router(router)
