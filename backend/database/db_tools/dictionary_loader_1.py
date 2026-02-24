# Load hardcoded words

import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database.database import SessionLocal, engine
from database import models

# 1. Generate the empty database and tables
models.Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()
    
    # 2. Your dictionary, now upgraded with 'difficulty'
    words_to_add = [
    
        {"word":"Esoteric","pronunciation":"ee-SOT-er-ik","meaning":"intended to be understood by only a small number of people with a specialized knowledge","difficulty":"3"},
        {"word":"Lachrymose","pronunciation":"LAK-ruh-mose","meaning":"tearful","difficulty":"3"},
        {"word":"Turpitude","pronunciation":"TER-puh-tood","meaning":"moral corruption; wickedness","difficulty":"3"},
        {"word":"Vituperate","pronunciation":"vye-TOO-puh-rate","meaning":"blame or insult (someone) in strong or violent language.","difficulty":"3"},
        {"word":"Ebullient","pronunciation":"ih-BULL-yent","meaning":"enthusiastic and energetic","difficulty":"3"},
        {"word":"Mellifluous","pronunciation":"MEL-ih-flue-ous","meaning":"(of a voice or words) sweet or musical; pleasant to hear.","difficulty":"3"},
        {"word":"Pulchritude","pronunciation":"PUHL-krit-yood","meaning":"beauty.","difficulty":"3"},
        {"word":"Redoubtable","pronunciation":"rih-DOW-tuh-bul","meaning":"formidable.","difficulty":"3"},
        {"word":"Acquiesce","pronunciation":"ak-wee-ESS","meaning":"to accept reluctantly without protest.","difficulty":"3"},
        {"word":"Curmudgeon","pronunciation":"KUR-muh-gon","meaning":"a grouchy, surly person.","difficulty":"3"},
        {"word":"Pollyannaish","pronunciation":"","meaning":"extremely optimistic.","difficulty":"3"},
        {"word":"Contumacious","pronunciation":"kon-tuh-MAY-shus","meaning":"stubbornly disobedient.","difficulty":"3"},
        {"word":"Circumlocution","pronunciation":"sur-kum-loh-KYOO-shun","meaning":"using many words unnecessarily","difficulty":"3"},
        {"word":"Legerdemain","pronunciation":"lej-er-duh-MANE","meaning":"skillful deception","difficulty":"3"},
        {"word":"Pusillanimous","pronunciation":"pyoo-suh-LAN-uh-mus","meaning":"lacking courage","difficulty":"3"},
        {"word":"Vicissitude","pronunciation":"vih-SIS-uh-tood","meaning":"change in circumstances","difficulty":"3"},
        {"word":"Chicanery","pronunciation":"shi-KAY-nuh-ree","meaning":"deception through trickery","difficulty":"3"},
        {"word":"Mendacious","pronunciation":"men-DAY-shus","meaning":"lying","difficulty":"3"},
        {"word":"Obsequious","pronunciation":"ob-SEE-kwee-us","meaning":"excessively submissive","difficulty":"3"},
        {"word":"Phlegmatic","pronunciation":"fleg-MAT-ik","meaning":"emotionally calm","difficulty":"3"},
        {"word":"Ostentatious","pronunciation":"os-TEN-tuh-tee-us","meaning":"intended to attract notice and impress others","difficulty":"3"},

    ]

    # 3. Add them to the database safely
    for item in words_to_add:
        # Check if the word already exists so we don't get duplicates if you run this twice
        existing_word = db.query(models.Word).filter(models.Word.word == item["word"]).first()
        if not existing_word:
            new_word = models.Word(
                word=item["word"],
                pronunciation=item["pronunciation"],
                meaning=item["meaning"],
                difficulty=item["difficulty"]
            )
            db.add(new_word)
    
    db.commit()
    db.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed_database()
