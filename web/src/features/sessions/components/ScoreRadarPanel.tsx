import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface ScoreRadarPanelProps {
  scores: {
    technical: number;
    communication: number;
    confidence: number;
    structure: number;
    relevance: number;
  };
}

export function ScoreRadarPanel({ scores }: ScoreRadarPanelProps) {
  const chartData = [
    { subject: 'Technical Accuracy', score: scores.technical || 0, fullMark: 100 },
    { subject: 'Communication', score: scores.communication || 0, fullMark: 100 },
    { subject: 'Confidence & Gaze', score: scores.confidence || 0, fullMark: 100 },
    { subject: 'Structure', score: scores.structure || 0, fullMark: 100 },
    { subject: 'Relevance', score: scores.relevance || 0, fullMark: 100 },
  ];

  return (
    <div className="p-6 bg-zinc-950/60 border border-zinc-850 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)] rounded-xl space-y-6 text-left">
      <div>
        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Dimension Analysis</h3>
        <p className="text-[10px] text-text-muted uppercase font-mono mt-0.5">5-Factor Performance Rubric</p>
      </div>

      <div className="h-64 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#27272A" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'IBM Plex Mono' }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: '#71717A', fontSize: 8 }}
              axisLine={false}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#e4e4e7"
              fill="#e4e4e7"
              fillOpacity={0.12}
              isAnimationActive={true}
              animationDuration={800}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#09090b',
                borderColor: '#27272a',
                color: '#f4f4f5',
                fontSize: '11px',
                fontFamily: 'IBM Plex Mono, monospace',
                borderRadius: '12px'
              }}
              itemStyle={{ color: '#fafafa' }}
              labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend below: each axis + score value + colored dot */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-zinc-800/50">
        {chartData.map((d, idx) => (
          <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-850/60 hover:bg-zinc-900/40 transition-colors duration-150 shadow-sm min-h-[52px]">
            <span className="size-2 rounded-full bg-zinc-400 shrink-0 mt-1.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-mono text-text-muted block leading-tight whitespace-normal break-words" title={d.subject}>
                {d.subject}
              </span>
              <span className="text-[11px] font-mono font-bold text-text-prim block mt-1">
                {Math.round(d.score)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}