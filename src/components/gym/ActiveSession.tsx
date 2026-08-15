import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Plus, Clock, Dumbbell, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseNameInput } from "./ExerciseNameInput";
import { computeSessionSets, computeSessionVolume, generateId } from "./storage";
import { PR_LABEL, detectPR, normalizeName } from "./records";
import type { Exercise, ExerciseRecord, PRKind, Session, WorkoutSet } from "./types";

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
    if (prevRef.current !== digit) {
      prevRef.current = digit;
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 240);
      return () => clearTimeout(timer);
    }
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
      <DigitSlot digit={mStr[0]} />
      <DigitSlot digit={mStr[1]} />
      <ColonSeparator />
      <DigitSlot digit={sStr[0]} />
      <DigitSlot digit={sStr[1]} />
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

  function handleFinish() {
    onFinish({ ...session, endedAt: Date.now() });
  }

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <div className="sticky top-0 z-10 mb-6 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
              <Clock className="h-5 w-5 text-foreground animate-pulse-soft" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Live session
              </p>
              <TimerDisplay ms={elapsed} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-muted-foreground transition-all hover:bg-muted hover:shadow-sm active:scale-[0.96]"
              aria-label="Cancel workout"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={handleFinish}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-foreground/90 hover:shadow-md active:scale-[0.96]"
            >
              Finish
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4" />
            {totalSets} sets
          </span>
          <span>{totalVolume.toLocaleString()} kg volume</span>
          {prCount > 0 && (
            <span className="animate-bounce-scale-in inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-primary-foreground animate-glow-ring">
              <Trophy className="h-3.5 w-3.5" />
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
            onClick={addExercise}
            disabled={!newExerciseName.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-foreground p-3 text-primary-foreground transition-all hover:bg-foreground/90 hover:shadow-md active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100"
            aria-label="Add exercise"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {session.exercises.length === 0 && (
          <div className="animate-fade-in py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border animate-float">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Add your first exercise to start logging sets.</p>
          </div>
        )}

        <div className="space-y-4">
          {session.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              record={records[normalizeName(exercise.name)]}
              onAddSet={addSet}
              onToggleSet={toggleSet}
              onDeleteSet={deleteSet}
              onDeleteExercise={deleteExercise}
            />
          ))}
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
}

function ExerciseCard({
  exercise,
  index,
  record,
  onAddSet,
  onToggleSet,
  onDeleteSet,
  onDeleteExercise,
}: ExerciseCardProps) {
  const [reps, setReps] = useState(exercise.targetReps ? String(exercise.targetReps) : "");
  const [weight, setWeight] = useState(exercise.targetWeight ? String(exercise.targetWeight) : "");
  const [addGlow, setAddGlow] = useState(false);

  const canAdd = !!reps && !!weight;

  // Pulse the add button when both fields are filled
  useEffect(() => {
    if (canAdd) {
      setAddGlow(true);
      const t = setTimeout(() => setAddGlow(false), 800);
      return () => clearTimeout(t);
    }
  }, [canAdd]);

  function handleAddSet() {
    const parsedReps = parseInt(reps, 10);
    const parsedWeight = parseFloat(weight);
    if (parsedReps > 0 && parsedWeight >= 0) {
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
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{exercise.name}</h3>
          <p className="text-xs text-muted-foreground">
            {exercise.sets.length} sets · {volume.toLocaleString()} kg
            {exercise.targetSets
              ? ` · target ${exercise.targetSets}×${exercise.targetReps ?? 0} @ ${exercise.targetWeight ?? 0} kg`
              : ""}
          </p>
          {record && record.bestWeight > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="h-3 w-3" />
              PR {record.bestWeight} kg × {record.bestWeightReps}
            </p>
          )}
        </div>
        <button
          onClick={() => onDeleteExercise(exercise.id)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-[0.96]"
          aria-label={`Delete ${exercise.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
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

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Reps</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSet();
            }}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-foreground focus:ring-2 focus:ring-foreground/10"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Weight (kg)
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSet();
            }}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-foreground focus:ring-2 focus:ring-foreground/10"
          />
        </div>
        <button
          onClick={handleAddSet}
          disabled={!reps || !weight}
          className={cn(
            "inline-flex items-center justify-center rounded-lg bg-secondary p-2.5 text-secondary-foreground transition-all hover:bg-secondary/80 active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100",
            addGlow && "animate-border-glow",
          )}
          aria-label="Add set"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
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
    if (set.completed && !prevCompleted.current) {
      setJustCompleted(true);
      // Haptic feedback on mobile
      if (navigator.vibrate) navigator.vibrate(30);
      const t = setTimeout(() => setJustCompleted(false), 400);
      prevCompleted.current = set.completed;
      return () => clearTimeout(t);
    }
    prevCompleted.current = set.completed;
  }, [set.completed]);

  function handleDelete() {
    setDeleting(true);
    setTimeout(onDelete, 350);
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border p-3 transition-all duration-200",
        deleting && "deleting",
        set.completed && !justCompleted && "bg-muted/50",
        justCompleted && "set-completed-sweep",
        set.pr && "border-foreground shadow-sm",
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
          <p className="text-xs text-muted-foreground">
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
      <button
        onClick={handleDelete}
        className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-[0.96]"
        aria-label="Delete set"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
