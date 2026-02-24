import React, { useState, useEffect, useRef } from 'react';
import { Clock, ArrowLeft, ArrowRight, Loader2, Volume2, ArrowUpRight } from 'lucide-react';

export default function GameScreen({
  score, timeLeft, theme, difficulty, currentWord, clues, viewedClueIdx, 
  setViewedClueIdx, isLoading, isSkipping, isRoundOver, userInput, setUserInput, 
  handleSubmit, feedback, setFeedback, startNewRound, endGame, setGameState, turn, handleSkip
}) {

  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const inputRef = useRef(null);

  // Ensure the text input is focused whenever the game screen is active
  useEffect(() => {
    if (!isRoundOver && !isLoading) {
      // small timeout to ensure element is mounted and visible
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isRoundOver, isLoading, currentWord, viewedClueIdx]);

  const formatTime = (seconds) => {
    if (seconds === null) return "Untimed";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (clientX) => {
    if (isLoading) return;
    setDragStart(clientX);
  };

  const handleDragMove = (clientX) => {
    if (dragStart === null) return;
    setDragOffset(clientX - dragStart);
  };

  const handleDragEnd = () => {
    if (dragStart === null) return;
    const threshold = 60;
    if (dragOffset < -threshold && viewedClueIdx < clues.length - 1) {
      setViewedClueIdx(v => v + 1);
    } else if (dragOffset > threshold && viewedClueIdx > 0) {
      setViewedClueIdx(v => v - 1);
    }
    setDragStart(null);
    setDragOffset(0);
  };

  const playPronunciation = () => {
    // Safety check: make sure we have a word
    if (!currentWord?.word) return;

    // 1. Cancel any currently playing audio so they don't overlap if the user clicks fast
    window.speechSynthesis.cancel();

    // 2. Create the speech request
    const utterance = new SpeechSynthesisUtterance(currentWord.word);
    
    // 3. Optional tweaks: Slow it down just a tiny bit so complex words are clear
    utterance.rate = 0.85; 
    utterance.pitch = 1.0;
    utterance.lang = 'en-US'; // Force English pronunciation

    // 4. Speak!
    window.speechSynthesis.speak(utterance);
  };

  const responseControlHeightClass = "h-[clamp(3.25rem,7vh,4.25rem)]";
  const isTimedNextWordTransition = timeLeft !== null && isRoundOver && feedback?.type === 'success';


  return (
    <div className="relative h-dvh bg-[#FAF9F6] flex flex-col px-6 md:px-8 py-5 md:py-6 font-serif select-none overflow-y-auto overflow-x-hidden">
      <div className="absolute top-5 md:top-6 inset-x-6 md:inset-x-8 z-20">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between font-sans text-[11px] font-semibold uppercase tracking-[0.2em]">
          <div>
            {timeLeft !== null && (
              <div className="flex items-center gap-2 text-black bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <Clock className="w-3 h-3 text-slate-600" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
          <div className="flex gap-12 items-center">
            <div>
              <span className="text-slate-600">SCORE:</span>
              <span className="text-black ml-1.5">{score}</span>
            </div>
            <button 
              onClick={() => setGameState('setup')}
              className="flex items-center gap-1.5 group border-0 hover:border-0 focus:border-0 active:border-0 active:shadow-none"
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              <span className="text-slate-600 group-hover:text-black">EXIT SESSION</span>
              <ArrowUpRight className="w-3 h-3 text-black" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full my-auto">
        {/* Top row spacer for absolute timer/score/exit controls */}
        <div className="w-full max-w-5xl mx-auto h-8 md:h-9 mb-[clamp(0.75rem,2.5vh,2.5rem)]" />

        <div className="w-full max-w-2xl mx-auto flex flex-col">
        {/* Word Display Area */}
          <div className="pt-8 mb-[clamp(0.75rem,2vh,2.5rem)]">
          <div className="font-sans text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-4">
            <span className="text-slate-500">{theme} - {difficulty}</span>
          </div>
            <div className="flex items-baseline gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-normal text-black tracking-tight">
              {currentWord?.word}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div onClick={playPronunciation}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-slate-200 hover:bg-slate-100 cursor-pointer active:scale-95 transition-transform"
            >
              <Volume2 className="w-4 h-4 text-black" />
            </div>
            <div className="font-mono text-[14px] tracking-[0.3em] uppercase font-semibold text-slate-500">
              {currentWord?.pronunciation}
            </div>
          </div>
          {/* Study mode: show official definition when the round has ended (resolved or out of clues) */}
          {isRoundOver && timeLeft === null && currentWord?.meaning && (
            <div className="mt-4 bg-white px-4 py-3 border border-slate-100 rounded-sm shadow-sm">
              <div className="text-[11px] font-sans text-slate-500 uppercase tracking-[0.2em] mb-1">Definition</div>
              <div className="text-sm text-slate-800 italic">"{currentWord.meaning}"</div>
            </div>
          )}
        </div>

          <div className="border-b border-slate-200 mb-[clamp(0.75rem,2vh,2.5rem)] shadow-sm" />

        {/* Clue + Input Unit */}
        <div className="py-4 md:py-6">
          {/* Clue Area - Carousel Architecture */}
          <div className="mb-6 md:mb-7">
            <div className="flex gap-2 mb-4 md:mb-6 items-center h-4">
              <div className="font-sans text-[11px] font-semibold text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3">
                Context Clue {viewedClueIdx + 1}
                {isLoading && clues.length < turn && (
                  <div className="flex items-center gap-2 text-slate-400 lowercase font-normal italic tracking-normal">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    synthesizing...
                  </div>
                )}
              </div>

              <div className="ml-4 flex gap-2 items-center">
                {[1, 2, 3, 4, 5].map(dot => (
                  <div 
                    key={dot}
                    className={`w-1.5 h-1.5 rounded-full ${dot <= clues.length ? 'bg-black' : 'bg-slate-300'}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="relative group overflow-hidden w-full">
              <div 
                className="min-h-[96px] md:min-h-[120px] cursor-grab active:cursor-grabbing relative"
                onMouseDown={(e) => handleDragStart(e.clientX)}
                onMouseMove={(e) => handleDragMove(e.clientX)}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                onTouchEnd={handleDragEnd}
              >
                <div 
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(calc(-${viewedClueIdx * 100}% + ${dragOffset}px))` }}
                >
                  {clues.length === 0 && isLoading ? (
                    <div className="w-full flex-shrink-0 flex items-start px-1">
                      <div className="flex items-center gap-3 font-sans text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        Analyzing Pattern...
                      </div>
                    </div>
                  ) : (
                    clues.map((clue, idx) => (
                      <div key={idx} className="w-full flex-shrink-0 flex items-start pr-8">
                        <p className="text-xl md:text-2xl text-black leading-snug italic font-normal whitespace-normal break-words w-full">
                          "{clue}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-end gap-3 mt-1">
                <button 
                  onClick={() => setViewedClueIdx(v => Math.max(0, v - 1))}
                  disabled={viewedClueIdx === 0}
                  className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                    viewedClueIdx === 0 
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed opacity-30' 
                    : 'border-black text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                </button>
                <button 
                  onClick={() => setViewedClueIdx(v => Math.min(clues.length - 1, v + 1))}
                  disabled={viewedClueIdx === (clues.length - 1) || clues.length === 0}
                  className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                    viewedClueIdx === (clues.length - 1) || clues.length === 0
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed opacity-30' 
                    : 'border-black text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div>
          {isSkipping ? (
            <div className="mb-4">
              <div
                className={`w-full ${responseControlHeightClass} border-2 border-black text-black font-sans font-semibold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 rounded-none opacity-80`}
                style={{ borderColor: 'black', borderRadius: 0 }}
              >
                Skipped. Moving to next word...
              </div>
            </div>
          ) : isTimedNextWordTransition ? (
            <div className="mb-4">
              <div
                className={`w-full ${responseControlHeightClass} border-2 border-black text-black font-sans font-semibold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 rounded-none opacity-80`}
                style={{ borderColor: 'black', borderRadius: 0 }}
              >
                Next word
              </div>
            </div>
          ) : !isRoundOver ? (
            <>
              <form onSubmit={handleSubmit} className="relative mb-4 group/form">
                <div className="relative flex items-center">
                  <input 
                    ref={inputRef}
                    autoFocus
                    type="text"
                    placeholder="Interpret word meaning..."
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      if (feedback) setFeedback(null);
                    }}
                    disabled={isLoading}
                    className={`w-full ${responseControlHeightClass} bg-white pl-6 pr-20 border-b-2 border-black text-[clamp(1.125rem,2.3vw,1.5rem)] font-light focus:border-black text-black outline-none placeholder:text-slate-300 rounded-t-sm shadow-sm disabled:opacity-50`}
                  />
                  <button
                    type="submit"
                    disabled={!userInput.trim() || isLoading}
                    className={`shrink-0 absolute right-4 w-8 h-8 rounded-full border border-black flex items-center justify-center ${
                      !userInput.trim() || isLoading
                      ? 'opacity-0 scale-90 cursor-not-allowed'
                      : 'opacity-100 scale-100 border-black text-black hover:bg-black hover:text-white shadow-sm active:scale-95'
                    }`}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <ArrowRight className="w-5 h-5 shrink-0" strokeWidth={1.5} />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {timeLeft === null && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => startNewRound()}
                    className={`w-full ${responseControlHeightClass} border-2 border-black text-black font-sans font-semibold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black hover:text-white rounded-none`}
                    style={{ borderColor: 'black', borderRadius: 0 }}
                  >
                    Next Word
                    <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Feedback Area */}
          <div className="mt-4 min-h-[1.25rem] flex items-start justify-between">
            {feedback && (
              <div className={`font-sans text-[11px] font-semibold uppercase tracking-[0.2em] leading-5 ${
                feedback.type === 'success' ? 'text-green-700' :
                feedback.type === 'error' ? 'text-red-500' : 'text-slate-500'
              }`}>
                {feedback.text}
              </div>
            )}
          </div>

          </div>
        </div>
        {/* Bottom controls intentionally outside the core gameplay viewport area */}
        {(
          (timeLeft !== null && (!isRoundOver || isSkipping || isTimedNextWordTransition)) || // keep Skip visible during timed transitions
          (timeLeft === null) // keep Complete session available in untimed mode
        ) && (
          <div className="w-full max-w-2xl mx-auto mt-10 border-t border-slate-200 pt-8 pb-6 flex justify-center">
            {/* Timed mode: Skip button */}
            {timeLeft !== null && (!isRoundOver || isSkipping || isTimedNextWordTransition) && (
              <button 
                type="button"
                onClick={handleSkip}
                disabled={isLoading || isSkipping || isTimedNextWordTransition}
                className="flex items-center gap-2 px-8 py-3 border border-slate-300 text-slate-500 hover:border-black hover:text-black rounded-full font-sans text-[11px] font-semibold uppercase tracking-[0.2em] group"
              >
                SKIP WORD
              </button>
            )}

            {/* Untimed: Complete session button (also shown in untimed mode) */}
            {timeLeft === null && (
              <button 
                onClick={() => endGame("Session Complete")}
                className="flex items-center gap-2 px-8 py-3 border border-slate-300 text-slate-500 hover:border-black hover:text-black rounded-full font-sans text-[11px] font-semibold uppercase tracking-[0.2em] group"
              >
                COMPLETE SESSION
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
