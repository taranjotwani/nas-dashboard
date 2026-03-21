import React from 'react';

const ServerIPDisplay = ({ serverIp = 'Loading...' }) => {

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-2xl" />

        {/* IP Container */}
        <div className="relative rounded-3xl border-2 border-emerald-500/30 bg-zinc-900/80 backdrop-blur-sm px-8 py-6 md:px-12 md:py-8">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Server IP</span>
            <span className="text-2xl md:text-4xl font-mono font-semibold text-emerald-400 tracking-wide">
              {serverIp}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerIPDisplay;