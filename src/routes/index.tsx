import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Dumbbell, Sparkles, Trophy } from "lucide-react";
import { useMemo } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildRecords } from "@/components/gym/records";
import { computeSessionVolume, loadWeeklyGoal } from "@/components/gym/storage";
import { useGym } from "@/hooks/useGymStore";
import { useWeightUnit } from "@/hooks/useWeightUnit";

export const Route = createFileRoute("/")({ component: Home });

function Ring({
  value,
  label,
  detail,
  color,
}: {
  value: number;
  label: string;
  detail: string;
  color: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div className="relative grid h-[76px] w-[76px] place-items-center rounded-full bg-card shadow-sm">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="264"
            strokeDashoffset={264 * (1 - clamped / 100)}
            className={color}
          />
        </svg>
        <span className="relative text-sm font-extrabold tabular-nums text-foreground">
          {detail}
        </span>
      </div>
      <span className="text-center text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function Home() {
  const { user } = useAuth();
  const { sessions, templates, startSession, startFromTemplate, activeSession } = useGym();
  const { format } = useWeightUnit();
  const navigate = useNavigate();
  const weeklyGoal = loadWeeklyGoal();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const completed = sessions.filter(
    (session) =>
      session.endedAt &&
      session.exercises.some((exercise) => exercise.sets.some((set) => set.completed)),
  );
  const thisWeek = completed.filter((session) => session.startedAt >= weekStart.getTime());
  const weeklyVolume = thisWeek.reduce(
    (total, session) => total + computeSessionVolume(session),
    0,
  );
  const records = useMemo(() => buildRecords(completed), [completed]);
  const latestRecord = Object.values(records).sort((a, b) => b.bestWeight - a.bestWeight)[0];
  const suggestedTemplate = templates[0];
  const name = user?.user_metadata?.["full_name"] || user?.email?.split("@")[0] || "Athlete";

  function beginEmpty() {
    flushSync(() => startSession());
    navigate({ to: "/workout/active" });
  }
  function beginTemplate() {
    if (!suggestedTemplate) return beginEmpty();
    flushSync(() => startFromTemplate(suggestedTemplate));
    navigate({ to: "/workout/active" });
  }

  return (
    <div className="space-y-7 pb-5">
      <section className="flex items-start justify-between pt-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {now.getHours() < 12
              ? "Good morning"
              : now.getHours() < 18
                ? "Good afternoon"
                : "Good evening"}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">{name}</h1>
        </div>
        <Link
          to="/journey"
          className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-500 transition-transform active:scale-95"
          aria-label="Open Athlete Journey"
        >
          <Trophy className="h-5 w-5" />
        </Link>
      </section>
      <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[linear-gradient(135deg,oklch(0.18_0.05_265),oklch(0.26_0.09_275)_55%,oklch(0.21_0.035_260))] p-6 text-white shadow-[0_22px_45px_-28px_rgba(33,91,255,0.9)] dark:bg-[linear-gradient(135deg,oklch(0.21_0.07_270),oklch(0.27_0.11_275)_55%,oklch(0.17_0.04_258))]">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100/75">
            {activeSession ? "Workout in progress" : "Today’s workout"}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
            {activeSession?.templateName || suggestedTemplate?.name || "Build your session"}
          </h2>
          <p className="mt-2 text-sm text-blue-100/80">
            {activeSession
              ? `${activeSession.exercises.length} exercises in this session`
              : suggestedTemplate
                ? `${suggestedTemplate.exercises.length} exercises ready to go`
                : "Start with an exercise and make it yours."}
          </p>
          <button
            onClick={activeSession ? () => navigate({ to: "/workout/active" }) : beginTemplate}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-slate-900 transition-transform active:scale-[0.98]"
          >
            <Dumbbell className="h-4 w-4" />{" "}
            {activeSession
              ? "Resume workout"
              : suggestedTemplate
                ? "Start workout"
                : "Start empty workout"}
          </button>
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">This week</h2>
          <span className="text-xs font-semibold text-muted-foreground">
            Goal: {weeklyGoal} workouts
          </span>
        </div>
        <div className="flex rounded-[1.5rem] border border-border bg-card px-3 py-4 shadow-sm">
          <Ring
            value={(thisWeek.length / weeklyGoal) * 100}
            label="Workouts"
            detail={`${thisWeek.length}/${weeklyGoal}`}
            color="text-primary"
          />
          <Ring
            value={weeklyVolume ? 100 : 0}
            label="Volume"
            detail={weeklyVolume ? format(weeklyVolume).replace(/\s/g, "") : "—"}
            color="text-emerald-500"
          />
          <Ring
            value={completed.length ? Math.min(100, (thisWeek.length / completed.length) * 100) : 0}
            label="Consistency"
            detail={
              completed.length ? `${Math.round((thisWeek.length / completed.length) * 100)}%` : "—"
            }
            color="text-amber-500"
          />
        </div>
      </section>
      <Link
        to="/journey"
        className="flex items-center gap-4 rounded-[1.5rem] border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
      >
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">Athlete Journey</span>
          <span className="block truncate text-xs text-muted-foreground">
            Levels, earned milestones, and training streaks.
          </span>
        </span>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </Link>
      <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Personal best
        </p>
        {latestRecord ? (
          <>
            <p className="mt-2 text-xl font-extrabold text-foreground">{latestRecord.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(latestRecord.bestWeight)} × {latestRecord.bestWeightReps} · estimated 1RM{" "}
              {format(latestRecord.bestE1rm)}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-lg font-bold text-foreground">Your first record starts here.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish a workout to unlock strength history.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
