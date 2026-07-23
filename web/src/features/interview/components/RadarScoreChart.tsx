import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface RadarScoreChartProps {
  scores: {
    technical_accuracy: number;
    communication: number;
    depth: number;
    structure: number;
    relevance: number;
  };
}

export function RadarScoreChart({ scores }: RadarScoreChartProps) {
  // Map scores (which are out of 100 on frontend/API representation or out of 10 scaled)
  const chartData = [
    { subject: 'Technical Accuracy', A: scores.technical_accuracy || 50, fullMark: 100 },
    { subject: 'Communication', A: scores.communication || 50, fullMark: 100 },
    { subject: 'Depth & Detail', A: scores.depth || 50, fullMark: 100 },
    { subject: 'Structure', A: scores.structure || 50, fullMark: 100 },
    { subject: 'Relevance', A: scores.relevance || 50, fullMark: 100 },
  ];

  return (
    <div className="p-6 bg-bg-surface border border-border-subtle shadow-[6px_6px_16px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.01)] rounded-xl space-y-6 text-left">
      <div>
        <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">Dimension Analysis</h3>
        <p className="text-[10px] text-text-disabled uppercase font-mono mt-0.5">5-Factor Performance Rubric</p>
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
              dataKey="A"
              stroke="#D4D4D8"
              fill="#71717A"
              fillOpacity={0.15}
              isAnimationActive={true}
              animationDuration={1000}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#09090b',
                borderColor: '#27272a',
                color: '#f4f4f5',
                fontSize: '11px',
                fontFamily: 'IBM Plex Mono, monospace',
                borderRadius: '8px'
              }}
              itemStyle={{ color: '#e4e4e7' }}
              labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Row */}
      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-border-subtle/50 text-center">
        {chartData.map((d, idx) => (
          <div key={idx} className="space-y-1">
            <span className="text-[9px] font-mono text-text-muted block truncate" title={d.subject}>
              {d.subject.split(' ')[0]}
            </span>
            <span className="text-xs font-mono font-bold text-text-prim block">
              {Math.round(d.A)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}