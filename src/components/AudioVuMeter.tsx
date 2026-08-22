import React from "react";

interface AudioVuMeterProps {
  peakDb: number;
  rmsDb: number;
  vertical?: boolean;
  compact?: boolean;
}

export const AudioVuMeter: React.FC<AudioVuMeterProps> = ({
  peakDb,
  rmsDb,
  vertical = true,
  compact = false,
}) => {
  // Convert -60dB to 0dB into a percentage 0% to 100%
  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 0) return 100;
    return Math.round(((db + 60) / 60) * 100);
  };

  const peakPercent = dbToPercent(peakDb);
  const rmsPercent = dbToPercent(rmsDb);
  const isClipping = peakDb >= -1;

  if (compact) {
    return (
      <div className="flex items-center space-x-1.5 select-none font-mono">
        <div className="relative w-16 sm:w-20 h-2 bg-neutral-950/80 rounded-full overflow-hidden border border-white/10 flex">
          <div
            className="h-full transition-all duration-75 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
            style={{ width: `${rmsPercent}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white transition-all duration-150"
            style={{ left: `${peakPercent}%` }}
          />
        </div>
        <div
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            isClipping ? "bg-rose-500 animate-ping" : rmsPercent > 5 ? "bg-emerald-400" : "bg-neutral-600"
          }`}
          title={isClipping ? "Áudio Saturando (Clip)" : "Nível de Áudio"}
        />
      </div>
    );
  }

  if (vertical) {
    return (
      <div className="flex flex-col items-center select-none font-mono">
        {/* Clip Indicator */}
        <div
          className={`w-3 h-2 mb-0.5 border border-neutral-800 transition-colors ${
            isClipping ? "bg-red-500 shadow-sm" : "bg-neutral-900"
          }`}
          title="Clip indicator"
        />

        {/* VU Bar Container */}
        <div className="relative w-3 h-36 bg-black border border-neutral-800 flex flex-col justify-end overflow-hidden">
          {/* Background Tick Marks */}
          <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none opacity-40 text-[7px] text-neutral-400 font-mono items-center">
            <span>0</span>
            <span>-6</span>
            <span>-12</span>
            <span>-24</span>
            <span>-48</span>
          </div>

          {/* RMS Level Fill */}
          <div
            className="w-full transition-all duration-75 ease-out bg-gradient-to-t from-green-500 via-amber-400 to-red-500"
            style={{ height: `${rmsPercent}%` }}
          />

          {/* Peak Hold Line */}
          <div
            className="absolute left-0 right-0 h-0.5 bg-white transition-all duration-150 pointer-events-none"
            style={{ bottom: `${peakPercent}%` }}
          />
        </div>

        <span className="text-[9px] font-mono font-bold text-neutral-400 mt-1">
          {peakDb > -60 ? `${Math.round(peakDb)}DB` : "-∞"}
        </span>
      </div>
    );
  }

  // Horizontal meter
  return (
    <div className="flex items-center space-x-2 w-full select-none font-mono">
      <span className="text-[10px] font-mono text-neutral-400 w-8 text-right font-bold">
        {peakDb > -60 ? `${Math.round(peakDb)}DB` : "-∞"}
      </span>
      <div className="relative flex-1 h-2.5 bg-black border border-neutral-800 overflow-hidden flex">
        <div
          className="h-full transition-all duration-75 bg-gradient-to-r from-green-500 via-amber-400 to-red-500"
          style={{ width: `${rmsPercent}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white transition-all duration-150"
          style={{ left: `${peakPercent}%` }}
        />
      </div>
      <div
        className={`w-2.5 h-2.5 border border-neutral-800 ${
          isClipping ? "bg-red-500" : "bg-neutral-900"
        }`}
      />
    </div>
  );
};
