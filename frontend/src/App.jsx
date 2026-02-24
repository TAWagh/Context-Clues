import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { callBackend, fetchGameConfig, fetchRandomWord } from './api.js';
import {
  appendUniqueByWord,
  calculatePointsForTurn,
  resolveDurationKey,
  shouldPersistTimedAttemptOnEnd,
} from './gameLogic.js';
import GameScreen from './components/GameScreen';
import SetupScreen from './components/SetupScreen';
import SummaryScreen from './components/SummaryScreen';

export default function App() {
  const [config, setConfig] = useState(null);
  const [gameState, setGameState] = useState('loading');

  const [score, setScore] = useState(0);
  const [usedWords, setUsedWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [turn, setTurn] = useState(1);
  const [history, setHistory] = useState([]);
  const [clues, setClues] = useState([]);
  const [viewedClueIdx, setViewedClueIdx] = useState(0);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [hasSubmittedCurrentWord, setHasSubmittedCurrentWord] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const [theme, setTheme] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const timerRef = useRef(null);
  const roundTransitionTimeoutRef = useRef(null);

  const clearRoundTransitionTimeout = useCallback(() => {
    if (roundTransitionTimeoutRef.current) {
      clearTimeout(roundTransitionTimeoutRef.current);
      roundTransitionTimeoutRef.current = null;
    }
  }, []);

  const appendToSessionHistory = useCallback((entry) => {
    setSessionHistory((prev) => appendUniqueByWord(prev, entry));
  }, []);

  const endGame = useCallback(
    (reason) => {
      if (
        shouldPersistTimedAttemptOnEnd({
          gameState,
          timeLeft,
          hasSubmittedCurrentWord,
          currentWord,
        })
      ) {
        appendToSessionHistory({
          ...currentWord,
          status: 'Attempted',
          points: 0,
          turnResolved: turn,
        });
      }

      setGameState('summary');
      setFeedback({ type: 'info', text: reason });
      if (timerRef.current) clearInterval(timerRef.current);
      clearRoundTransitionTimeout();
    },
    [
      appendToSessionHistory,
      clearRoundTransitionTimeout,
      currentWord,
      gameState,
      hasSubmittedCurrentWord,
      timeLeft,
      turn,
    ]
  );

  const generateClue = useCallback(async (wordObj, turnNum, themeText, currentHistory) => {
    setIsLoading(true);
    try {
      const result = await callBackend('/generate-clue', {
        word: wordObj.word,
        turn: turnNum,
        theme: themeText,
        history: currentHistory,
      });

      const newClue = result.clue;
      setClues((prev) => {
        const next = [...prev, newClue];
        setViewedClueIdx(next.length - 1);
        return next;
      });
      setHistory((prev) => [...prev, { role: 'model', content: newClue }]);
    } catch {
      setFeedback({ type: 'error', text: 'Failed to generate clue.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewRound = useCallback(
    async (alreadyUsed = usedWords, difficultyFilter = difficulty) => {
      try {
        const numericDifficulty = config?.difficulty_levels?.[difficultyFilter] ?? null;
        const response = await fetchRandomWord(alreadyUsed, numericDifficulty);

        if (response.status === 'exhausted' || !response.word_data) {
          endGame('Mission Complete! All words found.');
          return;
        }

        const wordObj = response.word_data;

        setCurrentWord(wordObj);
        setUsedWords([...alreadyUsed, wordObj.word]);
        setTurn(1);
        setHistory([]);
        setClues([]);
        setViewedClueIdx(0);
        setIsRoundOver(false);
        setIsSkipping(false);
        setHasSubmittedCurrentWord(false);
        setFeedback(null);
        setUserInput('');

        await generateClue(wordObj, 1, config.themes[theme], []);
      } catch {
        setFeedback({ type: 'error', text: 'Failed to load the next word.' });
      }
    },
    [config, difficulty, endGame, generateClue, theme, usedWords]
  );

  const scheduleRoundTransition = useCallback(
    (delayMs) => {
      clearRoundTransitionTimeout();
      roundTransitionTimeoutRef.current = setTimeout(() => {
        startNewRound();
      }, delayMs);
    },
    [clearRoundTransitionTimeout, startNewRound]
  );

  useEffect(() => {
    async function initGame() {
      try {
        const serverConfig = await fetchGameConfig();
        setConfig(serverConfig);
        setTheme(Object.keys(serverConfig.themes)[0]);
        setDifficulty('Intermediate');
        setGameState('setup');
      } catch {
        setFeedback({ type: 'error', text: 'Failed to connect to server.' });
      }
    }
    initGame();
  }, []);

  useEffect(() => () => clearRoundTransitionTimeout(), [clearRoundTransitionTimeout]);

  const startNewGame = useCallback(
    (selectedDuration) => {
      const key = resolveDurationKey(selectedDuration);
      const seconds = config.time_options[key];

      setScore(0);
      setUsedWords([]);
      setSessionHistory([]);
      setTimeLeft(seconds);
      setGameState('playing');

      startNewRound([]);
    },
    [config, startNewRound]
  );

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    if (!userInput.trim() || isLoading || isRoundOver || !currentWord) return;

    setHasSubmittedCurrentWord(true);
    setIsLoading(true);
    setFeedback({ type: 'info', text: 'Analyzing...' });

    try {
      const evaluation = await callBackend('/evaluate', {
        word: currentWord.word,
        definition: currentWord.meaning,
        guess: userInput,
      });

      if (evaluation.is_correct) {
        const pointsAwarded = calculatePointsForTurn(turn);
        setScore((prev) => prev + pointsAwarded);
        setFeedback({ type: 'success', text: `Resolved! +${pointsAwarded} pts` });
        setIsRoundOver(true);
        appendToSessionHistory({
          ...currentWord,
          status: 'Resolved',
          points: pointsAwarded,
          turnResolved: turn,
        });

        if (timeLeft !== null) scheduleRoundTransition(1500);
      } else if (turn < 5) {
        setTurn((prev) => prev + 1);
        setFeedback({ type: 'error', text: 'Incorrect. Generating next clue...' });

        const updatedHistory = [
          ...history,
          { role: 'user', content: `User guessed: '${userInput}'` },
          { role: 'system', content: `Nuance Gap: ${evaluation.nuance_gap}` },
        ];

        setHistory(updatedHistory);
        await generateClue(currentWord, turn + 1, config.themes[theme], updatedHistory);
        setFeedback(null);
      } else {
        setFeedback({ type: 'error', text: 'Out of clues!' });
        setIsRoundOver(true);
        appendToSessionHistory({ ...currentWord, status: 'Missed', points: 0, turnResolved: 5 });
        if (timeLeft !== null) scheduleRoundTransition(2000);
      }

      setUserInput('');
    } catch {
      setFeedback({ type: 'error', text: 'Evaluation failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (isLoading || isRoundOver || isSkipping || !currentWord) return;

    setIsSkipping(true);
    setIsRoundOver(true);
    setFeedback(null);

    appendToSessionHistory({
      ...currentWord,
      status: 'Skipped',
      points: 0,
      turnResolved: turn,
    });

    if (timeLeft !== null) scheduleRoundTransition(1200);
  };

  useEffect(() => {
    if (gameState !== 'playing' || timeLeft === null) return undefined;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame('Time Expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [endGame, gameState, timeLeft]);

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center font-serif text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-black" />
        <p className="text-[11px] uppercase tracking-[0.2em]">Connecting to Server...</p>
      </div>
    );
  }

  if (gameState === 'setup') {
    return (
      <SetupScreen
        config={config}
        theme={theme}
        setTheme={setTheme}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        startNewGame={startNewGame}
      />
    );
  }

  if (gameState === 'summary') {
    return <SummaryScreen score={score} sessionHistory={sessionHistory} setGameState={setGameState} />;
  }

  return (
    <GameScreen
      score={score}
      timeLeft={timeLeft}
      theme={theme}
      difficulty={difficulty}
      currentWord={currentWord}
      clues={clues}
      viewedClueIdx={viewedClueIdx}
      setViewedClueIdx={setViewedClueIdx}
      isLoading={isLoading}
      isSkipping={isSkipping}
      isRoundOver={isRoundOver}
      userInput={userInput}
      setUserInput={setUserInput}
      handleSubmit={handleSubmit}
      feedback={feedback}
      setFeedback={setFeedback}
      startNewRound={startNewRound}
      endGame={endGame}
      setGameState={setGameState}
      turn={turn}
      handleSkip={handleSkip}
    />
  );
}
