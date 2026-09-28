import { useState, useEffect, useMemo, useRef } from "react";
import { X, Clock, ChevronLeft, ChevronRight, Check, Plus, Timer, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseNameInput } from "./ExerciseNameInput";
import { generateId, computeSessionVolume } from "./storage";
import { detectPR, normalizeName } from "./records";
import type { Session, Exercise, WorkoutSet, ExerciseRecord } from "./types";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { hapticMedium, hapticSuccess, hapticLight } from "@/utils/haptics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWorkoutSettings } from "@/hooks/useWorkoutSettings";
import { createPortal } from "react-dom";

/* ─── Single-digit rolling counter slot ─── */
function DigitSlot({ digit }: { digit: string }) {
  const prevRef = useRef(digit);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    let timer: any;
    if (prevRef.current !== digit) {
      prevRef.current = digit;
      setAnimating(true);
      timer = setTimeout(() => setAnimating(false), 360);
    }
    return () => clearTimeout(timer);
  }, [digit]);

  return (
    <span className="relative inline-block h-[1.15em] w-[0.62em] overflow-hidden align-middle font-mono tabular-nums text-center select-none">
      <span
        key={digit}
        className={cn(
          "inline-block w-full text-center will-change-transform",
          animating && "animate-digit-scroll",
        )}
      >
        {digit}
      </span>
    </span>
  );
}

function ColonSeparator() {
  return (
    <span className="inline-block px-[1px] font-mono select-none opacity-60 align-middle">:</span>
  );
}

export function TimerDisplay({ ms }: { ms: number }) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mStr = String(minutes).padStart(2, "0");
  const sStr = String(seconds).padStart(2, "0");

  return (
    <span className="inline-flex items-center font-mono text-3xl font-semibold tracking-tight text-foreground tabular-nums select-none">
      {hours > 0 && (
        <>
          <DigitSlot digit={String(hours)} />
          <ColonSeparator />
        </>
      )}
      <DigitSlot digit={mStr[0]!} />
      <DigitSlot digit={mStr[1]!} />
      <ColonSeparator />
      <DigitSlot digit={sStr[0]!} />
      <DigitSlot digit={sStr[1]!} />
    </span>
  );
}

interface ActiveSessionProps {
  session: Session;
  exerciseNames: string[];
  records: Record<string, ExerciseRecord>;
  onUpdate: (session: Session) => void;
  onFinish: (session: Session) => void;
  onCancel: () => void;
}

export function ActiveSession({
  session,
  exerciseNames,
  records,
  onUpdate,
  onFinish,
  onCancel,
}: ActiveSessionProps) {
  const [elapsed, setElapsed] = useState(() => Date.now() - session.startedAt);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [newExerciseName, setNewExerciseName] = useState("");
  const { format: fmtWeight } = useWeightUnit();
  const { restBetweenSets } = useWorkoutSettings();

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - session.startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

  const activeExercise = session.exercises[currentExIndex];
  
  // Calculate current set number for the active exercise
  const currentSetNumber = activeExercise 
    ? activeExercise.sets.filter(s => s.completed).length + 1 
    : 1;
    
  const totalSets = activeExercise?.targetSets || Math.max(4, activeExercise?.sets.length || 4);

  // Local state for the inputs
  const [inputWeight, setInputWeight] = useState(activeExercise?.targetWeight ? String(activeExercise.targetWeight) : "");
  const [inputReps, setInputReps] = useState(activeExercise?.targetReps ? String(activeExercise.targetReps) : "");

  // Update inputs when exercise changes
  useEffect(() => {
    if (activeExercise) {
      const lastSet = activeExercise.sets[activeExercise.sets.length - 1];
      if (lastSet && lastSet.completed) {
        setInputWeight(String(lastSet.weight));
        setInputReps(String(lastSet.reps));
      } else if (!inputWeight && !inputReps) {
        setInputWeight(activeExercise.targetWeight ? String(activeExercise.targetWeight) : "");
        setInputReps(activeExercise.targetReps ? String(activeExercise.targetReps) : "");
      }
    }
  }, [currentExIndex, activeExercise]);

  const record = activeExercise ? records[normalizeName(activeExercise.name)] : undefined;

  function handleCompleteSet() {
    if (!activeExercise) return;
    
    const w = parseFloat(inputWeight) || 0;
    const r = parseInt(inputReps, 10) || 0;
    
    if (r <= 0) return; // Need at least 1 rep
    
    const pr = detectPR(record, w, r);
    if (pr) hapticSuccess();
    else hapticMedium();

    const newSet: WorkoutSet = {
      id: generateId(),
      weight: w,
      reps: r,
      completed: true,
      kind: "normal",
      pr: pr
    };

    const updatedExercises = [...session.exercises];
    updatedExercises[currentExIndex] = {
      ...activeExercise,
      sets: [...activeExercise.sets, newSet]
    };

    // Start rest timer
    const restTimerEndsAt = Date.now() + restBetweenSets * 1000;

    onUpdate({
      ...session,
      exercises: updatedExercises,
      restTimerEndsAt
    });
  }

  function handleAddExercise() {
    const trimmed = newExerciseName.trim();
    if (!trimmed) return;
    
    const newEx: Exercise = {
      id: generateId(),
      name: trimmed,
      sets: []
    };
    
    onUpdate({
      ...session,
      exercises: [...session.exercises, newEx]
    });
    
    setNewExerciseName("");
    setCurrentExIndex(session.exercises.length);
  }

  function handleSkipRest() {
    hapticLight();
    onUpdate({ ...session, restTimerEndsAt: null });
  }

  function handleAddRest() {
    hapticLight();
    onUpdate({ ...session, restTimerEndsAt: (session.restTimerEndsAt || Date.now()) + 30000 });
  }

  const isResting = session.restTimerEndsAt && session.restTimerEndsAt > Date.now();
  const restRemaining = isResting ? Math.ceil((session.restTimerEndsAt! - Date.now()) / 1000) : 0;
  
  // Fake muscle groups for UI aesthetics based on name
  const getMuscleGroups = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("bench") || n.includes("push")) return ["Chest", "Triceps", "Shoulders"];
    if (n.includes("squat") || n.includes("leg")) return ["Quads", "Glutes", "Core"];
    if (n.includes("pull") || n.includes("row")) return ["Back", "Biceps"];
    if (n.includes("deadlift")) return ["Hamstrings", "Glutes", "Lower Back"];
    return ["Full Body"];
  };

  if (session.exercises.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col pt-12 px-6">
        <div className="flex justify-between items-center mb-8">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground"><X className="h-6 w-6" /></button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border text-foreground rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel session?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Are you sure you want to cancel? This empty session will be discarded.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border text-foreground hover:bg-muted rounded-xl">Keep training</AlertDialogCancel>
                <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Discard session</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <span className="font-bold text-foreground">Empty Session</span>
          <div className="w-6" />
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
          <Dumbbell className="h-16 w-16 text-muted-foreground/30 mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Ready to train?</h2>
          <p className="text-muted-foreground mb-8 text-center max-w-[250px]">Add your first exercise to begin your workout session.</p>
          
          <div className="w-full max-w-sm space-y-4">
            <ExerciseNameInput
              suggestions={exerciseNames}
              value={newExerciseName}
              onChange={setNewExerciseName}
              onSubmit={handleAddExercise}
              placeholder="Search exercises..."
            />
            <button
              onClick={handleAddExercise}
              disabled={!newExerciseName.trim()}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl disabled:opacity-50"
            >
              Add Exercise
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col text-foreground animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors active:scale-95"><X className="h-6 w-6" /></button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border text-foreground rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel session?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to cancel? All logged sets and progress in this session will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-foreground hover:bg-muted rounded-xl">Keep training</AlertDialogCancel>
              <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Discard session</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">
            Exercise {currentExIndex + 1} of {session.exercises.length}
          </span>
          <span className="font-bold text-base">{session.templateName || "Active Workout"}</span>
        </div>
        
        <button onClick={() => onFinish({ ...session, endedAt: Date.now() })} className="text-blue-600 dark:text-blue-500 font-bold active:scale-95">
          Finish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar flex flex-col">
        {/* Navigation Arrows for Exercises */}
        <div className="flex items-center justify-between mt-6">
          <button 
            onClick={() => setCurrentExIndex(Math.max(0, currentExIndex - 1))}
            disabled={currentExIndex === 0}
            className="p-2 rounded-full bg-foreground/5 text-foreground disabled:opacity-20 active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <h1 className="text-4xl font-black tracking-tight text-center flex-1 mx-4">
            {activeExercise.name}
          </h1>

          <button 
            onClick={() => setCurrentExIndex(Math.min(session.exercises.length - 1, currentExIndex + 1))}
            disabled={currentExIndex === session.exercises.length - 1}
            className="p-2 rounded-full bg-foreground/5 text-foreground disabled:opacity-20 active:scale-95"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Muscle Tags */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {getMuscleGroups(activeExercise.name).map(m => (
            <span key={m} className="px-3 py-1 rounded-full bg-foreground/5 text-xs font-semibold text-foreground/80 border border-border/50">
              {m}
            </span>
          ))}
        </div>

        {/* Reference Stats */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-card rounded-2xl p-4 flex flex-col items-center border border-border/50 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Previous</span>
            <span className="font-bold text-foreground">
              {record ? `${fmtWeight(record.bestWeight)} × ${record.bestWeightReps}` : "--"}
            </span>
          </div>
          <div className="bg-card rounded-2xl p-4 flex flex-col items-center border border-border/50 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Suggested</span>
            <span className="font-bold text-green-600 dark:text-green-400">
              {activeExercise.targetWeight ? `${fmtWeight(activeExercise.targetWeight)} × ${activeExercise.targetReps}` : "--"}
            </span>
          </div>
        </div>

        {/* Current Set Inputs */}
        <div className="mt-12 flex-1 flex flex-col justify-center">
          <p className="text-center font-bold text-foreground mb-6">
            Set {currentSetNumber} <span className="text-muted-foreground font-medium">of {totalSets}</span>
          </p>

          <div className="flex gap-4">
            <div className="flex-1 bg-card rounded-3xl p-6 border border-border/50 flex flex-col items-center justify-center shadow-md relative overflow-hidden focus-within:border-blue-500/50 transition-colors">
              <input 
                type="number" 
                value={inputWeight}
                onChange={e => setInputWeight(e.target.value)}
                className="w-full bg-transparent text-center text-5xl font-black text-foreground outline-none"
                placeholder="0"
              />
              <span className="text-muted-foreground font-bold mt-2">kg</span>
            </div>
            
            <div className="flex-1 bg-card rounded-3xl p-6 border border-border/50 flex flex-col items-center justify-center shadow-md relative overflow-hidden focus-within:border-blue-500/50 transition-colors">
              <input 
                type="number" 
                value={inputReps}
                onChange={e => setInputReps(e.target.value)}
                className="w-full bg-transparent text-center text-5xl font-black text-foreground outline-none"
                placeholder="0"
              />
              <span className="text-muted-foreground font-bold mt-2">reps</span>
            </div>
          </div>

          <button 
            onClick={handleCompleteSet}
            disabled={!inputWeight || !inputReps || isResting}
            className="w-full mt-8 py-5 bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-xl tracking-wide rounded-[2rem] shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
          >
            Complete Set
          </button>
          
          {/* Completed sets pill indicators */}
          <div className="flex justify-center gap-1.5 mt-6">
            {activeExercise.sets.map((set, i) => (
              <div key={set.id} className={cn("h-1.5 rounded-full transition-all", set.completed ? "w-6 bg-[#22C55E]" : "w-1.5 bg-foreground/20")} />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Rest Timer */}
      {isResting && (
        <div className="absolute bottom-8 left-6 right-6 z-50">
          <div className="bg-card border border-border/50 rounded-[2rem] p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-4 pl-2">
              {/* Circular progress */}
              <div className="relative flex h-14 w-14 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-muted/40 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                  <circle 
                    className="text-[#22C55E] stroke-current transition-all duration-1000 ease-linear" 
                    strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 * (1 - (restRemaining / restBetweenSets))}
                  ></circle>
                </svg>
                <div className="flex flex-col items-center justify-center mt-0.5">
                  <span className="text-xs font-bold font-mono tracking-tighter text-foreground">
                    {Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-foreground font-bold">Rest</p>
                <p className="text-muted-foreground text-xs">Next Set</p>
              </div>
            </div>
            
            <div className="flex gap-2 pr-1">
              <button onClick={handleAddRest} className="px-4 py-3 bg-foreground/5 hover:bg-foreground/10 rounded-2xl text-xs font-bold text-foreground transition-colors">
                +30s
              </button>
              <button onClick={handleSkipRest} className="px-4 py-3 bg-foreground/5 hover:bg-foreground/10 rounded-2xl text-xs font-bold text-foreground transition-colors">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Add floating button (hidden during rest to prevent clutter) */}
      {!isResting && (
        <div className="absolute bottom-8 right-6">
           <AlertDialog>
             <AlertDialogTrigger asChild>
                <button className="h-14 w-14 bg-card/80 hover:bg-card backdrop-blur-md border border-border/50 rounded-full flex items-center justify-center text-foreground shadow-lg active:scale-95 transition-all">
                  <Plus className="h-6 w-6" />
                </button>
             </AlertDialogTrigger>
             <AlertDialogContent className="bg-card border-border rounded-3xl p-6">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground text-xl">Add Exercise</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="py-4">
                  <ExerciseNameInput
                    suggestions={exerciseNames}
                    value={newExerciseName}
                    onChange={setNewExerciseName}
                    onSubmit={() => {}}
                    placeholder="Search exercises..."
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border text-foreground hover:bg-muted rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddExercise} className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl">Add</AlertDialogAction>
                </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
        </div>
      )}
    </div>
  );
}
