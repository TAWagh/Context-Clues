const API_BASE_URL = "https://context-clues-service.onrender.com";

// const API_BASE_URL = "http://localhost:8000";

// 1. The POST function (Used for sending guesses and getting clues)
export async function callBackend(endpoint, payload) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Backend request failed');
    return await response.json();
  } catch (err) {
    console.error("Backend Error:", err);
    throw err;
  }
}

// 2. The GET function (Used once at the start to load the dictionary/themes)
export async function fetchGameConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config`);
    if (!response.ok) throw new Error('Failed to load game config');
    return await response.json();
  } catch (err) {
    console.error("Config Fetch Error:", err);
    throw err;
  }
}

// 3. Fetch a new random word (Used at the start of each round)
export async function fetchRandomWord(usedWords, difficulty) {
  try {
    const body = { used_words: usedWords };
    if (typeof difficulty !== 'undefined' && difficulty !== null) body.difficulty = difficulty;

    const response = await fetch(`${API_BASE_URL}/api/get-word`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Failed to fetch new word');
    return await response.json();
  } catch (err) {
    console.error("Fetch Word Error:", err);
    throw err;
  }
}