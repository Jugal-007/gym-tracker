import { Trophy } from "lucide-react";
import type { Session } from "@/components/gym/types";
import { computeSessionSets, computeSessionVolume } from "@/components/gym/storage";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useMemo } from "react";
import { computeGamification } from "@/lib/gamification";

interface WorkoutCompleteScreenProps {
  session: Session;
  allSessions: Session[];
  onViewResults: () => void;
  onGoHome: () => void;
}

export function WorkoutCompleteScreen({
  session,
  allSessions,
  onViewResults,
  onGoHome,
}: WorkoutCompleteScreenProps) {
  const { format } = useWeightUnit();

  const durationMs = session.endedAt ? session.endedAt - session.startedAt : 0;
  const minutes = Math.round(durationMs / 60000);

  const volume = computeSessionVolume(session);
  const sets = computeSessionSets(session);
  const prCount = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((set) => set.pr).length,
    0,
  );

  // XP is a derived display value; completion itself only persists the session once.
  const xpEarned = 100 + prCount * 50;

  // Get current gamification state (including this session if it's in allSessions, which it should be by now)
  const gamification = useMemo(() => computeGamification(allSessions), [allSessions]);

  return (
    <div className="flex h-screen flex-col items-center justify-center p-6 text-center animate-fade-in relative z-50 bg-background">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 space-y-6 max-w-sm w-full">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-orange-500/10 ring-4 ring-orange-500/20">
          <Trophy className="h-10 w-10 text-orange-500" fill="currentColor" />
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Workout Complete!
          </h1>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mt-3">
            {session.templateName || "Custom Workout"}
          </h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {minutes} min <span className="opacity-50 mx-1">â€¢</span> {session.exercises.length}{" "}
            exercises <span className="opacity-50 mx-1">â€¢</span> {format(volume)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Volume
            </p>
            <p className="text-xl font-extrabold text-foreground">{format(volume)}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Sets
            </p>
            <p className="text-xl font-extrabold text-foreground">{sets}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              PRs
            </p>
            <p className="text-xl font-extrabold text-foreground">{prCount}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              XP Earned
            </p>
            <p className="text-xl font-extrabold text-blue-500">+{xpEarned} XP</p>
          </div>
        </div>

        <p className="italic text-sm text-muted-foreground py-4">
          "Great work! You're 1 step closer to a stronger you."
        </p>

        <div className="space-y-4 pt-6">
          <button
            onClick={onViewResults}
            className="w-full rounded-full bg-[#3B82F6] px-4 py-4 text-center text-base font-black text-[#EFF6FF] shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all hover:bg-[#2563EB] active:scale-[0.98]"
          >
            View Results
          </button>
          <button
            onClick={onGoHome}
            className="w-full rounded-full border-2 border-border/50 bg-transparent px-4 py-4 text-center text-base font-bold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
