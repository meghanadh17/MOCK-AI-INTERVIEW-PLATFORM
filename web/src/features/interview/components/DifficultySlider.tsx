
interface DifficultySliderProps {
  value: number; // 0.25, 0.5, 0.75, 1.0
  onChange: (val: number) => void;
}

export function DifficultySlider({ value, onChange }: DifficultySliderProps) {
  // Map float value to slide index (0 to 3)
  const getIndex = (val: number) => {
    if (val <= 0.25) return 0;
    if (val <= 0.5) return 1;
    if (val <= 0.75) return 2;
    return 3;
  };

  const getFloat = (idx: number) => {
    const mapping = [0.25, 0.5, 0.75, 1.0];
    return mapping[idx];
  };

  const labels = ['Easy', 'Medium', 'Hard', 'Expert'];
  const currentIndex = getIndex(value);

  const getTrackFill = (idx: number) => {
    // Return CSS gradient fill width percentage
    return `${(idx / 3) * 100}%`;
  };

  return (
    <div className="space-y-4 w-full">
      <div className="relative pt-2">
        {/* Track Background */}
        <div className="h-2 w-full border border-zinc-950 rounded-full overflow-hidden relative neo-sunken">
          {/* Gradient Fill */}
          <div 
            className="h-full bg-gradient-to-r from-zinc-800 to-zinc-200 transition-all duration-300"
            style={{ width: getTrackFill(currentIndex) }}
          />
        </div>

        {/* Input range */}
        <input 
          type="range"
          min="0"
          max="3"
          step="1"
          value={currentIndex}
          onChange={(e) => onChange(getFloat(parseInt(e.target.value)))}
          className="absolute inset-x-0 -top-1 w-full h-8 opacity-0 cursor-pointer"
        />

        {/* Custom Thumb Indicators */}
        <div className="flex justify-between mt-2 text-[10px] font-mono font-bold text-text-muted select-none">
          {labels.map((lbl, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onChange(getFloat(idx))}
                className={`transition-colors cursor-pointer uppercase tracking-wider ${
                  isActive ? 'text-zinc-100 font-extrabold scale-105' : 'text-text-muted hover:text-text-sec'
                }`}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center">
        <p className="text-[11px] font-mono text-text-sec">
          Selected Difficulty: <span className="font-extrabold text-zinc-100 uppercase">{labels[currentIndex]}</span>
        </p>
      </div>
    </div>
  );
}