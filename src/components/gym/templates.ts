import { z } from "zod";
import { generateId } from "./storage";
import type { Session, Template, TemplateExercise } from "./types";

const TEMPLATES_KEY = "gym-tracker-templates-v1";

const TemplateExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetSets: z.number().nonnegative(),
  targetReps: z.number().nonnegative(),
  targetWeight: z.number().nonnegative(),
});

const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  exercises: z.array(TemplateExerciseSchema),
  createdAt: z.number(),
});

const TemplatesListSchema = z.array(TemplateSchema);

export function loadTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = TemplatesListSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => TemplateSchema.safeParse(item))
        .filter((res): res is z.SafeParseSuccess<Template> => res.success)
        .map((res) => res.data);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: Template[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function emptyTemplateExercise(): TemplateExercise {
  return {
    id: generateId(),
    name: "",
    targetSets: 3,
    targetReps: 8,
    targetWeight: 0,
  };
}

/** Derive a reusable template from a logged session (uses its heaviest set as target). */
export function templateFromSession(session: Session, name: string): Template {
  return {
    id: generateId(),
    name: name.trim() || "Untitled template",
    createdAt: Date.now(),
    exercises: session.exercises.map((exercise) => {
      const best = exercise.sets.reduce((top, set) => (set.weight > top.weight ? set : top), {
        weight: 0,
        reps: 8,
      } as { weight: number; reps: number });
      return {
        id: generateId(),
        name: exercise.name,
        targetSets: Math.max(1, exercise.sets.length),
        targetReps: best.reps || 8,
        targetWeight: best.weight || 0,
      };
    }),
  };
}

export function sessionFromTemplate(template: Template): Session {
  return {
    id: generateId(),
    startedAt: Date.now(),
    endedAt: null,
    templateId: template.id,
    templateName: template.name,
    exercises: template.exercises
      .filter((exercise) => exercise.name.trim())
      .map((exercise) => ({
        id: generateId(),
        name: exercise.name.trim(),
        sets: [],
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetWeight: exercise.targetWeight,
      })),
  };
}
