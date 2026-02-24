import os
import random
import textwrap
from typing import List, Dict, Any, Optional

# Third-party imports
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from pydantic import BaseModel, Field

# --- 1. CONFIGURATION & SETUP ---
load_dotenv()

# Check for API Key validity before crashing later
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("Error: OPENAI_API_KEY not found in environment variables.")

# --- 2. GAME DATA --
WORD_LIST = [
    { "word": "bombastic", "pronunciation": "BOM-bas-tik", "meaning": "characterized by inflated or pretentious language or style." }
]

THEMES = {
  "1": "Everyday life (friends, family, home, casual talk)",
  "2": "Workplace (boss, coworkers, meetings, projects)",
  "3": "School/College. (students, professors, lectures, exams, campus life)",
  "4": "Pop culture (popular movies, TV Shows, music, celebrities)"
}

# --- 3. PROMPTS ---
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

# --- 4. PYDANTIC MODELS ---
class EvaluatorOutput(BaseModel):
    #Evaluator's returns its internal breakdown
    core_concept: str = Field(description="The basic idea of the word extracted from the definition.")
    distinguishing_nuance: str = Field(description="The unique aspect extracted from the definition.")
    
    is_correct: bool = Field(description="True ONLY if the user grasped both the core concept and the unique nuance.")
    nuance_gap: str = Field(description="If WRONG, Identify the misconception or missed nuance and provide a conceptual directive for the next clue on what gap to bridge. " \
    "DO NOT repeat the definition; dictate a new angle that contrasts the error with the true meaning. " \
    "If RIGHT, leave empty.")

# --- 5. CHAIN FACTORIES (THE BRAINS) ---

def get_evaluator_chain(llm):
    parser = JsonOutputParser(pydantic_object=EvaluatorOutput)
    
    prompt = ChatPromptTemplate.from_template(
        template=EVALUATOR_SYSTEM_PROMPT,
        partial_variables={"format_instructions": parser.get_format_instructions()} 
    )

    return prompt | llm | parser


def get_generator_chain(llm):
    messages_stack = [
        ("system", SENTENCE_GENERATOR_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="history"), 
        ("human", "Generate the clue for the current turn.")
    ]

    prompt = ChatPromptTemplate.from_messages(messages_stack)
    output_parser = StrOutputParser()
    
    return prompt | llm | output_parser


# --- 6. GAME STATE MANAGEMENT ---

class GameState:
    def __init__(self):
        self.score = 0
        self.used_words = [] 

    def get_next_word(self) -> Optional[Dict]:
        available_words = [w for w in WORD_LIST if w["word"] not in self.used_words]
        
        if not available_words:
            return None 
            
        word_obj = random.choice(available_words)
        self.used_words.append(word_obj["word"])
        return word_obj
    
    def has_more_words(self) -> bool:
        return len(self.used_words) < len(WORD_LIST)

# --- 7. THE GAME ENGINE ---

class GameSession:
    def __init__(self):
    # Generator Model (creative, higher temperature)
        self.generator_llm = ChatOpenAI(
            model_name="gpt-4o",
            temperature=0.75
        )

        # Evaluator Model (analytical, lower temperature)
        self.evaluator_llm = ChatOpenAI(
            model_name="gpt-5.2",
            temperature=0.2
        )

        self.generator = get_generator_chain(self.generator_llm)
        self.evaluator = get_evaluator_chain(self.evaluator_llm)

        self.state = GameState()
        self.current_theme = THEMES["1"]

    def start(self):
        self._print_header()
        self._select_theme()

        while True:
            word_obj = self.state.get_next_word()
            if not word_obj:
                self._print_game_over()
                break

            self.play_round(word_obj)
            
            print(f"\n📊 Current Total Score: {self.state.score}")
            
            if not self.state.has_more_words():
                self._print_game_over()
                break

            if input("\nPlay next word? (y/n): ").lower() != 'y':                
                print(f"👋 Thanks for playing! Final Score: {self.state.score}")
                break

    def play_round(self, word_obj: Dict):
        target_word = word_obj['word']
        definition = word_obj['meaning']
        
        print(f"\n🔹 TARGET WORD: {target_word.upper()}")
        print(f"   (Pronunciation: {word_obj.get('pronunciation', 'N/A')})")
        
        history: List[BaseMessage] = [] 
        max_turns = 5

        for turn in range(1, max_turns + 1):
            print(f"\n--- Clue {turn}/{max_turns} ---")
            
            clue_sentence = self.generator.invoke({
                "word": target_word, 
                "history": history,
                "current_turn": str(turn),
                "theme": self.current_theme
            })
            
            history.append(AIMessage(content=clue_sentence))
            print(f"📖 \"{clue_sentence}\"")
            
            user_guess = input("   > Guess the Meaning: ").strip() or "idk"
            history.append(HumanMessage(content=f"User guessed: '{user_guess}'"))

            evaluation = self.evaluator.invoke({
                "word": target_word,
                "definition": definition,
                "user_guess": user_guess
            })
            
            # --- NEW: Debug prints for the internal LLM reasoning ---
            print(f"   [⚙️ Debug Core Concept]: {evaluation['core_concept']}")
            print(f"   [⚙️ Debug Distinguishing Nuance]: {evaluation['distinguishing_nuance']}")
            # --------------------------------------------------------

            if evaluation['is_correct']:
                points = 6 - turn
                self.state.score += points
                print(f"\n✅ CORRECT! 🌟 +{points} Points")
                return # Round ends
            else:
                print(f"❌ Incorrect.")
                history.append(SystemMessage(content=f"Nuance Gap: {evaluation['nuance_gap']}"))
                print(f"   [⚙️ Debug Nuance Gap]: {evaluation['nuance_gap']}")

        print(f"\n🛑 Out of clues! The word meant: {definition}")

    def _print_header(self):
        print("\n" + "="*40 + "\n            CONTEXT CLUES 🧐     \n" + "="*40)

    def _select_theme(self):
        print("\nSelect Context Theme:")
        for key, value in THEMES.items():
            print(f"{key}. {value.split(':')[0]}")
        choice = input("Choose 1-4: ").strip()
        self.current_theme = THEMES.get(choice, THEMES["1"])
        print("--> Theme selected.")

    def _print_game_over(self):
        print("\n" + "="*50 + f"\n🎉 GAME OVER! FINAL SCORE: {self.state.score}\n" + "="*50)

if __name__ == "__main__":
    GameSession().start()