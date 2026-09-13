import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Plus, Clock, Dumbbell, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepperInput } from "@/components/ui/StepperInput";
import { SwipeToDelete } from "@/components/ui/SwipeToDelete";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExerciseNameInput } from "./ExerciseNameInput";
import { computeSessionSets, computeSessionVolume, generateId } from "./storage";
import { PR_LABEL, detectPR, normalizeName } from "./records";
import type { Exercise, ExerciseRecord, PRKind, Session, WorkoutSet } from "./types";
import { hapticMedium, hapticSuccess, hapticLight } from "@/utils/haptics";
import { motion, AnimatePresence } from "framer-motion";

interface ActiveSessionProps {
  session: Session;
  exerciseNames: string[];
  records: Record<string, ExerciseRecord>;
  onUpdate: (session: Session) => void;
  onFinish: (session: Session) => void;
  onCancel: () => void;
}

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

export function ActiveSession({
  session,
  exerciseNames,
  records,
  onUpdate,
  onFinish,
  onCancel,
}: ActiveSessionProps) {
  const [elapsed, setElapsed] = useState(() => Date.now() - session.startedAt);
  const [newExerciseName, setNewExerciseName] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - session.startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

  const totalVolume = useMemo(() => computeSessionVolume(session), [session]);
  const totalSets = useMemo(() => computeSessionSets(session), [session]);
  const completedSets = useMemo(
    () => session.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0),
    [session]
  );
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  
  const prCount = useMemo(
    () => session.exercises.reduce((sum, ex) => sum + ex.sets.filter((set) => set.pr).length, 0),
    [session],
  );

  function addExercise() {
    const trimmed = newExerciseName.trim();
    if (!trimmed) return;
    const exercise: Exercise = {
      id: generateId(),
      name: trimmed,
      sets: [],
    };
    onUpdate({ ...session, exercises: [...session.exercises, exercise] });
    setNewExerciseName("");
  }

  function addSet(exerciseId: string, reps: number, weight: number) {
    const exercise = session.exercises.find((ex) => ex.id === exerciseId);
    const record = exercise ? records[normalizeName(exercise.name)] : undefined;
    // Also respect PRs already set earlier in this same session.
    const liveRecord = exercise
      ? exercise.sets.reduce(
          (acc, set) => ({
            ...acc,
            bestWeight: Math.max(acc.bestWeight, set.weight),
            bestE1rm: Math.max(acc.bestE1rm, set.weight * (1 + set.reps / 30)),
          }),
          record ?? {
            name: exercise.name,
            bestWeight: 0,
            bestWeightReps: 0,
            bestE1rm: 0,
            bestE1rmWeight: 0,
            bestE1rmReps: 0,
            bestSessionVolume: 0,
            totalSets: 0,
            lastPerformedAt: 0,
            achievedAt: 0,
          },
        )
      : record;
    const pr =
      exercise && exercise.sets.length === 0 && !record
        ? detectPR(undefined, weight, reps)
        : detectPR(liveRecord, weight, reps);
    const set: WorkoutSet = {
      id: generateId(),
      reps,
      weight,
      completed: false,
      pr,
    };
    onUpdate({
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: [...ex.sets, set] } : ex,
      ),
    });
  }

  function toggleSet(exerciseId: string, setId: string) {
    onUpdate({
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((set) =>
                set.id === setId ? { ...set, completed: !set.completed } : set,
              ),
            }
          : ex,
      ),
    });
  }

  function deleteSet(exerciseId: string, setId: string) {
    onUpdate({
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((set) => set.id !== setId) } : ex,
      ),
    });
  }

  function deleteExercise(exerciseId: string) {
    onUpdate({
      ...session,
      exercises: session.exercises.filter((ex) => ex.id !== exerciseId),
    });
  }

  function toggleExerciseComplete(exerciseId: string) {
    onUpdate({
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex,
      ),
    });
  }

  function handleFinish() {
    onFinish({ ...session, endedAt: Date.now() });
  }

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <div className="sticky top-0 z-30 mb-6 rounded-b-2xl border-b border-border/40 bg-card/60 px-4 py-4 backdrop-blur-2xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background/50 shadow-inner">
              <Clock className="h-5 w-5 text-foreground animate-pulse-soft" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Live session
              </p>
              <div className="drop-shadow-sm">
                <TimerDisplay ms={elapsed} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                hapticLight();
                onCancel();
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-background/50 text-muted-foreground transition-all hover:bg-muted active:scale-95 active:opacity-70"
              aria-label="Cancel workout"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                hapticMedium();
                handleFinish();
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-bold text-background transition-all hover:bg-foreground/90 hover:shadow-md active:scale-95 active:opacity-80"
            >
              Finish
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span className="flex items-center gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" />
            {completedSets}/{totalSets} sets
          </span>
          <span>{totalVolume.toLocaleString()} kg vol</span>
          {prCount > 0 && (
            <span className="animate-bounce-scale-in inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold text-foreground">
              <Trophy className="h-3 w-3" />
              {prCount} PR{prCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="mb-6 flex items-end gap-2">
          <ExerciseNameInput
            suggestions={exerciseNames}
            value={newExerciseName}
            onChange={setNewExerciseName}
            onSubmit={addExercise}
            placeholder="Add an exercise..."
          />
          <button
            onClick={() => {
              hapticLight();
              addExercise();
            }}
            disabled={!newExerciseName.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-foreground p-3 text-primary-foreground transition-all hover:bg-foreground/90 hover:shadow-md active:scale-95 active:opacity-80 disabled:opacity-40 disabled:active:scale-100"
            aria-label="Add exercise"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {session.exercises.length === 0 && (
          <EmptyState
            icon={<Dumbbell className="h-12 w-12" strokeWidth={1.5} />}
            title="Empty Workout"
            description="Add your first exercise above to start logging sets and hitting PRs."
            className="py-12"
          />
        )}

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {[...session.exercises]
              .sort((a, b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                return 0;
              })
              .map((exercise, index) => (
                <motion.div
                  key={exercise.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    type: "spring", 
                    bounce: 0,
                    duration: 0.4
                  }}
                  className="will-change-transform"
                  style={{ borderRadius: 24 }}
                >
                  <ExerciseCard
                    exercise={exercise}
                    index={index}
                    record={records[normalizeName(exercise.name)]}
                    onAddSet={addSet}
                    onToggleSet={toggleSet}
                    onDeleteSet={deleteSet}
                    onDeleteExercise={deleteExercise}
                    onToggleComplete={() => toggleExerciseComplete(exercise.id)}
                  />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  record: ExerciseRecord | undefined;
  onAddSet: (exerciseId: string, reps: number, weight: number) => void;
  onToggleSet: (exerciseId: string, setId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onToggleComplete: () => void;
}

function ExerciseCard({
  exercise,
  index,
  record,
  onAddSet,
  onToggleSet,
  onDeleteSet,
  onDeleteExercise,
  onToggleComplete,
}: ExerciseCardProps) {
  const [reps, setReps] = useState(exercise.targetReps ? String(exercise.targetReps) : "");
  const [weight, setWeight] = useState(exercise.targetWeight ? String(exercise.targetWeight) : "");
  const [addGlow, setAddGlow] = useState(false);

  const canAdd = !!reps && !!weight;

  // Pulse the add button when both fields are filled
  useEffect(() => {
    let t: any;
    if (canAdd) {
      setAddGlow(true);
      t = setTimeout(() => setAddGlow(false), 800);
    }
    return () => clearTimeout(t);
  }, [canAdd]);

  function handleAddSet() {
    const parsedReps = parseInt(reps, 10);
    const parsedWeight = parseFloat(weight);
    if (parsedReps > 0 && parsedWeight >= 0) {
      hapticMedium();
      onAddSet(exercise.id, parsedReps, parsedWeight);
      setReps("");
      setWeight("");
    }
  }

  const volume = useMemo(
    () => exercise.sets.reduce((sum, set) => sum + set.reps * set.weight, 0),
    [exercise.sets],
  );

  return (
    <SwipeToDelete onDelete={() => onDeleteExercise(exercise.id)} className="rounded-3xl">
      <div className={cn("glass rounded-3xl p-5 transition-all duration-500", exercise.completed && "opacity-50 grayscale hover:grayscale-0 hover:opacity-100")}>
        <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className={cn("font-semibold text-foreground transition-all", exercise.completed && "line-through opacity-70")}>{exercise.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {exercise.sets.length} sets · {volume.toLocaleString()} kg
            {exercise.targetSets
              ? ` · target ${exercise.targetSets}×${exercise.targetReps ?? 0} @ ${exercise.targetWeight ?? 0} kg`
              : ""}
          </p>
          {record && record.bestWeight > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Trophy className="h-3 w-3" />
              PR {record.bestWeight} kg × {record.bestWeightReps}
            </p>
          )}
        </div>
      </div>

      {exercise.sets.length > 0 && (
        <div className="mb-3 space-y-1">
          {exercise.sets.map((set, setIndex) => (
            <SetRow
              key={set.id}
              set={set}
              index={setIndex}
              onToggle={() => onToggleSet(exercise.id, set.id)}
              onDelete={() => onDeleteSet(exercise.id, set.id)}
            />
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {!exercise.completed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <StepperInput
                    label="Reps"
                    value={reps}
                    onChange={setReps}
                    onEnter={handleAddSet}
                    min={1}
                    step={1}
                  />
                </div>
                <div className="flex-1">
                  <StepperInput
                    label="Weight (kg)"
                    value={weight}
                    onChange={setWeight}
                    onEnter={handleAddSet}
                    min={0}
                    step={2.5}
                  />
                </div>
              </div>
              <button
              onClick={handleAddSet}
              disabled={!canAdd}
              className={cn(
                "flex h-[52px] w-full shrink-0 items-center justify-center rounded-xl bg-foreground text-background text-[15px] font-bold transition-all duration-200 disabled:opacity-40 disabled:active:scale-100",
                addGlow ? "shadow-[0_0_15px_rgba(255,255,255,0.25)]" : "hover:bg-foreground/90 active:scale-[0.98] active:opacity-80"
              )}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Set
            </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <button
        onClick={() => {
          hapticLight();
          onToggleComplete();
        }}
        className={cn(
          "mt-4 w-full rounded-xl py-3.5 text-[15px] font-bold transition-all duration-200 active:scale-[0.98] active:opacity-70",
          exercise.completed 
            ? "bg-transparent border-2 border-border/50 text-muted-foreground hover:bg-muted" 
            : "bg-primary/10 text-primary hover:bg-primary/20"
        )}
      >
        {exercise.completed ? "Undo Finish" : "Finish Exercise"}
      </button>
    </div>
    </SwipeToDelete>
  );
}

interface SetRowProps {
  set: WorkoutSet;
  index: number;
  onToggle: () => void;
  onDelete: () => void;
}

function SetRow({ set, index, onToggle, onDelete }: SetRowProps) {
  const [justCompleted, setJustCompleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const prevCompleted = useRef(set.completed);

  useEffect(() => {
    let t: any;
    if (set.completed && !prevCompleted.current) {
      setJustCompleted(true);
      if (set.pr) {
        hapticSuccess();
      } else {
        hapticMedium();
      }
      t = setTimeout(() => setJustCompleted(false), 400);
    }
    prevCompleted.current = set.completed;
    return () => clearTimeout(t);
  }, [set.completed, set.pr]);

  function handleDelete() {
    setDeleting(true);
    setTimeout(onDelete, 350);
  }

  return (
    <SwipeToDelete onDelete={onDelete} className="rounded-2xl">
      <div
        className={cn(
        "flex items-center justify-between rounded-2xl border border-border/40 p-3.5 transition-all duration-300",
        deleting && "deleting",
        set.completed && !justCompleted && "bg-muted/10 border-transparent opacity-60 scale-[0.98]",
        justCompleted && "set-completed-sweep scale-[0.98]",
        set.pr && !set.completed && "border-foreground/30 shadow-sm bg-foreground/5",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <button
          onClick={onToggle}
          className={cn(
            "relative flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200",
            set.completed
              ? "border-foreground bg-foreground text-primary-foreground"
              : "border-border text-transparent hover:border-foreground/50",
            justCompleted && "check-ripple",
          )}
          aria-label={set.completed ? "Mark incomplete" : "Mark complete"}
        >
          {set.completed ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="relative z-10">
              <path
                d="M3 7.5L6 10.5L11 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={justCompleted ? "check-draw-path" : ""}
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7.5L6 10.5L11 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <div>
          <p className="text-sm font-medium text-foreground">Set {index + 1}</p>
          <p className="text-sm text-muted-foreground">
            {set.reps} reps × {set.weight} kg
          </p>
        </div>
        {set.pr && (
          <span className="animate-bounce-scale-in animate-glow-ring inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
            <Trophy className="h-3 w-3" />
            {PR_LABEL[set.pr as PRKind]}
          </span>
        )}
      </div>
    </div>
    </SwipeToDelete>
  );
}
