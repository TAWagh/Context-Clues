import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database.database import SessionLocal, engine
from database import models
from sqlalchemy import func

db = SessionLocal()

total = db.query(func.count(models.Word.id)).scalar()

dist = (
    db.query(models.Word.difficulty, func.count(models.Word.id))
    .group_by(models.Word.difficulty)
    .all()
)

print(f"Total words: {total}")

for diff, count in dist:
    pct = count / total * 100
    print(f"Difficulty {diff}: {count} ({pct:.1f}%)")

db.close()