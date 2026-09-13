import { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfWeek } from "date-fns";
import { Activity, BarChart3, Flame, Trophy, Download, Upload } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  computeSessionSets,
  computeSessionVolume,
  loadWeeklyGoal,
  saveWeeklyGoal,
} from "./storage";
import { buildRecords, estimateOneRepMax, normalizeName } from "./records";
import { MuscleHeatmap } from "./MuscleHeatmap";
import { ConsistencyGrid } from "./ConsistencyGrid";
import { VolumePieChart } from "./VolumePieChart";
import type { Session } from "./types";

interface StatsPanelProps {
  sessions: Session[];
}

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/* ─── Count-up hook ─── */
function useCountUp(target: number, duration = 450): number {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) {
      setCurrent(target);
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        prevTarget.current = target;
      }
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return current;
}

export function StatsPanel({ sessions }: StatsPanelProps) {
  const [activeRoutine, setActiveRoutine] = useState<string>("all");
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [weeklyGoal, setWeeklyGoal] = useState<number>(loadWeeklyGoal());

  const routines = useMemo(() => {
    const names = new Set<string>();
    for (const s of sessions) {
      if (s.templateName) names.add(s.templateName);
    }
    return Array.from(names).sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (activeRoutine === "all") return sessions;
    return sessions.filter((s) => s.templateName === activeRoutine);
  }, [sessions, activeRoutine]);

  const handleGoalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const g = parseInt(e.target.value, 10);
    setWeeklyGoal(g);
    saveWeeklyGoal(g);
  };

  const records = useMemo(() => buildRecords(filteredSessions), [filteredSessions]);
  const recordList = useMemo(
    () => Object.values(records).sort((a, b) => b.bestE1rm - a.bestE1rm),
    [records],
  );

  const ordered = useMemo(
    () => [...filteredSessions].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()),
    [filteredSessions],
  );

  const volumeSeries = useMemo(
    () =>
      ordered.map((session) => ({
        label: format(new Date(session.startedAt), "MMM d"),
        volume: computeSessionVolume(session),
      })),
    [ordered],
  );

  const durationSeries = useMemo(() => {
    return ordered
      .map((session) => {
        const end = session.endedAt ? new Date(session.endedAt).getTime() : 0;
        const start = new Date(session.startedAt).getTime();
        const durationMs = end ? end - start : 0;
        const durationMins = Math.round(durationMs / 60000);
        return {
          label: format(start, "MMM d"),
          duration: durationMins,
        };
      })
      .filter((d) => d.duration > 0);
  }, [ordered]);

  const weekSeries = useMemo(() => {
    const buckets = new Map<number, number>();
    for (const session of ordered) {
      const week = startOfWeek(new Date(session.startedAt), { weekStartsOn: 1 }).getTime();
      buckets.set(week, (buckets.get(week) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-12)
      .map(([week, count]) => ({
        label: format(week, "MMM d"),
        sessions: count,
      }));
  }, [ordered]);

  const exerciseOptions = useMemo(() => recordList.map((record) => record.name), [recordList]);
  
  const mostFrequentExercise = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of filteredSessions) {
      for (const e of s.exercises) {
        counts.set(e.name, (counts.get(e.name) || 0) + e.sets.length);
      }
    }
    let max = 0;
    let mostFrequent = "";
    for (const [name, count] of counts.entries()) {
      if (count > max) {
        max = count;
        mostFrequent = name;
      }
    }
    return mostFrequent;
  }, [filteredSessions]);

  const activeExercise = selectedExercise || mostFrequentExercise || exerciseOptions[0] || "";

  const progressSeries = useMemo(() => {
    if (!activeExercise) return [];
    const key = normalizeName(activeExercise);
    const points: { label: string; e1rm: number; topWeight: number }[] = [];
    for (const session of ordered) {
      for (const exercise of session.exercises) {
        if (normalizeName(exercise.name) !== key) continue;
        let best = 0;
        let topWeight = 0;
        for (const set of exercise.sets) {
          best = Math.max(best, estimateOneRepMax(set.weight, set.reps));
          topWeight = Math.max(topWeight, set.weight);
        }
        if (best > 0) {
          points.push({
            label: format(new Date(session.startedAt), "MMM d"),
            e1rm: Math.round(best * 10) / 10,
            topWeight,
          });
        }
      }
    }
    return points;
  }, [ordered, activeExercise]);

  const totals = useMemo(() => {
    const totalVolume = filteredSessions.reduce((s, x) => s + computeSessionVolume(x), 0);
    const totalSets = filteredSessions.reduce((s, x) => s + computeSessionSets(x), 0);
    const weeks = new Set(
      filteredSessions.map((s) => startOfWeek(new Date(s.startedAt), { weekStartsOn: 1 }).getTime()),
    );
    const perWeek = weeks.size ? filteredSessions.length / weeks.size : 0;
    return {
      totalVolume,
      totalSets,
      sessionCount: filteredSessions.length,
      perWeek: Math.round(perWeek * 10) / 10,
    };
  }, [filteredSessions]);

  const streak = useMemo(() => {
    if (ordered.length === 0) return 0;
    
    const weekCounts = new Map<number, number>();
    for (const session of ordered) {
      const w = startOfWeek(new Date(session.startedAt), { weekStartsOn: 1 }).getTime();
      weekCounts.set(w, (weekCounts.get(w) || 0) + 1);
    }
    
    const sortedWeeks = Array.from(weekCounts.keys()).sort((a, b) => b - a);
    const currentWeek = startOfWeek(Date.now(), { weekStartsOn: 1 }).getTime();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    
    let currentStreak = 0;
    let expectedWeek = sortedWeeks[0];
    
    if (expectedWeek !== currentWeek && expectedWeek !== currentWeek - ONE_WEEK) {
      return 0;
    }
    
    let i = 0;
    const currentWeekCount = weekCounts.get(currentWeek) || 0;
    
    if (expectedWeek === currentWeek && currentWeekCount < weeklyGoal) {
      expectedWeek = currentWeek - ONE_WEEK;
      if (sortedWeeks[1] !== expectedWeek) {
        return 0;
      }
      i = 1;
    }
    
    while (i < sortedWeeks.length) {
      const w = sortedWeeks[i];
      if (w === expectedWeek) {
        const count = weekCounts.get(w) || 0;
        if (count >= weeklyGoal) {
          currentStreak++;
          expectedWeek -= ONE_WEEK;
          i++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return currentStreak;
  }, [ordered, weeklyGoal]);

  const currentWeek = startOfWeek(Date.now(), { weekStartsOn: 1 }).getTime();
  const currentWeekCount = useMemo(() => {
    let count = 0;
    for (const session of ordered) {
      const w = startOfWeek(new Date(session.startedAt), { weekStartsOn: 1 }).getTime();
      if (w === currentWeek) count++;
    }
    return count;
  }, [ordered, currentWeek]);

  const isGoalMet = currentWeekCount >= weeklyGoal;
  const progressPercent = Math.min(100, Math.round((currentWeekCount / weeklyGoal) * 100));

  // RPG Leveling Logic based on Volume
  const { totalVolume } = totals;
  const currentLevel = Math.floor(Math.sqrt(totalVolume / 2000)) + 1;
  const xpFloor = Math.pow(currentLevel - 1, 2) * 2000;
  const xpNext = Math.pow(currentLevel, 2) * 2000;
  const xpIntoLevel = totalVolume - xpFloor;
  const xpNeeded = xpNext - xpFloor;
  const levelProgress = totalVolume > 0 ? (xpIntoLevel / xpNeeded) * 100 : 0;

  if (sessions.length === 0) {
    return (
      <div className="animate-fade-in py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border animate-float">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground">No data yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Log a couple of sessions to unlock your stats.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-fade-in pb-8">
      {routines.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveRoutine("all")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              activeRoutine === "all"
                ? "bg-foreground text-background shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All Workouts
          </button>
          {routines.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRoutine(r)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                activeRoutine === r
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Full-width Streak Card (Only visible when viewing 'all' workouts) */}
        {activeRoutine === "all" && (
          <div className={`col-span-2 relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${streak > 0 ? "border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-600/5" : "border-border bg-card"}`}>
            
            {/* Background Glow */}
            {streak > 0 && (
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
            )}
            
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Flame className={`h-4 w-4 ${streak > 0 ? "text-orange-500 animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "text-muted-foreground"}`} />
                      Active Streak
                    </p>
                    <select
                      value={weeklyGoal}
                      onChange={handleGoalChange}
                      className="h-6 rounded border border-border bg-background px-1 text-[10px] text-muted-foreground outline-none transition-all focus:border-foreground"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <option key={num} value={num}>
                          Goal: {num} / wk
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {streak > 0 
                      ? <span>You've hit your goal for <strong className="text-orange-500">{streak} consecutive weeks</strong>!</span> 
                      : "Start your streak this week!"}
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black tracking-tighter ${streak > 0 ? "text-orange-500 drop-shadow-sm" : "text-muted-foreground"}`}>{streak}</span>
                  <span className="text-xs font-bold text-muted-foreground uppercase">wks</span>
                </div>
              </div>

              {/* Current Week Progress */}
              <div className="mt-5 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This Week</span>
                  <span className={`text-xs font-bold ${isGoalMet ? "text-primary" : "text-foreground"}`}>
                    {currentWeekCount} / {weeklyGoal} workouts
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/30 border border-border/50 shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isGoalMet ? "bg-primary" : "bg-foreground/50"}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                  {isGoalMet 
                    ? "Weekly goal crushed. Keep it up." 
                    : `${weeklyGoal - currentWeekCount} more workout${(weeklyGoal - currentWeekCount) > 1 ? 's' : ''} to ${streak > 0 ? 'extend your streak' : 'start your streak'}.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* RPG Level Card */}
        <div className="col-span-2 glass overflow-hidden rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Activity className="h-4 w-4" />
                Lifter Level
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                Total Volume: <strong className="font-mono">{totalVolume.toLocaleString()}</strong> kg
              </p>
            </div>
            <div className="flex items-baseline gap-1 bg-foreground text-background px-3 py-1 rounded-lg">
              <span className="text-xs font-bold uppercase tracking-widest">Lvl</span>
              <span className="text-2xl font-black tracking-tighter">{currentLevel}</span>
            </div>
          </div>
          
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Level Progress</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground font-mono">
                {xpIntoLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40 border border-border/50 shadow-inner">
              <div 
                className="h-full bg-foreground rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground text-right">
              Next level at {xpNext.toLocaleString()} kg
            </p>
          </div>
        </div>

        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Sessions"
          value={totals.sessionCount}
          delay={0}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Per week"
          value={totals.perWeek}
          isDecimal
          delay={60}
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label="Total sets"
          value={totals.totalSets}
          delay={120}
        />
      </div>

      <ConsistencyGrid sessions={filteredSessions} />
      
      <MuscleHeatmap sessions={filteredSessions} />
      
      <VolumePieChart sessions={filteredSessions} />

      <ChartCard title="Volume per session">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={volumeSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={44} />
            <Tooltip content={<MonoTooltip suffix=" kg" />} cursor={{ stroke: "var(--border)" }} />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "var(--foreground)" }}
              activeDot={{ r: 4 }}
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {durationSeries.length > 0 && (
        <ChartCard title="Workout Duration">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={durationSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} width={38} />
              <Tooltip
                content={<MonoTooltip suffix=" min" />}
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar
                dataKey="duration"
                fill="var(--foreground)"
                radius={[4, 4, 0, 0]}
                animationDuration={600}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard title="Weekly frequency">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} width={34} />
            <Tooltip
              content={<MonoTooltip suffix=" sessions" />}
              cursor={{ fill: "var(--muted)" }}
            />
            <Bar
              dataKey="sessions"
              fill="var(--foreground)"
              radius={[4, 4, 0, 0]}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {exerciseOptions.length > 0 && (
        <ChartCard
          title="Best performance over time"
          action={
            <select
              value={activeExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none transition-all focus:border-foreground"
            >
              {exerciseOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={progressSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={44} />
              <Tooltip
                content={<MonoTooltip suffix=" kg" />}
                cursor={{ stroke: "var(--border)" }}
              />
              <Line
                type="monotone"
                dataKey="e1rm"
                name="Est. 1RM"
                stroke="var(--foreground)"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "var(--foreground)" }}
                animationDuration={600}
              />
              <Line
                type="monotone"
                dataKey="topWeight"
                name="Top set"
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={progressSeries.length === 1 ? { r: 2.5, fill: "var(--muted-foreground)", strokeWidth: 0 } : false}
                activeDot={false}
                animationDuration={600}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Trophy className="h-4 w-4" />
          Personal records
        </h3>
        <ul className="divide-y divide-border">
          {recordList.map((record) => (
            <li key={record.name} className="flex items-center justify-between py-2.5">
              <span className="truncate pr-2 text-sm font-medium text-foreground">{record.name}</span>
              <span className="shrink-0 text-right text-xs text-muted-foreground">
                <span className="block font-mono text-sm text-foreground">
                  {record.bestWeight} kg × {record.bestWeightReps}
                </span>
                est. 1RM {Math.round(record.bestE1rm)} kg
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Data Management
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Export your workout history and templates as a JSON file for safekeeping.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              const sessions = localStorage.getItem("gym-tracker-sessions-v1");
              const templates = localStorage.getItem("gym-tracker-templates-v1");
              const data = {
                sessions: sessions ? JSON.parse(sessions) : [],
                templates: templates ? JSON.parse(templates) : []
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `gym-tracker-export-${format(new Date(), "yyyy-MM-dd")}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-95"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
          
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "application/json";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                  try {
                    const data = JSON.parse(e.target?.result as string);
                    if (data.sessions && Array.isArray(data.sessions)) {
                      localStorage.setItem("gym-tracker-sessions-v1", JSON.stringify(data.sessions));
                    }
                    if (data.templates && Array.isArray(data.templates)) {
                      localStorage.setItem("gym-tracker-templates-v1", JSON.stringify(data.templates));
                    }
                    window.location.reload();
                  } catch (err) {
                    alert("Invalid backup file");
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 text-primary py-3 text-sm font-semibold transition-all hover:bg-primary/10 active:scale-95 mt-2"
          >
            <Upload className="h-4 w-4" />
            Import Data
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  isDecimal,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  isDecimal?: boolean;
  delay?: number;
}) {
  const animatedValue = useCountUp(Math.round(value), 450);
  const displayValue = isDecimal ? value.toFixed(1) : animatedValue.toLocaleString();

  return (
    <div className="glass rounded-xl p-4 transition-all duration-300 hover:-translate-y-0.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-mono text-xl font-bold tracking-tight text-foreground">
        {displayValue}
        {suffix ?? ""}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-slide-up glass rounded-xl p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function MonoTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string }>;
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="animate-scale-in rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-mono text-muted-foreground">
          {entry.name ? `${entry.name}: ` : ""}
          {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}
