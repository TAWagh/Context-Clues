import os
import random

# SQLite Imports
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
try:
    from database import engine, get_db
    import database.models as models
except ModuleNotFoundError:
    from backend.database import engine, get_db
    import backend.database.models as models

# FastAPI Imports
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

# LangChain Imports
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from dotenv import load_dotenv
load_dotenv()

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Allow React to communicate with this backend locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GAME CONFIGURATION DATA ---

THEMES = {
  "General": "General, everyday interactions (friends, family, home, casual talk)",
  "Workplace": "Workplace (boss, coworkers, meetings, projects)",
  "School/College": "School/College (students, professors, classes, exams, campus life)",
  "Pop Culture": "Pop culture (popular movies, TV Shows, music, celebrities)"
}

TIME_OPTIONS = {
    "Untimed": None,
    "1 Minute": 60,
    "3 Minutes": 180,
    "5 Minutes": 300
}

DIFFICULTY_LEVELS = {
    "Elementary": 1,
    "Intermediate": 2,
    "Advanced": 3
}

# --- PROMPTS ---

SENTENCE_GENERATOR_SYSTEM_PROMPT = """
You are a creative sentence generator for a vocabulary game that helps users learn new words through context clues.
CURRENT TURN: {current_turn}/5 

OBJECTIVE
Generate ONE natural sentence using the target word '{word}'.
The sentence MUST fit within the context of the following theme - {theme}
Start with OBSCURE clues for turn 1 & 2, and GRADUALLY use simpler clues as CURRENT TURN number increases.

ADAPTIVE LOGIC:
Read the Nuance Gap from the history to understand the user's misconceptions.
Write a sentence that bridges the specific conceptual gap identified.

CONSTRAINTS:
- The word '{word}' MUST be in the sentence.
- Do NOT explicitly define the word in the sentence.
- DO NOT repeat sentence structures, character names, or introductory clauses used in previous turns.
- Keep under the sentence 20 words.
"""
EVALUATOR_SYSTEM_PROMPT = """
TARGET WORD: {word}
OFFICIAL DEFINITION: {definition}
USER'S GUESS: "{user_guess}"

OBJECTIVE:
Evaluate if the user's guess demonstrates a practical, working comprehension of the official definition. 

RULES:
1. Break down the definition into its Core Concept (the basic idea of the word) and Distinguishing Nuance (what makes this word unique from simple synonyms) if there is one.
2. Compare the USER'S GUESS to these parts.
    - If the guess captures the core concept AND implies the unique nuance using casual language, slang, or functional synonyms, mark is_correct = TRUE.
    - If the guess completely misses the core meaning OR fails to capture the unique nuance, mark is_correct = FALSE.
3. Do NOT demand exact dictionary phrasing or academic vocabulary. Reward conceptual grasp.

TASK:
Return a JSON object using the exact formatting instructions below.
{format_instructions}
"""

# --- PYDANTIC MODELS ---
class WordRequest(BaseModel):
    used_words: List[str]
    difficulty: Optional[int] = None

class ClueRequest(BaseModel):
    word: str
    turn: int
    theme: str
    history: List[Dict[str, str]]

class GeneratedClue(BaseModel):
    clue: str = Field(description="The single generated sentence. No quotation marks, labels, or introductory text.")

class EvalRequest(BaseModel):
    word: str
    definition: str
    guess: str

class EvaluatorOutput(BaseModel):
    core_concept: str = Field(description="The basic idea of the word extracted from the definition.")
    distinguishing_nuance: str = Field(description="The unique aspect extracted from the definition.")
    
    is_correct: bool = Field(description="True ONLY if the user grasped both the core concept and the unique nuance.")
    nuance_gap: str = Field(description="If WRONG, Identify the misconception or missed nuance and provide a conceptual directive for the next clue on what gap to bridge. " \
    "DO NOT repeat the definition; dictate a new angle that contrasts the error with the true meaning. " \
    "If RIGHT, leave empty.")

# --- LLM SETUP ---
generator_llm = ChatOpenAI(
    model_name="gpt-4o",
    temperature=0.7
)

evaluator_llm = ChatOpenAI(
    model_name="gpt-5.2",
    model_kwargs={
        "reasoning_effort": "low",
        "verbosity": "low",
        "response_format": {"type": "json_object"}
    }
)

# --- ENDPOINTS ---
@app.get("/api/config")
async def get_game_config():
    """
    PURPOSE: Delivers the master lists of settings to the React frontend.
    """
    return {
        "themes": THEMES,
        "time_options": TIME_OPTIONS,
        "difficulty_levels": DIFFICULTY_LEVELS
    }

@app.post("/api/get-word")
async def get_random_word(data: WordRequest, db: Session = Depends(get_db)):
    query = db.query(models.Word)
    
    # 1. Tell SQL to ignore the words React sent us
    if data.used_words:
        query = query.filter(~models.Word.word.in_(data.used_words))
    
    # 1b. If a difficulty filter was provided, constrain the query
    if data.difficulty is not None:
        query = query.filter(models.Word.difficulty == data.difficulty)
        
    # 2. Tell SQL to shuffle the remaining rows and hand us exactly ONE
    chosen_word = query.order_by(func.random()).first()
    
    # 3. Check if we ran out of words
    if not chosen_word:
        return {"status": "exhausted", "word_data": None}
        
    word_dict = {
        "word": chosen_word.word,
        "pronunciation": chosen_word.pronunciation,
        "meaning": chosen_word.meaning,
        "difficulty": chosen_word.difficulty
    }
    
    return {"status": "success", "word_data": word_dict}


@app.post("/generate-clue")
async def generate_clue(data: ClueRequest):
    """
    PURPOSE: Generates a contextual sentence for a specific word based on turn theme and nuance gaps from previous turns.
    
    INPUT (ClueRequest):
        - word (str): The target vocabulary word.
        - turn (int): Current turn number (1-5) to determine difficulty.
        - theme (str): The creative context (e.g., 'Cyberpunk', 'Nature').
        - history (list): Previous turns to help the AI identify "nuance gaps".
        
    OUTPUT (JSON):
        - clue (str): A natural sentence containing the word with difficulty-adjusted context.
    """
    # Map React history format to LangChain message objects
    chain_history = []
    for msg in data.history:
        if msg["role"] == "user":
            chain_history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "system":
            chain_history.append(SystemMessage(content=msg["content"]))
        else:
            chain_history.append(AIMessage(content=msg["content"]))

    prompt = ChatPromptTemplate.from_messages([
        ("system", SENTENCE_GENERATOR_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="history"), 
        ("human", "Generate the clue for the current turn.")
    ])
    # Bind the Pydantic model directly to the LLM
    structured_llm = generator_llm.with_structured_output(GeneratedClue)
    
    chain = prompt | structured_llm
    
    # The result is now an instance of your Pydantic model!
    result = chain.invoke({
        "word": data.word, 
        "history": chain_history,
        "current_turn": str(data.turn),
        "theme": data.theme
    })
    
    return {"clue": result.clue}

@app.post("/evaluate")
async def evaluate_guess(data: EvalRequest):
    """
    PURPOSE: Acts as the game judge to check if the user's definition is accurate.
    
    INPUT (EvalRequest):
        - word (str): The target word.
        - definition (str): The official dictionary definition.
        - guess (str): The user's answer.
        
    OUTPUT (JSON):
        - is_correct (bool): True if the user's answer is correct.
        - nuance_gap (str): Feedback explaining what part of the meaning the user missed.
    """
    parser = JsonOutputParser(pydantic_object=EvaluatorOutput)
    prompt = ChatPromptTemplate.from_template(
        template=EVALUATOR_SYSTEM_PROMPT,
        partial_variables={"format_instructions": parser.get_format_instructions()} 
    )
    
    # Use evaluator_llm here
    chain = prompt | evaluator_llm | parser
    result = chain.invoke({
        "word": data.word,
        "definition": data.definition,
        "user_guess": data.guess
    })
    
    return result