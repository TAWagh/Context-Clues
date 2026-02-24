/**
 * @typedef {{ word?: string }} WordEntry
 */

/**
 * Resolve shorthand mode values to config keys.
 * @param {string} selectedDuration
 * @returns {string}
 */
export function resolveDurationKey(selectedDuration) {
  if (selectedDuration === 'study') return 'Untimed';
  if (selectedDuration === 'play') return '3 Minutes';
  return selectedDuration;
}

/**
 * @param {number} turn
 * @returns {number}
 */
export function calculatePointsForTurn(turn) {
  return 6 - turn;
}

/**
 * Append an entry once per word, preserving insertion order.
 * @param {Array<WordEntry>} history
 * @param {WordEntry | null | undefined} entry
 * @returns {Array<WordEntry>}
 */
export function appendUniqueByWord(history, entry) {
  if (!entry?.word) return history;
  return history.some((item) => item.word === entry.word) ? history : [...history, entry];
}

/**
 * @param {{
 *   gameState: string,
 *   timeLeft: number | null,
 *   hasSubmittedCurrentWord: boolean,
 *   currentWord: WordEntry | null
 * }} params
 * @returns {boolean}
 */
export function shouldPersistTimedAttemptOnEnd(params) {
  const { gameState, timeLeft, hasSubmittedCurrentWord, currentWord } = params;
  return (
    gameState === 'playing' &&
    timeLeft !== null &&
    hasSubmittedCurrentWord &&
    Boolean(currentWord?.word)
  );
}

