export function CoachTipChip({ tip, onClose }: any) {
  return (
    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex justify-between items-center text-xs text-text-sec">
      <span>💡 {tip}</span>
      <button onClick={onClose} className="p-1">×</button>
    </div>
  );
}