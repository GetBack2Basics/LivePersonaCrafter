import { 
  Bot, 
  Mic, 
  HardDrive,
  RefreshCw
} from 'lucide-react';
import type { EngineState } from '../types';

interface HeaderProps {
  state: EngineState;
  onResetState: () => void;
}

export function Header({ state, onResetState }: HeaderProps) {
  const { activePersona } = state;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-zinc-800/80 px-6 py-3.5 mb-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand & Product Title */}
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl">
            <Bot className="w-6 h-6 text-indigo-400" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-zinc-100 tracking-tight">
                LivePersona <span className="text-indigo-400">Crafter</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 rounded-md tracking-wider">
                GETBACK2BASICS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Real-Time Persona Evaluation & Debate Engine
            </p>
          </div>
        </div>

        {/* Center: Live Device Ingress Status */}
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">Device Microphone Input</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1 text-cyan-400">
            <HardDrive className="w-3.5 h-3.5" />
            <span>IndexedDB Offline Store</span>
          </div>
        </div>

        {/* Right: Active Persona Badge & Control Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-xs">
            <img
              src={activePersona.avatarUrl}
              alt={activePersona.name}
              className="w-5 h-5 rounded-full object-cover border border-indigo-400/60"
            />
            <div>
              <span className="font-semibold text-zinc-200 block text-[11px] leading-none">
                {activePersona.name}
              </span>
              <span className="text-[9px] text-indigo-400 leading-none">
                {activePersona.role}
              </span>
            </div>
          </div>

          <button
            onClick={onResetState}
            title="Reset to default initial state"
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
