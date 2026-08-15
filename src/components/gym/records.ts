import type { Exercise, ExerciseRecord, PRKind, Session, WorkoutSet } from "./types";

/** Epley estimated 1-rep max. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function emptyRecord(name: string): ExerciseRecord {
  return {
    name,
    bestWeight: 0,
    bestWeightReps: 0,
    bestE1rm: 0,
    bestE1rmWeight: 0,
    bestE1rmReps: 0,
    bestSessionVolume: 0,
    totalSets: 0,
    lastPerformedAt: 0,
    achievedAt: 0,
  };
}

function countedSets(exercise: Exercise): WorkoutSet[] {
  const done = exercise.sets.filter((s) => s.completed);
  return done.length > 0 ? done : exercise.sets;
}

/** Build per-exercise personal records across finished sessions. */
export function buildRecords(sessions: Session[]): Record<string, ExerciseRecord> {
  const records: Record<string, ExerciseRecord> = {};
  const ordered = [...sessions].sort((a, b) => a.startedAt - b.startedAt);

  for (const session of ordered) {
    for (const exercise of session.exercises) {
      const key = normalizeName(exercise.name);
      if (!key) continue;
      const record = records[key] ?? emptyRecord(exercise.name.trim());
      const sets = countedSets(exercise);
      let sessionVolume = 0;

      for (const set of sets) {
        sessionVolume += set.reps * set.weight;
        record.totalSets += 1;
        if (set.weight > record.bestWeight) {
          record.bestWeight = set.weight;
          record.bestWeightReps = set.reps;
          record.achievedAt = session.startedAt;
        }
        const e1rm = estimateOneRepMax(set.weight, set.reps);
        if (e1rm > record.bestE1rm) {
          record.bestE1rm = e1rm;
          record.bestE1rmWeight = set.weight;
          record.bestE1rmReps = set.reps;
          record.achievedAt = session.startedAt;
        }
      }

      if (sessionVolume > record.bestSessionVolume) {
        record.bestSessionVolume = sessionVolume;
      }
      if (sets.length > 0) record.lastPerformedAt = session.startedAt;
      records[key] = record;
    }
  }

  return records;
}

/** Decide whether a new set beats the stored record for that exercise. */
export function detectPR(
  record: ExerciseRecord | undefined,
  weight: number,
  reps: number,
): PRKind | null {
  if (weight <= 0 || reps <= 0) return null;
  if (!record) return "weight";
  if (weight > record.bestWeight) return "weight";
  if (estimateOneRepMax(weight, reps) > record.bestE1rm + 0.001) return "e1rm";
  return null;
}

export const PR_LABEL: Record<PRKind, string> = {
  weight: "Heaviest ever",
  e1rm: "Best est. 1RM",
};
