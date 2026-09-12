import { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfWeek } from "date-fns";
import { Activity, BarChart3, Flame, Trophy, Download } from "lucide-react";
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
  const activeExercise = selectedExercise || exerciseOptions[0] || "";

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
        <div className="col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
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
            <p className="mt-1 text-sm text-muted-foreground">
              You've hit your goal for <strong className="text-foreground">{streak} consecutive weeks</strong>!
            </p>
          </div>
          <p className="font-mono text-3xl font-bold text-foreground">
            {streak}<span className="text-xl text-muted-foreground">w</span>
          </p>
        </div>
        )}

        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Total volume"
          value={totals.totalVolume}
          suffix=" kg"
          delay={0}
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Sessions"
          value={totals.sessionCount}
          delay={60}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Per week"
          value={totals.perWeek}
          isDecimal
          delay={120}
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label="Total sets"
          value={totals.totalSets}
          delay={180}
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
              const now = Date.now();
              const day = 24 * 60 * 60 * 1000;
              const dummySessions = [
                {
                  id: "s1",
                  startedAt: now - 5 * day,
                  endedAt: now - 5 * day + 3600000,
                  exercises: [
                    {
                      id: "e1",
                      name: "Bench Press",
                      sets: [
                        { id: "set1", reps: 8, weight: 60, completed: true },
                        { id: "set2", reps: 8, weight: 60, completed: true },
                        { id: "set3", reps: 6, weight: 65, completed: true }
                      ]
                    },
                    {
                      id: "e2",
                      name: "Incline Dumbbell Press",
                      sets: [
                        { id: "set4", reps: 10, weight: 25, completed: true },
                        { id: "set5", reps: 10, weight: 25, completed: true }
                      ]
                    },
                    {
                      id: "e3",
                      name: "Tricep Pushdown",
                      sets: [
                        { id: "set6", reps: 12, weight: 20, completed: true },
                        { id: "set7", reps: 12, weight: 20, completed: true }
                      ]
                    }
                  ]
                },
                {
                  id: "s2",
                  startedAt: now - 3 * day,
                  endedAt: now - 3 * day + 3600000,
                  exercises: [
                    {
                      id: "e4",
                      name: "Squat",
                      sets: [
                        { id: "set8", reps: 5, weight: 100, completed: true },
                        { id: "set9", reps: 5, weight: 100, completed: true },
                        { id: "set10", reps: 5, weight: 105, completed: true, pr: "weight" }
                      ]
                    },
                    {
                      id: "e5",
                      name: "Leg Extension",
                      sets: [
                        { id: "set11", reps: 15, weight: 50, completed: true },
                        { id: "set12", reps: 15, weight: 50, completed: true }
                      ]
                    }
                  ]
                },
                {
                  id: "s3",
                  startedAt: now - 1 * day,
                  endedAt: now - 1 * day + 3600000,
                  exercises: [
                    {
                      id: "e6",
                      name: "Pull Up",
                      sets: [
                        { id: "set13", reps: 8, weight: 0, completed: true },
                        { id: "set14", reps: 8, weight: 0, completed: true }
                      ]
                    },
                    {
                      id: "e7",
                      name: "Barbell Row",
                      sets: [
                        { id: "set15", reps: 10, weight: 60, completed: true },
                        { id: "set16", reps: 10, weight: 60, completed: true }
                      ]
                    },
                    {
                      id: "e8",
                      name: "Bicep Curl",
                      sets: [
                        { id: "set17", reps: 12, weight: 15, completed: true },
                        { id: "set18", reps: 12, weight: 15, completed: true }
                      ]
                    }
                  ]
                }
              ];
              const existing = JSON.parse(localStorage.getItem("gym-tracker-sessions-v1") || "[]");
              localStorage.setItem("gym-tracker-sessions-v1", JSON.stringify([...existing, ...dummySessions]));
              window.location.reload();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 text-primary py-3 text-sm font-semibold transition-all hover:bg-primary/10 active:scale-95 mt-2"
          >
            Inject Dummy Data (Temp)
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
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold text-foreground">
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
    <div className="animate-slide-up rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
