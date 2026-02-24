# Context Clues

An AI-assisted vocabulary game where players infer word meanings from progressively clearer context clues.

## What It Does

- Runs each word as a 5-turn challenge, with clues becoming easier each turn.
- Uses an LLM to generate contextual clue sentences.
- Uses an LLM-based evaluator to judge conceptual correctness, not exact wording.
- Rewards earlier correct answers with higher points.

Scoring: Turn 1 -> 5 pts, Turn 2 -> 4 pts, Turn 3 -> 3 pts, Turn 4 -> 2 pts, Turn 5 -> 1 pt, Missed -> 0 pts.

## Quick Demo Flow

1. Choose a theme, difficulty, and optional timer.
2. The app fetches a random word and generates clue 1/5.
3. Submit a guess for the meaning.
4. If incorrect, the system provides another clue (up to 5 turns total).
5. The round ends on a correct guess, a miss after turn 5, a skip, or time expiry.

## Tech Stack

- Frontend: React 19 + Vite
- Backend: FastAPI + SQLAlchemy + LangChain
- Database: SQLite (`backend/database/context_clues.db`)
- AI: OpenAI models via `langchain-openai`

## Quick Start

Run backend and frontend in separate terminals from the repository root.

1. Backend

```powershell
cd backend
pip install -r requirements.txt
# Create backend/.env and set OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

App URLs:
- Backend: `http://localhost:8000`
- Frontend (Vite default): `http://localhost:5173`

## Environment Variables

| Variable | Where to set | Required | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | `backend/.env` | Yes | Authorizes clue generation and guess evaluation calls. |

## API Summary

| Method | Endpoint | Purpose | Request keys | Response keys |
| --- | --- | --- | --- | --- |
| `GET` | `/api/config` | Fetch themes, time options, and difficulty levels. | None | `themes`, `time_options`, `difficulty_levels` |
| `POST` | `/api/get-word` | Fetch a random unused word, optionally filtered by difficulty. | `used_words`, `difficulty` (optional) | `status`, `word_data` |
| `POST` | `/generate-clue` | Generate one contextual clue sentence for the current turn. | `word`, `turn`, `theme`, `history` | `clue` |
| `POST` | `/evaluate` | Evaluate whether the user guess captures meaning/nuance. | `word`, `definition`, `guess` | `core_concept`, `distinguishing_nuance`, `is_correct`, `nuance_gap` |

Reference implementation: [`backend/main.py`](backend/main.py)

## Project Structure

```text
Context Clues/
|- backend/
|  |- main.py
|  |- requirements.txt
|  |- database/
|     |- models.py
|     |- context_clues.db
|- frontend/
|  |- src/
|  |  |- App.jsx
|  |  |- api.js
|  |  |- gameLogic.js
|  |- package.json
|- README.md
```

## Frontend Scripts

From `frontend/`:

- `npm run dev` - start local development server.
- `npm run build` - create production build.
- `npm run test` - run unit tests (`src/gameLogic.test.js`).
- `npm run lint` - run ESLint checks.

## Known Limitations / Next Improvements

- Current CORS setup allows all origins for development convenience.
- No user accounts or long-term progress tracking yet.
- Vocabulary scope can be expanded with more curated words and themes.

