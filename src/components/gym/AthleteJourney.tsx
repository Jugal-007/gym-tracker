import { Link } from "@tanstack/react-router";
import { Award, ChevronRight, Flame, Lock, Target } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { computeGamification } from "@/lib/gamification";
import { computeSessionVolume, loadWeeklyGoal } from "./storage";
import type { Session } from "./types";

export function AthleteJourney({
  sessions,
  compact = false,
}: {
  sessions: Session[];
  compact?: boolean;
}) {
  const { xp, currentStreak, longestStreak, achievements } = useMemo(
    () => computeGamification(sessions),
    [sessions],
  );
  const totalVolume = sessions.reduce((sum, session) => sum + computeSessionVolume(session), 0);
  const goal = loadWeeklyGoal();
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  const weeklySessions = sessions.filter(
    (session) => session.endedAt && session.startedAt >= start.getTime(),
  ).length;
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/25 bg-[linear-gradient(135deg,oklch(0.2_0.06_266),oklch(0.25_0.1_280)_55%,oklch(0.19_0.04_255))] p-5 text-white">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-fuchsia-400/35 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-300/15 text-amber-300 ring-1 ring-white/20">
            <Flame className="h-8 w-8" fill="currentColor" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100/70">
              Athlete level
            </p>
            <h2 className="mt-1 text-3xl font-extrabold">Level {xp.level}</h2>
            <p className="text-sm text-blue-100/80">
              {totalVolume.toLocaleString()} total volume logged
            </p>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="mb-2 flex justify-between text-xs font-semibold text-blue-100">
            <span>{xp.totalXP.toLocaleString()} XP</span>
            <span>{xp.nextLevelXP.toLocaleString()} XP</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-300 to-fuchsia-300"
              style={{ width: `${xp.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-blue-100/75">
            {Math.max(0, xp.nextLevelXP - xp.totalXP).toLocaleString()} XP to Level {xp.level + 1}
          </p>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Metric
          icon={<Flame className="h-5 w-5" />}
          label="Current streak"
          value={`${currentStreak} day${currentStreak === 1 ? "" : "s"}`}
          tone="text-orange-500 bg-orange-500/10"
        />
        <Metric
          icon={<Target className="h-5 w-5" />}
          label="Longest streak"
          value={`${longestStreak} day${longestStreak === 1 ? "" : "s"}`}
          tone="text-emerald-500 bg-emerald-500/10"
        />
      </div>
      {!compact && (
        <>
          <section className="rounded-[1.5rem] border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Weekly consistency
                </p>
                <p className="mt-1 text-lg font-extrabold text-foreground">
                  {weeklySessions} of {goal} workouts
                </p>
              </div>
              <span className="text-sm font-bold text-primary">
                {Math.min(100, Math.round((weeklySessions / goal) * 100))}%
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (weeklySessions / goal) * 100)}%` }}
              />
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Achievements</h3>
              <span className="text-xs font-semibold text-muted-foreground">
                {unlocked.length}/{achievements.length} earned
              </span>
            </div>
            <div className="space-y-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl ${achievement.unlocked ? "bg-amber-400/15 text-amber-500" : "bg-muted text-muted-foreground"}`}
                  >
                    {achievement.unlocked ? (
                      <Award className="h-5 w-5" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">
                      {achievement.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {achievement.description}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}{" "}
      {compact && (
        <Link
          to="/journey"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-bold text-foreground"
        >
          View full Athlete Journey <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-border bg-card p-4">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>{icon}</span>
      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-foreground">{value}</p>
    </div>
  );
}
