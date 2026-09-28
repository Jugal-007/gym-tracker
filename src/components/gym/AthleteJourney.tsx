import { useMemo } from "react";
import { computeGamification } from "@/lib/gamification";
import { Flame, Trophy, Target } from "lucide-react";
import type { Session } from "@/components/gym/types";

export function AthleteJourney({ sessions }: { sessions: Session[] }) {
  const { xp, currentStreak, longestStreak, achievements } = useMemo(() => computeGamification(sessions), [sessions]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Athlete Journey</h2>

      {/* Level Card */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/10 p-6 shadow-lg">
        {/* Complex Gradient Background */}
        <div className="absolute inset-0 bg-[#0A0A0A] dark:bg-[#0A0A0A]" />
        <div className="absolute -inset-[100%] opacity-50">
          <div className="absolute top-[20%] left-[20%] h-[60%] w-[60%] rounded-full bg-gradient-to-r from-orange-600 via-pink-600 to-blue-600 blur-[60px] transform rotate-12" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm ring-1 ring-white/20 shadow-inner">
              <Flame className="h-8 w-8 text-orange-400" fill="currentColor" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tight">Level {xp.level}</h3>
              <p className="text-sm font-semibold text-white/80 mt-0.5">
                {xp.totalXP.toLocaleString()} / {xp.nextLevelXP.toLocaleString()} XP
              </p>
            </div>
          </div>
          
          <div className="pt-2">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40 shadow-inner">
                <div 
                  className="h-full rounded-full bg-white transition-all duration-1000 ease-out"
                  style={{ width: `${xp.progress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-white">{Math.round(xp.progress)}%</span>
            </div>
            <p className="mt-2 text-xs font-medium text-white/60">
              {xp.nextLevelXP - xp.totalXP} XP to Level {xp.level + 1}
            </p>
          </div>
        </div>
      </div>

      {/* Streaks (Pill cards side-by-side) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
            <Flame className="h-5 w-5" fill="currentColor" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Streak</p>
            <p className="text-sm font-bold text-foreground">{currentStreak} days</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Longest</p>
            <p className="text-sm font-bold text-foreground">{longestStreak} days</p>
          </div>
        </div>
      </div>

      {/* Active Challenges */}
      <div>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Challenges</h3>
        <div className="space-y-3">
          {/* Weekly Consistency */}
          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground">Weekly Consistency</h4>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">3 / 4 workouts</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div className="h-full w-3/4 rounded-full bg-blue-500" />
              </div>
            </div>
            <div className="shrink-0 text-muted-foreground">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
          
          {/* Strength Challenge */}
          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground">Strength Challenge</h4>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Beat your Bench Press e1RM</p>
              <p className="text-[10px] font-bold text-emerald-500 mt-1">+2.5 kg needed</p>
            </div>
            <div className="shrink-0 text-muted-foreground">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
