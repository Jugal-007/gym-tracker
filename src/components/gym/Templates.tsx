import { useState } from "react";
import { LayoutTemplate, Play, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseNameInput } from "./ExerciseNameInput";
import { generateId } from "./storage";
import { emptyTemplateExercise } from "./templates";
import { StepperInput } from "@/components/ui/StepperInput";
import { SwipeToDelete } from "@/components/ui/SwipeToDelete";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Template, TemplateExercise } from "./types";

interface TemplatesProps {
  templates: Template[];
  exerciseNames: string[];
  onStart: (template: Template) => void;
  onSave: (template: Template) => void;
  onDelete: (id: string) => void;
}

export function Templates({ templates, exerciseNames, onStart, onSave, onDelete }: TemplatesProps) {
  const [editing, setEditing] = useState<Template | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  function newTemplate() {
    setEditing({
      id: generateId(),
      name: "",
      createdAt: Date.now(),
      exercises: [emptyTemplateExercise()],
    });
  }

  function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      onDelete(id);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  }

  if (editing) {
    return (
      <TemplateEditor
        template={editing}
        exerciseNames={exerciseNames}
        onCancel={() => setEditing(null)}
        onSave={(template) => {
          onSave(template);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Templates ({templates.length})
        </h2>
        <button
          onClick={newTemplate}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-transparent px-3.5 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-12 w-12" strokeWidth={1.5} />}
          title="No templates yet"
          description="Save your usual routine and start it in one tap."
        />
      ) : (
        templates.map((template) => (
            <SwipeToDelete
            key={template.id}
            onDelete={() => handleDelete(template.id)}
            className="rounded-2xl"
          >
            <div
              className={cn(
                "glass rounded-2xl p-4 transition-all hover:border-foreground/20 hover:shadow-md",
                deletingIds.has(template.id) && "deleting",
              )}
            >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{template.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {template.exercises.length} exercises ·{" "}
                  {template.exercises.reduce((s, e) => s + e.targetSets, 0)} target sets
                </p>
                <ul className="mt-3 space-y-1">
                  {template.exercises.map((exercise) => (
                    <li key={exercise.id} className="flex flex-row items-baseline justify-between gap-4 text-sm">
                      <span className="truncate flex-1 text-left text-foreground">{exercise.name}</span>
                      <span className="whitespace-nowrap font-mono text-sm text-muted-foreground">
                        {exercise.targetSets} × {exercise.targetReps}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            </div>
          </SwipeToDelete>
        ))
      )}
    </div>
  );
}

interface TemplateEditorProps {
  template: Template;
  exerciseNames: string[];
  onCancel: () => void;
  onSave: (template: Template) => void;
}

function TemplateEditor({ template, exerciseNames, onCancel, onSave }: TemplateEditorProps) {
  const [name, setName] = useState(template.name);
  const [exercises, setExercises] = useState<TemplateExercise[]>(
    template.exercises.length ? template.exercises : [emptyTemplateExercise()],
  );

  function update(id: string, patch: Partial<TemplateExercise>) {
    setExercises((prev) =>
      prev.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise)),
    );
  }

  const canSave = name.trim().length > 0 && exercises.some((exercise) => exercise.name.trim());

  return (
    <div className="mx-auto max-w-xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Edit template
        </h2>
        <button
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition-all hover:bg-muted active:scale-[0.96]"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Template name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Push day"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-foreground focus:ring-2 focus:ring-foreground/10"
        />
      </div>

      <div className="space-y-4">
        {exercises.map((exercise) => (
          <SwipeToDelete
            key={exercise.id}
            onDelete={() => setExercises((prev) => prev.filter((e) => e.id !== exercise.id))}
            className="rounded-2xl"
          >
            <div className="glass rounded-2xl p-5 transition-all duration-300">
            <div className="mb-3 flex items-end gap-2">
              <ExerciseNameInput
                suggestions={exerciseNames}
                value={exercise.name}
                onChange={(value) => update(exercise.id, { name: value })}
                onSubmit={() => {}}
                placeholder="Exercise name..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StepperInput
                label="Sets"
                value={String(exercise.targetSets)}
                onChange={(v) => update(exercise.id, { targetSets: Number(v) || 0 })}
                min={1}
                step={1}
              />
              <StepperInput
                label="Reps"
                value={String(exercise.targetReps)}
                onChange={(v) => update(exercise.id, { targetReps: Number(v) || 0 })}
                min={1}
                step={1}
              />
            </div>
            </div>
          </SwipeToDelete>
        ))}
      </div>

      <button
        onClick={() => setExercises((prev) => [...prev, emptyTemplateExercise()])}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/50 py-4 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/40 hover:text-foreground active:scale-95"
      >
        <Plus className="h-5 w-5" />
        Add exercise
      </button>

      <button
        onClick={() =>
          onSave({
            ...template,
            name: name.trim(),
            exercises: exercises.filter((exercise) => exercise.name.trim()),
          })
        }
        disabled={!canSave}
        className="w-full rounded-2xl bg-foreground px-6 py-4 text-base font-bold text-background transition-all hover:bg-foreground/90 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:active:scale-100"
      >
        Save template
      </button>
    </div>
  );
}

