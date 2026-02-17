import os
from sqlalchemy import create_url
from sqlalchemy.orm import Session
from api.database import SessionLocal
from api import models

def check_students():
    db = SessionLocal()
    try:
        students = db.query(models.Students).filter(models.Students.plan == "ejecutivo").all()
        print(f"--- Students in 'ejecutivo' plan ({len(students)}) ---")
        for s in students:
            print(f"Name: {s.names} {s.lastnames}")
            print(f"  Carnet: {s.carnet}")
            print(f"  Hash: {s.hash_carnet}")
            print(f"  Thumb: {s.thumbnail_url}")
            print("-" * 20)
    finally:
        db.close()

if __name__ == "__main__":
    check_students()
