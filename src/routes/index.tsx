import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";
import { useGym } from "@/hooks/useGymStore";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMemo } from "react";
import { flushSync } from "react-dom";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const {
    sessions,
    templates,
    startSession,
    startFromTemplate,
  } = useGym();
  
  const navigate = useNavigate();

  // Find most frequent or recent template for "Today's Workout" suggestion
  const suggestedTemplate = templates.length > 0 ? templates[0] : null;

  function handleStartEmpty() {
    flushSync(() => { startSession(); });
    navigate({ to: "/workout/active" });
  }
  
  function handleStartTemplate(t: any) {
    flushSync(() => { startFromTemplate(t); });
    navigate({ to: "/workout/active" });
  }

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},
          </h1>
          <h2 className="text-3xl font-black tracking-tight text-foreground">{user?.user_metadata?.full_name || "Jugal"} 👋</h2>
        </div>
        {user?.user_metadata?.avatar_url && (
          <img src={user.user_metadata.avatar_url} alt="Profile" className="h-12 w-12 rounded-full ring-2 ring-border" />
        )}
      </div>

      {/* Primary CTA / Today's Workout */}
      <div className="relative overflow-hidden rounded-3xl p-6 shadow-md border border-border/10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-background z-0" />
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-blue-500/20 blur-[50px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-purple-500/20 blur-[40px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        
        <div className="relative z-10">
          {suggestedTemplate ? (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Today's Workout</p>
              <h3 className="text-3xl font-black text-foreground mt-1 tracking-tight">{suggestedTemplate.name}</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1 mb-6">{suggestedTemplate.exercises.length} exercises · ~55 min</p>
              
              <button
                onClick={() => handleStartTemplate(suggestedTemplate)}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-center text-[15px] font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 active:scale-95"
              >
                Start Workout
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Ready to train?</p>
              <h3 className="text-3xl font-black text-foreground mt-1 tracking-tight">Empty Session</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1 mb-6">Start a fresh workout from scratch</p>
              <button
                onClick={handleStartEmpty}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-center text-[15px] font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 active:scale-95"
              >
                Start Workout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Weekly Progress */}
      <div>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Weekly Progress</h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Workouts Ring */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-card shadow-sm border border-border/40">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle className="text-muted/20 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                <circle className="text-blue-500 stroke-current" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (3/4))}></circle>
              </svg>
              <span className="text-sm font-bold text-foreground">3/4</span>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-muted-foreground">Workouts</p>
            </div>
          </div>
          
          {/* Volume Ring */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-card shadow-sm border border-border/40">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle className="text-muted/20 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                <circle className="text-purple-500 stroke-current" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (0.8))}></circle>
              </svg>
              <div className="flex flex-col items-center leading-none">
                <span className="text-xs font-bold text-foreground">12.4k</span>
                <span className="text-[9px] text-muted-foreground">kg</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-muted-foreground">Volume</p>
            </div>
          </div>
          
          {/* Consistency Ring */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-card shadow-sm border border-border/40">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle className="text-muted/20 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                <circle className="text-teal-400 stroke-current" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (0.82))}></circle>
              </svg>
              <span className="text-sm font-bold text-foreground">82%</span>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-muted-foreground">Consistency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent PR */}
      <div className="flex items-center justify-between rounded-3xl border border-border/40 bg-card p-5 shadow-sm mt-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Recent PR</p>
          <p className="text-lg font-bold text-foreground">70 kg × 8</p>
          <p className="text-sm font-medium text-muted-foreground">Bench Press</p>
        </div>
        <div className="rounded-xl bg-teal-400/10 px-3.5 py-1.5 border border-teal-400/20">
          <p className="text-sm font-bold text-teal-500 dark:text-teal-400">+10 kg</p>
        </div>
      </div>
    </div>
  );
}
