import { z } from "zod";
import { generateId } from "./storage";
import type { Session, Template, TemplateExercise } from "./types";

const TEMPLATES_KEY = "gym-tracker-templates-v1";

const TemplateExerciseSchema = z.object({
  id: z.string().default(() => generateId()),
  name: z.string(),
  targetSets: z.coerce.number().nonnegative().default(3),
  targetReps: z.coerce.number().nonnegative().default(8),
  targetWeight: z.coerce.number().nonnegative().default(0),
});

const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  exercises: z.array(TemplateExerciseSchema),
  createdAt: z.union([z.number(), z.string().transform((s) => new Date(s).getTime())]),
  updatedAt: z.union([z.number(), z.string().transform((s) => new Date(s).getTime())]).optional(),
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

/** Pre-configured standard starter templates for instant setup */
export const STARTER_TEMPLATES: Template[] = [
  {
    id: "starter-push",
    name: "Push Day",
    createdAt: Date.now() - 3000,
    exercises: [
      { id: "starter-p1", name: "Bench Press", targetSets: 4, targetReps: 8, targetWeight: 60 },
      {
        id: "starter-p2",
        name: "Incline Dumbbell Press",
        targetSets: 3,
        targetReps: 10,
        targetWeight: 24,
      },
      { id: "starter-p3", name: "Overhead Press", targetSets: 3, targetReps: 8, targetWeight: 40 },
      {
        id: "starter-p4",
        name: "Dumbbell Lateral Raises",
        targetSets: 4,
        targetReps: 12,
        targetWeight: 10,
      },
      {
        id: "starter-p5",
        name: "Tricep Extension",
        targetSets: 3,
        targetReps: 12,
        targetWeight: 25,
      },
    ],
  },
  {
    id: "starter-pull",
    name: "Pull Day",
    createdAt: Date.now() - 2000,
    exercises: [
      { id: "starter-l1", name: "Deadlift", targetSets: 3, targetReps: 5, targetWeight: 100 },
      { id: "starter-l2", name: "Barbell Row", targetSets: 4, targetReps: 8, targetWeight: 60 },
      { id: "starter-l3", name: "Lat Pulldown", targetSets: 3, targetReps: 10, targetWeight: 55 },
      { id: "starter-l4", name: "Pull Up", targetSets: 3, targetReps: 8, targetWeight: 0 },
      { id: "starter-l5", name: "Bicep Curl", targetSets: 4, targetReps: 12, targetWeight: 14 },
    ],
  },
  {
    id: "starter-legs",
    name: "Leg Day",
    createdAt: Date.now() - 1000,
    exercises: [
      { id: "starter-g1", name: "Squat", targetSets: 4, targetReps: 6, targetWeight: 80 },
      { id: "starter-g2", name: "Leg Press", targetSets: 3, targetReps: 10, targetWeight: 140 },
      { id: "starter-g3", name: "Leg Extension", targetSets: 3, targetReps: 12, targetWeight: 45 },
      { id: "starter-g4", name: "Leg Curl", targetSets: 3, targetReps: 12, targetWeight: 40 },
      { id: "starter-g5", name: "Calf Raises", targetSets: 4, targetReps: 15, targetWeight: 50 },
    ],
  },
];

/** Recover templates from past workout sessions if templates were cleared or missing */
export function recoverTemplatesFromSessions(sessions: Session[]): Template[] {
  const map = new Map<string, Template>();
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  for (const session of sorted) {
    if (session.exercises.length === 0) continue;
    const name =
      session.templateName?.trim() ||
      (session.exercises[0]?.name ? `${session.exercises[0].name} Day` : "Custom Template");
    map.set(name.toLowerCase(), templateFromSession(session, name));
  }
  return Array.from(map.values());
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

/**
 * Smartly suggests the next template to use based on least-recently-used (LRU) logic.
 * This creates a natural rotation (e.g. Push -> Pull -> Legs).
 */
export function getSmartSuggestedTemplate(
  templates: Template[],
  sessions: Session[],
): Template | null {
  if (templates.length === 0) return null;
  if (templates.length === 1) return templates[0] || null;

  const lastUsed = new Map<string, number>();
  for (const t of templates) {
    lastUsed.set(t.id, 0);
  }

  for (const session of sessions) {
    if (session.templateId && lastUsed.has(session.templateId)) {
      const current = lastUsed.get(session.templateId) || 0;
      if (session.startedAt > current) {
        lastUsed.set(session.templateId, session.startedAt);
      }
    } else if (session.templateName) {
      const matched = templates.find(
        (t) => t.name.toLowerCase() === session.templateName?.toLowerCase(),
      );
      if (matched) {
        const current = lastUsed.get(matched.id) || 0;
        if (session.startedAt > current) {
          lastUsed.set(matched.id, session.startedAt);
        }
      }
    }
  }

  let oldestTemplate = templates[0];
  let oldestTime = Infinity;

  for (const t of templates) {
    const time = lastUsed.get(t.id) || 0;
    if (time < oldestTime) {
      oldestTime = time;
      oldestTemplate = t;
    }
  }

  return oldestTemplate || null;
}
