import React from 'react';
import { ExternalLink, Wrench } from 'lucide-react';

export const Footer: React.FC = () => {
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '202608090828';

  return (
    <footer className="w-full border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md py-4 px-6 mt-auto text-xs text-zinc-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left side: Project credit & icon link */}
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-indigo-400" />
          <span>A project of</span>
          <span className="font-semibold text-zinc-200">Get Back 2 Basics</span>
          <a
            href="https://github.com/GetBack2Basics"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-zinc-400 hover:text-indigo-400 transition-colors ml-1"
            title="Open Get Back 2 Basics"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Right side: Build timestamp */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-400">Built: {buildTime}</span>
          <Wrench className="w-4 h-4 text-indigo-400" />
        </div>
      </div>
    </footer>
  );
};
