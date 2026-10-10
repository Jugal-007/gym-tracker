import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Dumbbell, Sparkles, Trophy, User as UserIcon, Clock, Activity, CalendarDays } from "lucide-react";
import { useMemo } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildRecords } from "@/components/gym/records";
import { computeSessionVolume, loadWeeklyGoal } from "@/components/gym/storage";
import { getSmartSuggestedTemplate } from "@/components/gym/templates";
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
  const suggestedTemplate = useMemo(() => getSmartSuggestedTemplate(templates, sessions), [templates, sessions]);
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
    <div className="space-y-8 pb-10">
      <section className="flex items-start justify-between pt-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            {now.getHours() < 12
              ? "Good morning,"
              : now.getHours() < 18
                ? "Good afternoon,"
                : "Good evening,"}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            {name} <span className="text-xl">ðŸ‘‹</span>
          </h1>
        </div>
        <Link
          to="/profile"
          className="h-12 w-12 rounded-full overflow-hidden border-2 border-border/50 bg-card flex items-center justify-center text-primary transition-transform active:scale-95"
          aria-label="Profile"
        >
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-6 w-6" />
          )}
        </Link>
      </section>

      {/* Today's Workout Card */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border/30 bg-card p-6 shadow-lg">
        {/* Abstract glowing background */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[80px]" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-blue-500/10 blur-[60px]" />
        
        <div className="relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {activeSession ? "Workout in progress" : "Today's Workout"}
          </p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
            {activeSession?.templateName || suggestedTemplate?.name || "Build your session"}
          </h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            {activeSession
              ? <><Activity className="h-4 w-4"/> {activeSession.exercises.length} exercises</>
              : suggestedTemplate
                ? <><Dumbbell className="h-4 w-4"/> {suggestedTemplate.exercises.length} exercises <span className="opacity-50 mx-1">â€¢</span> ~55 min</>
                : "Start with an exercise and make it yours."}
          </p>
          <button
            onClick={activeSession ? () => navigate({ to: "/workout/active" }) : beginTemplate}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[#3B82F6] px-4 py-4 text-base font-black text-[#EFF6FF] transition-transform active:scale-[0.98] shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:bg-[#2563EB]"
          >
            {activeSession
              ? "Resume Workout"
              : suggestedTemplate
                ? "Start Workout"
                : "Start Empty Workout"}
          </button>
        </div>
      </section>

      {/* Weekly Progress */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Weekly Progress</h2>
        </div>
        <div className="flex justify-between px-2">
          <Ring
            value={(thisWeek.length / weeklyGoal) * 100}
            label="Workouts"
            detail={`${thisWeek.length}/${weeklyGoal}`}
            color="text-[#3B82F6]"
          />
          <Ring
            value={weeklyVolume ? 100 : 0}
            label="Volume"
            detail={weeklyVolume ? format(weeklyVolume).replace(/\s/g, "") : "â€”"}
            color="text-amber-500"
          />
          <Ring
            value={completed.length ? Math.min(100, (thisWeek.length / completed.length) * 100) : 0}
            label="Consistency"
            detail={
              completed.length ? `${Math.round((thisWeek.length / completed.length) * 100)}%` : "â€”"
            }
            color="text-cyan-500"
          />
        </div>
      </section>

      {/* Recent Workout */}
      {completed.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Recent Workout</h2>
          </div>
          <Link
            to="/history"
            className="block rounded-[2rem] border border-border/50 bg-card p-5 shadow-sm transition-colors hover:bg-accent/50"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-extrabold text-foreground">{completed[0].templateName || "Workout"}</h3>
                <p className="mt-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> 
                  {new Date(completed[0].startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                  <span className="opacity-50">â€¢</span>
                  {completed[0].exercises.length} exercises
                </p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground/5 text-foreground">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3B82F6]/10 text-[#3B82F6]">
                  <Activity className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-foreground">{format(computeSessionVolume(completed[0]))}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-foreground">
                  {Math.round(((completed[0].endedAt || Date.now()) - completed[0].startedAt) / 60000)} min
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

    </div>
  );
}
