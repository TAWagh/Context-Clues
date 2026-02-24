import React from 'react';

export default function SummaryScreen({ score, sessionHistory, setGameState }) {
  const completedWords = sessionHistory.length;
  const maxPossiblePoints = completedWords * 5;
  const accuracy = completedWords > 0 ? Math.round((score / maxPossiblePoints) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-6 font-serif">
      <div className="max-w-2xl mx-auto py-8 md:py-12 px-6 md:px-8 bg-white border border-slate-200 shadow-sm">
        <div className="border-b border-slate-300 pb-8 mb-12">
          <h2 className="text-2xl md:text-3xl font-normal text-black mb-2 tracking-tight">Session Summary</h2>
          <p className="font-sans text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Performance Dashboard</p>
        </div>
        
        <div className="grid grid-cols-3 gap-8 md:gap-12 mb-8 md:mb-16 font-sans">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-2">Final Score</p>
            <p className="text-4xl font-light text-black">{score}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-2">Accuracy</p>
            <p className="text-4xl font-light text-black">{accuracy}%</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-2">Words</p>
            <p className="text-4xl font-light text-black">{completedWords}</p>
          </div>
        </div>

        <div className="mb-8 md:mb-16">
          <h3 className="font-sans text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-8 border-b border-slate-200 pb-2">Detailed Log</h3>
          <div className="max-h-[320px] overflow-y-auto pr-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
            {sessionHistory.map((item, i) => (
              <div key={i} className="flex items-start justify-between py-5 border-b border-slate-100 last:border-0">
                <div className="flex flex-col flex-1">
                  <div className="mb-2">
                    <span className="text-xl text-black font-medium tracking-tight uppercase">{item.word}</span>
                  </div>
                  <span className="text-xs text-slate-600 italic">{item.meaning}</span>
                </div>
                <div className="text-right">
                  {item.status === 'Resolved' ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-semibold text-green-700 uppercase tracking-widest bg-green-50 px-2 py-1 rounded mb-1">Resolved</span>
                      <span className="text-[10px] text-slate-400 font-sans uppercase tracking-widest">+{item.points} PTS</span>
                    </div>
                  ) : item.status === 'Attempted' ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded mb-1">Attempted</span>
                      <span className="text-[10px] text-slate-400 font-sans uppercase tracking-widest">0 PTS</span>
                    </div>
                  ) : item.status === 'Skipped' ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded mb-1">Skipped</span>
                      <span className="text-[10px] text-slate-400 font-sans uppercase tracking-widest">0 PTS</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-semibold text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded mb-1">Missed</span>
                      <span className="text-[10px] text-slate-400 font-sans uppercase tracking-widest">0 PTS</span>
                    </div>
                  )}    
                </div>
              </div>
            ))}
            {sessionHistory.length === 0 && (
              <div className="py-8 text-center text-slate-400 font-sans text-xs italic">
                No data entries recorded.
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => setGameState('setup')}
          className="w-full border-2 border-black text-black font-sans font-semibold py-3 md:py-4 text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black hover:text-white rounded-none"
          style={{ borderColor: 'black', borderRadius: 0 }}
        >
          New Session
        </button>
      </div>
    </div>
  );
}
