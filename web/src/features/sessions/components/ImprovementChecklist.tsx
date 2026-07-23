import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, ListTodo } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImprovementChecklistProps {
  sessionId: string;
  improvements: {
    weaknesses: string[];
    study_plan_30d: Record<string, string[]>;
  };
}

interface ChecklistItem {
  id: string;
  text: string;
  category: 'weakness' | 'plan';
  week?: string;
  priority: 'high' | 'medium' | 'low';
}

export function ImprovementChecklist({ sessionId, improvements }: ImprovementChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checkedStates, setCheckedStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const list: ChecklistItem[] = [];

    // Add weaknesses (High Priority)
    if (improvements.weaknesses && improvements.weaknesses.length > 0) {
      improvements.weaknesses.forEach((weakness, idx) => {
        list.push({
          id: `weakness-${idx}-${weakness}`,
          text: weakness,
          category: 'weakness',
          priority: 'high',
        });
      });
    }

    // Add study plan tasks (Dynamic Priorities based on weeks)
    if (improvements.study_plan_30d) {
      Object.entries(improvements.study_plan_30d).forEach(([week, tasks]) => {
        const priority = week.includes('1') ? 'high' : week.includes('2') ? 'medium' : 'low';
        tasks.forEach((task, idx) => {
          list.push({
            id: `plan-${week}-${idx}-${task}`,
            text: task,
            category: 'plan',
            week: week,
            priority: priority,
          });
        });
      });
    }

    // Fallback if empty
    if (list.length === 0) {
      list.push({
        id: 'fallback-1',
        text: 'Improve communication structure (use STAR method)',
        category: 'weakness',
        priority: 'high',
      });
      list.push({
        id: 'fallback-2',
        text: 'Review core algorithm complexity',
        category: 'plan',
        week: 'Week 1',
        priority: 'medium',
      });
    }

    setItems(list);

    // Load states from localStorage
    const saved = localStorage.getItem(`mocrai_checklist_${sessionId}`);
    if (saved) {
      try {
        setCheckedStates(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      setCheckedStates({});
    }
  }, [sessionId, improvements]);

  const handleCheckedChange = (id: string, checked: boolean) => {
    const nextStates = { ...checkedStates, [id]: checked };
    setCheckedStates(nextStates);
    localStorage.setItem(`mocrai_checklist_${sessionId}`, JSON.stringify(nextStates));
  };

  const total = items.length;
  const completed = items.filter((item) => checkedStates[item.id]).length;
  const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getPriorityBadgeClass = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-950/40 border-red-500/20 text-red-400';
      case 'medium':
        return 'bg-zinc-800 border-zinc-750 text-zinc-300';
      case 'low':
        return 'bg-blue-950/40 border-blue-500/20 text-blue-400';
    }
  };

  return (
    <div className="p-6 bg-zinc-950/60 border border-zinc-850 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)] rounded-xl space-y-6 text-left">
      {/* Header and Progress Indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="size-5 text-zinc-400" />
            <h3 className="text-sm font-bold text-text-prim">Personalized Improvement Checklist</h3>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-700">
            {completionPercentage}% Complete
          </span>
        </div>

        {/* High-contrast Progress Bar */}
        <div className="w-full h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-zinc-100 to-zinc-450 rounded-full"
          />
        </div>
      </div>

      {/* Ordered List of Checklist Items */}
      <div className="space-y-2.5">
        {items.map((item, index) => {
          const isChecked = !!checkedStates[item.id];
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3.5 p-3.5 bg-zinc-950/30 border border-zinc-850/60 hover:bg-zinc-900/40 transition-all rounded-xl duration-200 select-none ${
                isChecked ? 'opacity-50 bg-zinc-900/10' : 'shadow-sm'
              }`}
            >
              {/* Checkbox */}
              <div className="pt-0.5">
                <Checkbox
                  id={item.id}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleCheckedChange(item.id, !!checked)}
                  className="rounded"
                />
              </div>

              {/* Topic text & labels */}
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={item.id}
                  className={`text-xs font-medium cursor-pointer block leading-normal transition-all duration-200 ${
                    isChecked ? 'line-through text-text-muted' : 'text-text-prim'
                  }`}
                >
                  <span className="font-mono text-text-muted mr-1.5 select-none">{index + 1}.</span>
                  {item.text}
                </label>
                {item.week && (
                  <span className="inline-block text-[9px] font-mono text-text-muted uppercase tracking-wider mt-1.5 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-lg">
                    {item.week}
                  </span>
                )}
              </div>

              {/* Priority Chip */}
              <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-lg border shrink-0 tracking-widest ${getPriorityBadgeClass(item.priority)}`}>
                {item.priority}
              </span>
            </div>
          );
        })}
      </div>

      {completionPercentage === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3 text-zinc-100 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]"
        >
          <CheckCircle2 className="size-5 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Fantastic Job!</p>
            <p className="text-[10px] text-text-muted mt-0.5">You have completed all items in your study plan for this session.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}