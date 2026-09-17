import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Session, Template } from "./types";
import { useWeightUnit } from "@/hooks/useWeightUnit";

interface VolumePieChartProps {
  sessions: Session[];
  templates?: Template[];
}

export function VolumePieChart({ sessions, templates = [] }: VolumePieChartProps) {
  const { format: fmtWeight } = useWeightUnit();
  const data = useMemo(() => {
    const hasRoutines = templates.length > 0;

    if (hasRoutines) {
      // Group volume by routine (templateName on session)
      const volumes = new Map<string, number>();

      for (const session of sessions) {
        const routineName = session.templateName ?? "Ad-hoc";
        const volume = session.exercises.reduce(
          (sum, ex) =>
            sum + ex.sets.reduce((s, set) => (set.completed ? s + set.weight * set.reps : s), 0),
          0,
        );
        if (volume > 0) {
          volumes.set(routineName, (volumes.get(routineName) || 0) + volume);
        }
      }

      return Array.from(volumes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));
    }

    // Fallback: group by exercise name
    const volumes = new Map<string, number>();
    const originalNames = new Map<string, string>();

    for (const session of sessions) {
      for (const exercise of session.exercises) {
        const key = exercise.name.toLowerCase().trim();
        const volume = exercise.sets.reduce(
          (sum, set) => (set.completed ? sum + set.weight * set.reps : sum),
          0,
        );
        if (volume > 0) {
          volumes.set(key, (volumes.get(key) || 0) + volume);
          if (!originalNames.has(key)) originalNames.set(key, exercise.name.trim());
        }
      }
    }

    const sorted = Array.from(volumes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ name: originalNames.get(key) || key, value }));

    if (sorted.length <= 6) return sorted;
    const top = sorted.slice(0, 5);
    const otherVolume = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
    return [...top, { name: "Other", value: otherVolume }];
  }, [sessions, templates]);

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(215, 90%, 65%)",
    "hsl(280, 85%, 65%)",
    "hsl(340, 85%, 65%)",
    "hsl(45, 95%, 60%)",
    "hsl(160, 70%, 55%)",
    "hsl(var(--muted-foreground))",
  ];

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="animate-slide-up rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Volume Distribution
        </h3>
        {templates.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            By routine
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                style={{ outline: "none" }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: "none" }} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  if (!d) return null;
                  const pct = total > 0 ? Math.round(((d.value as number) / total) * 100) : 0;
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium text-foreground">{d.name}</p>
                      <p className="font-mono text-muted-foreground">
                        {fmtWeight(d.value as number)} · {pct}%
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2 overflow-hidden">
          {data.map((item, index) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate font-medium text-foreground">{item.name}</span>
                </div>
                <span className="shrink-0 font-mono font-bold text-muted-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
