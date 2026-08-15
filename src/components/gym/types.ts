export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  /** Marked when this set beat a previous personal record. */
  pr?: PRKind | null;
}

export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  targetSets?: number;
  targetReps?: number;
  targetWeight?: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  exercises: Exercise[];
  templateId?: string | null;
  templateName?: string | null;
}

export type PRKind = "weight" | "e1rm";

export interface ExerciseRecord {
  name: string;
  bestWeight: number;
  bestWeightReps: number;
  bestE1rm: number;
  bestE1rmWeight: number;
  bestE1rmReps: number;
  bestSessionVolume: number;
  totalSets: number;
  lastPerformedAt: number;
  achievedAt: number;
}

export interface TemplateExercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
}

export interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: number;
}
