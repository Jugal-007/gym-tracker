import { z } from "zod";
import type { Exercise, Session } from "./types";

const STORAGE_KEY = "gym-tracker-sessions-v1";

const WorkoutSetSchema = z.object({
  id: z.string(),
  reps: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  completed: z.boolean(),
  pr: z.enum(["weight", "e1rm"]).nullable().optional(),
});

const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sets: z.array(WorkoutSetSchema),
  targetSets: z.number().optional(),
  targetReps: z.number().optional(),
  targetWeight: z.number().optional(),
});

const SessionSchema = z.object({
  id: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  exercises: z.array(ExerciseSchema),
  templateId: z.string().nullable().optional(),
  templateName: z.string().nullable().optional(),
});

const SessionsListSchema = z.array(SessionSchema);

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = SessionsListSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    // If some entries are valid, salvage valid sessions
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => SessionSchema.safeParse(item))
        .filter((res): res is z.SafeParseSuccess<Session> => res.success)
        .map((res) => res.data);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getExerciseNames(sessions: Session[]): string[] {
  const names = new Set<string>();
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const trimmed = exercise.name.trim();
      if (trimmed) {
        names.add(trimmed);
      }
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function computeVolume(exercise: Exercise): number {
  return exercise.sets.reduce((sum, set) => sum + set.reps * set.weight, 0);
}

export function computeSessionVolume(session: Session): number {
  return session.exercises.reduce((sum, ex) => sum + computeVolume(ex), 0);
}

export function computeSessionSets(session: Session): number {
  return session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
