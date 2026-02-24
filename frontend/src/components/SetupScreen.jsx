import React from 'react';
import { BookOpen, Zap } from 'lucide-react';

export default function SetupScreen({ 
  config, 
  theme, setTheme, 
  difficulty, setDifficulty,
  startNewGame 
}) {
  // Safety check: Prevents the app from crashing if the backend data hasn't arrived yet
  if (!config) return null;

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 font-serif">
      <div className="max-w-fit w-full md:min-w-[400px]">
        <div className="mb-10 md:mb-14 text-center">
          <h1 className="text-4xl md:text-7xl font-normal text-black mb-4 tracking-tight leading-none">
            Context Clues
          </h1>
          <p className="text-slate-500 font-sans text-[11px] tracking-[0.4em] uppercase font-semibold">
            A Game of Linguistic Precision
          </p>
        </div>
        
        <div className="space-y-6 font-sans text-left">
          {/* Theme Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-3 uppercase tracking-[0.2em]">Theme</label>
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value)}
              className="w-full py-4 px-6 bg-white border-b-2 border-black text-sm focus:outline-none text-black appearance-none cursor-pointer rounded-t-sm shadow-sm"
            >
              {Object.keys(config.themes).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Difficulty Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-3 uppercase tracking-[0.2em]">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full py-4 px-6 bg-white border-b-2 border-black text-sm focus:outline-none text-black appearance-none cursor-pointer rounded-t-sm shadow-sm"
            >
              {Object.keys(config.difficulty_levels).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={() => startNewGame('study')}
              className="w-full border-2 border-black text-black hover:bg-black hover:text-white hover:border-black focus:outline-none font-semibold py-5 text-[11px] uppercase tracking-[0.3em] transition-all flex flex-col items-center justify-center gap-2 group rounded-none"              style={{ borderRadius: 0 }}
            >
              <BookOpen className="w-5 h-5 text-black group-hover:text-white transition-colors mb-1" strokeWidth={1.5} />
              Study Mode
            </button>

            <button 
              onClick={() => startNewGame('play')}
              className="w-full border-2 border-black text-black hover:bg-black hover:text-white hover:border-black focus:outline-none font-semibold py-5 text-[11px] uppercase tracking-[0.3em] transition-all flex flex-col items-center justify-center gap-2 group rounded-none"              style={{ borderRadius: 0 }}
            >
              <Zap className="w-5 h-5 text-black group-hover:text-white transition-colors mb-1" strokeWidth={1.5} />
              Play Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}