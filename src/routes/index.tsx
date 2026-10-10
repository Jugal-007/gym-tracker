import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Dumbbell,
  Sparkles,
  Trophy,
  User as UserIcon,
  Clock,
  Activity,
  CalendarDays,
} from "lucide-react";
import { useMemo } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildRecords } from "@/components/gym/records";
import { computeSessionVolume, loadWeeklyGoal } from "@/components/gym/storage";
import { getSmartSuggestedTemplate } from "@/components/gym/templates";
import { useGym } from "@/hooks/useGymStore";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { cn } from "@/lib/utils";

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
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  // Calculate dot position
  const angle = (clamped / 100) * 2 * Math.PI - Math.PI / 2;
  const dotX = 50 + radius * Math.cos(angle);
  const dotY = 50 + radius * Math.sin(angle);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
      <div className="relative grid h-[84px] w-[84px] place-items-center rounded-full">
        <svg className="absolute inset-0" viewBox="0 0 100 100" aria-hidden="true">
          {/* Thin track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted"
          />
          {/* Thicker progress */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("-rotate-90 origin-center transition-all duration-1000 ease-out", color)}
          />
          {/* Indicator dot */}
          {clamped > 0 && (
            <circle cx={dotX} cy={dotY} r="4" className={cn("fill-current", color)} />
          )}
        </svg>
        <span className="relative text-[15px] font-bold tabular-nums text-foreground">
          {detail}
        </span>
      </div>
      <span className="text-center text-xs font-medium text-muted-foreground">{label}</span>
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
  const suggestedTemplate = useMemo(
    () => getSmartSuggestedTemplate(templates, sessions),
    [templates, sessions],
  );
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
          <p className="text-[15px] font-medium text-muted-foreground/80 mb-1">
            {now.getHours() < 12
              ? "Good morning,"
              : now.getHours() < 18
                ? "Good afternoon,"
                : "Good evening,"}
          </p>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-none">
            {name}
          </h1>
        </div>
        <Link
          to="/profile"
          className="h-14 w-14 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-bold text-xl shadow-sm transition-transform active:scale-95 overflow-hidden"
          aria-label="Profile"
        >
          {user?.user_metadata?.["avatar_url"] ? (
            <img
              src={user.user_metadata["avatar_url"]}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </Link>
      </section>

      {/* Today's Workout Card */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card shadow-sm">
        <div className="relative z-10 p-6">
          <div className="flex justify-between items-start mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {activeSession ? "Workout in progress" : "Today's Workout"}
            </p>
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-[#3B82F6] flex items-center justify-center">
              <Dumbbell className="h-5 w-5" />
            </div>
          </div>

          <h2 className="text-[32px] font-bold tracking-tight text-foreground leading-none mb-3">
            {activeSession?.templateName || suggestedTemplate?.name || "Build your session"}
          </h2>

          <div className="flex items-center gap-4 text-[13px] font-medium text-muted-foreground mb-8">
            <div className="flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4" />
              <span>
                {activeSession
                  ? activeSession.exercises.length
                  : suggestedTemplate
                    ? suggestedTemplate.exercises.length
                    : 0}{" "}
                exercises
              </span>
            </div>
            <div className="w-[1px] h-4 bg-border/80"></div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>~55 min</span>
            </div>
          </div>

          <button
            onClick={activeSession ? () => navigate({ to: "/workout/active" }) : beginTemplate}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#3B82F6] px-4 py-4 text-[17px] font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {activeSession
              ? "Resume Workout"
              : suggestedTemplate
                ? "Start Workout"
                : "Start Empty Workout"}
            <ArrowRight className="h-5 w-5 ml-1" />
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
            detail={weeklyVolume ? format(weeklyVolume).replace(/\s/g, "") : "—"}
            color="text-[#3B82F6]"
          />
          <Ring
            value={completed.length ? Math.min(100, (thisWeek.length / completed.length) * 100) : 0}
            label="Consistency"
            detail={
              completed.length ? `${Math.round((thisWeek.length / completed.length) * 100)}%` : "—"
            }
            color="text-[#3B82F6]"
          />
        </div>
      </section>

      {/* Recent Workout */}
      {completed.length > 0 && completed[0] && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Recent Workout</h2>
          </div>
          <Link
            to="/history"
            className="block rounded-[2rem] border border-border/40 bg-card p-5 shadow-sm transition-colors hover:bg-muted/30"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {completed[0].templateName || "Workout"}
                </h3>
                <div className="flex items-center gap-3 text-[13px] font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(completed[0].startedAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  <div className="w-[1px] h-3 bg-border/80"></div>
                  <div className="flex items-center gap-1.5">
                    <Dumbbell className="h-4 w-4" />
                    {completed[0].exercises.length} exercises
                  </div>
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-muted/50 text-foreground transition-colors hover:bg-muted">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6]/10 text-[#3B82F6]">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <span className="text-[13px] font-bold text-foreground">
                  {format(computeSessionVolume(completed[0]))}
                </span>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6]/10 text-[#3B82F6]">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <span className="text-[13px] font-bold text-foreground">
                  {Math.round(
                    ((completed[0].endedAt || Date.now()) - completed[0].startedAt) / 60000,
                  )}{" "}
                  min
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
