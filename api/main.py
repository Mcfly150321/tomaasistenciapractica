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


@router.post("/assistance/init")
def initialize_assistance(
    plan: str,
    date: date,
    db: Session = Depends(get_db)
):
    # Obtener todas las alumnas activas del plan
    students = db.query(models.Students).filter(
        models.Students.plan == plan,
        models.Students.is_active.is_(True),
        models.Students.is_graduated.is_(False)
    ).all()

    if not students:
        raise HTTPException(status_code=404, detail="No se encontraron alumnas para este plan")

    for student in students:
        # Buscar si ya existe el registro para esa fecha
        existing = db.query(models.Assistance).filter(
            models.Assistance.student_id == student.carnet,
            models.Assistance.date == date
        ).first()

        # Si NO existe, lo creamos como False.
        # Si YA existe, NO HACEMOS NADA (así no borramos los "Presente" ya marcados)
        if not existing:
            db.add(models.Assistance(
                student_id=student.carnet,
                date=date,
                assistance=False
            ))

    db.commit()
    return {"status": "ok", "message": f"Asistencia iniciada para {len(students)} alumnas"}


@router.post("/assistance/{identifier}")
def take_assistance(
    identifier: str,
    date: date,
    db: Session = Depends(get_db)
):
    # Buscar a la alumna por su hash_carnet
    student = db.query(models.Students).filter(
        models.Students.hash_carnet == identifier
    ).first()

    if not student:
        raise HTTPException(
            status_code=404, 
            detail="Código hash no reconocido o alumna no encontrada"
        )

    # Verificar que el registro de asistencia exista para esa alumna y fecha
    record = db.query(models.Assistance).filter(
        models.Assistance.student_id == student.carnet,
        models.Assistance.date == date
    ).first()

    if not record:
        raise HTTPException(
            status_code=400, 
            detail=f"La alumna {student.names} no pertenece al plan iniciado para este día"
        )

    record.assistance = True
    db.commit()
    
    return {
        "status": "ok",
        "student_id": student.carnet,
        "student_name": f"{student.names} {student.lastnames}",
        "date": date.isoformat(),
        "assistance": True
    }


app.include_router(router)
