import { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { Session, Exercise } from "./types";
import { normalizeName } from "./records";

interface MuscleHeatmapProps {
  sessions: Session[];
}

const MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

// Heuristic mapping of exercise name keywords to muscle groups
function determineMuscleGroup(exerciseName: string): string {
  const name = normalizeName(exerciseName);
  
  // Legs
  if (name.includes("squat") || name.includes("leg press") || name.includes("lunge") || name.includes("deadlift") || name.includes("rdl") || name.includes("calf") || name.includes("extension") && name.includes("leg")) return "Legs";
  
  // Back
  if (name.includes("row") || name.includes("pull") || name.includes("lat") || name.includes("chin") || name.includes("shrug")) return "Back";
  
  // Chest
  if (name.includes("bench") || name.includes("pec") || name.includes("fly") || name.includes("pushup")) return "Chest";
  
  // Shoulders
  if ((name.includes("press") && (name.includes("overhead") || name.includes("shoulder") || name.includes("military"))) || name.includes("lateral") || name.includes("delt") || name.includes("raise")) return "Shoulders";
  if (name.includes("press")) return "Chest"; // generic press fallback
  
  // Arms
  if (name.includes("curl") || name.includes("tricep") || name.includes("pushdown") || name.includes("skullcrusher") || name.includes("dip") || name.includes("extension")) return "Arms";
  
  // Core
  if (name.includes("crunch") || name.includes("plank") || name.includes("situp") || name.includes("ab") || name.includes("raise") && name.includes("leg")) return "Core";
  
  return "Other";
}

export function MuscleHeatmap({ sessions }: MuscleHeatmapProps) {
  const data = useMemo(() => {
    const tally: Record<string, number> = {};
    MUSCLE_GROUPS.forEach(m => tally[m] = 0);
    tally["Other"] = 0;

    for (const session of sessions) {
      for (const exercise of session.exercises) {
        const group = determineMuscleGroup(exercise.name);
        // Tally sets as a measure of volume/focus
        tally[group] = (tally[group] || 0) + exercise.sets.length;
      }
    }

    return MUSCLE_GROUPS.map(group => ({
      subject: group,
      sets: tally[group] || 0,
    }));
  }, [sessions]);

  // Find max for scaling
  const maxSets = Math.max(...data.map(d => d.sets), 1);

  if (maxSets <= 1 && data.every(d => d.sets === 0)) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-border bg-card/30 text-sm text-muted-foreground">
        Not enough data for heatmap.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-in">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Muscle Focus
        </h3>
        <p className="text-xs text-muted-foreground">Total sets per muscle group</p>
      </div>
      
      <div className="h-[240px] w-full" style={{ WebkitTapHighlightColor: "transparent" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, maxSets]} 
              tick={false} 
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0];
                if (!p) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-foreground">{p.payload.subject}</p>
                    <p className="font-mono text-muted-foreground">
                      {p.value} sets
                    </p>
                  </div>
                );
              }}
              cursor={false}
            />
            <Radar
              name="Sets"
              dataKey="sets"
              stroke="var(--foreground)"
              fill="var(--foreground)"
              fillOpacity={0.2}
              strokeWidth={2}
              animationDuration={800}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
