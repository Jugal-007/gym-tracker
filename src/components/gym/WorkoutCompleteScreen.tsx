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

export function WorkoutCompleteScreen({ session, allSessions, onViewResults, onGoHome }: WorkoutCompleteScreenProps) {
  const { format } = useWeightUnit();
  
  const durationMs = session.endedAt ? session.endedAt - session.startedAt : 0;
  const minutes = Math.round(durationMs / 60000);
  
  const volume = computeSessionVolume(session);
  const sets = computeSessionSets(session);
  const prCount = session.exercises.reduce((sum, ex) => sum + ex.sets.filter((set) => set.pr).length, 0);

  // We need to estimate XP gained from this session.
  // We can just hardcode what we awarded:
  const xpEarned = 100 + (prCount * 50);

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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Workout Complete!</h1>
          <h2 className="text-xl font-bold text-foreground mt-2">{session.templateName || "Custom Workout"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{minutes} min · {session.exercises.length} exercises · {format(volume)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Volume</p>
            <p className="text-xl font-extrabold text-foreground">{format(volume)}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sets</p>
            <p className="text-xl font-extrabold text-foreground">{sets}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">PRs</p>
            <p className="text-xl font-extrabold text-foreground">{prCount}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">XP Earned</p>
            <p className="text-xl font-extrabold text-green-500">+{xpEarned} XP</p>
          </div>
        </div>
        
        <p className="italic text-sm text-muted-foreground py-4">"Great work! You're 1 step closer to a stronger you."</p>
        
        <div className="space-y-3 pt-4">
          <button
            onClick={onViewResults}
            className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-center font-bold text-white shadow-md transition-all hover:bg-blue-500 active:scale-95"
          >
            View Results
          </button>
          <button
            onClick={onGoHome}
            className="w-full rounded-2xl bg-transparent px-4 py-4 text-center font-bold text-foreground transition-all hover:bg-muted active:scale-95"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
