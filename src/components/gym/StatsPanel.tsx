import { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfWeek } from "date-fns";
import { Activity, BarChart3, Flame, Trophy } from "lucide-react";
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
import { computeSessionSets, computeSessionVolume } from "./storage";
import { buildRecords, estimateOneRepMax, normalizeName } from "./records";
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
function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;

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
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  const records = useMemo(() => buildRecords(sessions), [sessions]);
  const recordList = useMemo(
    () => Object.values(records).sort((a, b) => b.bestE1rm - a.bestE1rm),
    [records]
  );

  const ordered = useMemo(
    () => [...sessions].sort((a, b) => a.startedAt - b.startedAt),
    [sessions]
  );

  const volumeSeries = useMemo(
    () =>
      ordered.map((session) => ({
        label: format(session.startedAt, "MMM d"),
        volume: computeSessionVolume(session),
      })),
    [ordered]
  );

  const weekSeries = useMemo(() => {
    const buckets = new Map<number, number>();
    for (const session of ordered) {
      const week = startOfWeek(session.startedAt, { weekStartsOn: 1 }).getTime();
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

  const exerciseOptions = useMemo(
    () => recordList.map((record) => record.name),
    [recordList]
  );
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
            label: format(session.startedAt, "MMM d"),
            e1rm: Math.round(best * 10) / 10,
            topWeight,
          });
        }
      }
    }
    return points;
  }, [ordered, activeExercise]);

  const totals = useMemo(() => {
    const totalVolume = sessions.reduce((s, x) => s + computeSessionVolume(x), 0);
    const totalSets = sessions.reduce((s, x) => s + computeSessionSets(x), 0);
    const weeks = new Set(
      sessions.map((s) =>
        startOfWeek(s.startedAt, { weekStartsOn: 1 }).getTime()
      )
    );
    const perWeek = weeks.size ? sessions.length / weeks.size : 0;
    return {
      totalVolume,
      totalSets,
      sessionCount: sessions.length,
      perWeek: Math.round(perWeek * 10) / 10,
    };
  }, [sessions]);

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
    <div className="mx-auto max-w-xl space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
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

      <ChartCard title="Volume per session">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={volumeSeries} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
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

      <ChartCard title="Weekly frequency">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekSeries} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} width={34} />
            <Tooltip content={<MonoTooltip suffix=" sessions" />} cursor={{ fill: "var(--muted)" }} />
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
            <LineChart data={progressSeries} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={44} />
              <Tooltip content={<MonoTooltip suffix=" kg" />} cursor={{ stroke: "var(--border)" }} />
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
                dot={false}
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
          {recordList.map((record, index) => (
            <li
              key={record.name}
              className="animate-slide-up flex items-center justify-between py-2.5"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <span className="text-sm font-medium text-foreground">{record.name}</span>
              <span className="text-right text-xs text-muted-foreground">
                <span className="block font-mono text-sm text-foreground">
                  {record.bestWeight} kg × {record.bestWeightReps}
                </span>
                est. 1RM {Math.round(record.bestE1rm)} kg
              </span>
            </li>
          ))}
        </ul>
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
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  isDecimal?: boolean;
  delay: number;
}) {
  const animatedValue = useCountUp(Math.round(value), 800);
  const displayValue = isDecimal
    ? value.toFixed(1)
    : animatedValue.toLocaleString();

  return (
    <div
      className="animate-slide-up rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold text-foreground">
        {displayValue}{suffix ?? ""}
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
          {typeof entry.value === "number"
            ? entry.value.toLocaleString()
            : entry.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}
