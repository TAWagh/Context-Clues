#load words from csv file

import csv
import os
import sys
from typing import Literal

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database.database import SessionLocal, engine
from database import models

from pydantic import BaseModel, Field

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from dotenv import load_dotenv
load_dotenv()


DICTIONARY_FILENAME = os.path.join(CURRENT_DIR, "Magoosh_1000_Words.csv")
MODEL_NAME = "gpt-5-mini"

models.Base.metadata.create_all(bind=engine)  # creates tables if they don't exist


class WordMeta(BaseModel):
    pronunciation: str = Field(
        description="Simple phonetic pronunciation in American English (not IPA)"
    )
    difficulty: Literal[1, 2, 3] = Field(
        description="1=easy, 2=medium, 3=hard"
    )


def load_dictionary():

    db = SessionLocal()

    llm = ChatOpenAI(model=MODEL_NAME).with_structured_output(WordMeta,include_raw=False)

    words_loaded = 0
    words_skipped = 0
    
    with open(DICTIONARY_FILENAME, newline="", encoding="utf-8-sig") as file:

        reader = csv.DictReader(file)

        for row in reader:

            word = (row.get("word") or "").strip()
            definition = (row.get("definition") or "").strip()

            if not word or not definition:
                continue

            # skip if already exists (case-insensitive)
            existing_word = db.query(models.Word).filter(
                models.Word.word.ilike(word)
            ).first()

            if existing_word:
                words_skipped += 1
                continue

            messages = [
                SystemMessage(
                    content="Return ONLY the structured fields requested. Be concise and accurate."
                ),
                HumanMessage(
                    content=(
                        "Generate pronunciation and difficulty for a vocabulary entry.\n"
                        "- pronunciation: simple phonetic American English (not IPA)\n"
                        "- difficulty: 1=easy, 2=medium, 3=hard \n\n"
                        f"word: {word}\n"
                        f"definition: {definition}"
                    )
                ),
            ]

            meta: WordMeta = llm.invoke(messages)

            new_word = models.Word(
                word=word,
                pronunciation=meta.pronunciation.strip(),
                meaning=definition,
                difficulty=int(meta.difficulty),
            )

            db.add(new_word)
            words_loaded += 1

            # Commit every 25 words
            if words_loaded % 25 == 0:
                db.commit()
                print(f"Progress: {words_loaded} words loaded...")

    # Final commit for remaining words
    db.commit()
    db.close()

    print("\nDictionary loading complete.")
    print(f"Loaded: {words_loaded} new words")
    print(f"Skipped: {words_skipped} existing words")


if __name__ == "__main__":
    load_dictionary()
