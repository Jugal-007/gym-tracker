import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Session } from "./types";
import { normalizeName } from "./records";

interface VolumePieChartProps {
  sessions: Session[];
}

export function VolumePieChart({ sessions }: VolumePieChartProps) {
  const data = useMemo(() => {
    const volumes = new Map<string, number>();
    const originalNames = new Map<string, string>(); // Keep original casing
    
    // Calculate total volume per exercise
    for (const session of sessions) {
      for (const exercise of session.exercises) {
        const key = normalizeName(exercise.name);
        const volume = exercise.sets.reduce((sum, set) => (set.completed ? sum + set.weight * set.reps : sum), 0);
        
        if (volume > 0) {
          volumes.set(key, (volumes.get(key) || 0) + volume);
          if (!originalNames.has(key)) {
            originalNames.set(key, exercise.name.trim());
          }
        }
      }
    }
    
    // Sort by volume and take top N, group rest into "Other"
    const sorted = Array.from(volumes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({
        name: originalNames.get(key) || key,
        value
      }));
      
    if (sorted.length <= 6) {
      return sorted;
    }
    
    const top = sorted.slice(0, 5);
    const otherVolume = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
    
    return [...top, { name: "Other", value: otherVolume }];
  }, [sessions]);

  // Premium color palette for the pie chart
  const COLORS = [
    "hsl(var(--primary))",
    "hsl(215, 90%, 65%)",
    "hsl(280, 85%, 65%)",
    "hsl(340, 85%, 65%)",
    "hsl(45, 95%, 60%)",
    "hsl(var(--muted-foreground))"
  ];

  if (data.length === 0) return null;

  return (
    <div className="animate-slide-up rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Volume Distribution
        </h3>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0];
                  if (!data) return null;
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium text-foreground">{data.name}</p>
                      <p className="font-mono text-muted-foreground">
                        {data.value?.toLocaleString()} kg
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1.5 overflow-hidden">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <div 
                  className="h-2.5 w-2.5 shrink-0 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate font-medium text-foreground">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
