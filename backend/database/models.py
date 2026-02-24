from sqlalchemy import Column, Integer, String
from .database import Base

class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String, unique=True, index=True)
    pronunciation = Column(String)
    meaning = Column(String)
    difficulty = Column(Integer, default=1)