import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

export interface PostureDataPoint {
  timestamp_sec: number;
  score: number;
  feedback?: string;
}

interface PostureTimelineProps {
  data: PostureDataPoint[];
}

export function PostureTimeline({ data }: PostureTimelineProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-72 flex items-center justify-center bg-zinc-900/40 border border-border-def rounded-xl text-text-muted text-xs">
        No posture timeline data available for this session.
      </div>
    );
  }

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as PostureDataPoint;
      return (
        <div className="p-3 bg-zinc-950 border border-border-strong rounded-lg shadow-xl font-mono text-[10px] space-y-1">
          <p className="text-text-muted font-bold">Time: {dataPoint.timestamp_sec}s</p>
          <p className="text-emerald-400 font-bold">Score: {dataPoint.score.toFixed(0)}%</p>
          {dataPoint.feedback && (
            <p className="text-text-sec max-w-xs leading-normal border-t border-border-subtle/40 pt-1.5 mt-1.5">
              {dataPoint.feedback}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center select-none">
        <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider">
          Posture Score Timeline
        </h3>
        <span className="text-[10px] text-text-muted font-mono">X: Time (s) · Y: Accuracy (%)</span>
      </div>

      <div className="h-72 w-full bg-zinc-950/40 border border-border-def rounded-xl p-4 shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="postureGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="timestamp_sec" 
              stroke="#71717a" 
              tick={{ fontSize: 9, fontFamily: 'monospace' }} 
              tickLine={false}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#71717a" 
              tick={{ fontSize: 9, fontFamily: 'monospace' }} 
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Target lines */}
            <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Optimal (70%)', position: 'top', fill: '#10b981', fontSize: 8, fontFamily: 'monospace' }} />
            <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Weak (50%)', position: 'top', fill: '#ef4444', fontSize: 8, fontFamily: 'monospace' }} />

            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="#10b981" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#postureGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}