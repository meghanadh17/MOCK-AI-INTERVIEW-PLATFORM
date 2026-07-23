import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProgressDataPoint {
  date: string;
  avg_score: number;
  technical: number;
  communication: number;
  confidence: number;
  structure: number;
  relevance: number;
}

interface ProgressLineChartProps {
  data?: ProgressDataPoint[];
}

type RangeType = '1W' | '1M' | '3M' | 'All';

export function ProgressLineChart({ data = [] }: ProgressLineChartProps) {
  const [range, setRange] = useState<RangeType>('1M');
  const [selectedMetric, setSelectedMetric] = useState<string>('avg_score');

  // Filter data based on selected range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort chronologically first
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const now = new Date();
    let cutoff = new Date();
    
    switch (range) {
      case '1W':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoff.setDate(now.getDate() - 30);
        break;
      case '3M':
        cutoff.setDate(now.getDate() - 90);
        break;
      case 'All':
        return sorted;
    }

    return sorted.filter(item => new Date(item.date).getTime() >= cutoff.getTime());
  }, [data, range]);

  // Metric details configuration
  const metricConfig = useMemo(() => {
    const configs: Record<string, { label: string; color: string }> = {
      avg_score: { label: 'Overall Score', color: '#6366f1' },
      technical: { label: 'Technical Accuracy', color: '#4f46e5' },
      communication: { label: 'Communication Clarity', color: '#f97316' },
      confidence: { label: 'Confidence & Gaze', color: '#10b981' },
      structure: { label: 'Structure & Cohesion', color: '#ec4899' },
      relevance: { label: 'Relevance & Context', color: '#eab308' },
    };
    return configs[selectedMetric] || configs.avg_score;
  }, [selectedMetric]);

  // Format date for chart ticks
  const formatXAxis = (tickItem: string) => {
    try {
      const d = new Date(tickItem);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return tickItem;
    }
  };

  // Custom Glass Card Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ProgressDataPoint;
      const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      return (
        <div className="bg-zinc-950/80 border border-zinc-800 backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl space-y-2 text-left min-w-[170px] select-none">
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-zinc-800/80">
            <span className="text-[10px] text-text-muted font-bold tracking-wide">{formattedDate}</span>
            <TrendingUp className="size-3" style={{ color: metricConfig.color }} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-sec font-medium">{metricConfig.label}</span>
              <span className="font-bold font-mono" style={{ color: metricConfig.color }}>
                {Math.round((item as any)[selectedMetric] ?? item.avg_score)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5 text-[9px] text-text-muted font-mono border-t border-zinc-900/60 mt-1">
              {selectedMetric !== 'avg_score' && <div>Overall: {Math.round(item.avg_score)}%</div>}
              {selectedMetric !== 'technical' && <div>Tech: {Math.round(item.technical)}%</div>}
              {selectedMetric !== 'communication' && <div>Comm: {Math.round(item.communication)}%</div>}
              {selectedMetric !== 'confidence' && <div>Conf: {Math.round(item.confidence)}%</div>}
              {selectedMetric !== 'structure' && <div>Struct: {Math.round(item.structure)}%</div>}
              {selectedMetric !== 'relevance' && <div>Relev: {Math.round(item.relevance)}%</div>}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 bg-zinc-950/60 border border-zinc-850 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)] rounded-xl space-y-6 text-left">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300" style={{ color: metricConfig.color }}>
            {metricConfig.label} Timeline
          </h3>
          <p className="text-[10px] text-text-muted uppercase font-mono mt-0.5">Mock Evaluation History Graph</p>
        </div>

        <div className="flex flex-row items-center gap-3 self-stretch sm:self-auto flex-wrap w-full sm:w-auto">
          {/* Select Component for Metric Picker */}
          <div className="min-w-[140px] flex-1 sm:flex-none">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-full bg-zinc-950/80 border border-zinc-850 hover:bg-zinc-900/60 rounded-lg text-xs py-1.5 h-8 px-2.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)] transition-all">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl">
                <SelectItem value="avg_score" className="rounded-lg">Overall Score</SelectItem>
                <SelectItem value="technical" className="rounded-lg">Technical Accuracy</SelectItem>
                <SelectItem value="communication" className="rounded-lg">Communication Clarity</SelectItem>
                <SelectItem value="confidence" className="rounded-lg">Confidence & Gaze</SelectItem>
                <SelectItem value="structure" className="rounded-lg">Structure & Cohesion</SelectItem>
                <SelectItem value="relevance" className="rounded-lg">Relevance & Context</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Range Selector Chips */}
          <div className="flex items-center gap-1 p-0.5 bg-zinc-950/60 border border-zinc-850 rounded-lg">
            {(['1W', '1M', '3M', 'All'] as RangeType[]).map((r) => {
              const isActive = range === r;
              return (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 border border-zinc-800 shadow-[2px_2px_6px_rgba(0,0,0,0.4)]'
                      : 'text-text-muted hover:text-text-prim'
                  }`}
                  style={isActive ? { color: metricConfig.color } : undefined}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="h-64 w-full">
        {filteredData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2">
            <Calendar className="size-8 text-text-muted animate-pulse" />
            <p className="text-xs text-text-muted">No timeline data available for this range.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.12}/>
                  <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis} 
                tick={{ fill: '#71717A', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[40, 100]}
                tick={{ fill: '#71717A', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey={selectedMetric} 
                stroke={metricConfig.color} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                isAnimationActive={true}
                animationDuration={600}
                dot={{ stroke: metricConfig.color, strokeWidth: 1.5, r: 3, fill: '#09090b' }}
                activeDot={{ stroke: metricConfig.color, strokeWidth: 2, r: 5, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}