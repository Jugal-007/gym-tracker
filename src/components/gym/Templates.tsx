import { useState } from "react";
import { LayoutTemplate, Play, Plus, Trash2, X } from "lucide-react";
import { ExerciseNameInput } from "./ExerciseNameInput";
import { generateId } from "./storage";
import { emptyTemplateExercise } from "./templates";
import type { Template, TemplateExercise } from "./types";

interface TemplatesProps {
  templates: Template[];
  exerciseNames: string[];
  onStart: (template: Template) => void;
  onSave: (template: Template) => void;
  onDelete: (id: string) => void;
}

export function Templates({
  templates,
  exerciseNames,
  onStart,
  onSave,
  onDelete,
}: TemplatesProps) {
  const [editing, setEditing] = useState<Template | null>(null);

  function newTemplate() {
    setEditing({
      id: generateId(),
      name: "",
      createdAt: Date.now(),
      exercises: [emptyTemplateExercise()],
    });
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
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-foreground/90 active:scale-[0.96]"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="animate-fade-in py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border">
            <LayoutTemplate className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground">No templates yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Save your usual routine and start it in one tap.
          </p>
        </div>
      ) : (
        templates.map((template, index) => (
          <div
            key={template.id}
            className="animate-slide-up rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-foreground/20"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{template.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {template.exercises.length} exercises ·{" "}
                  {template.exercises.reduce((s, e) => s + e.targetSets, 0)} target sets
                </p>
                <ul className="mt-3 space-y-1">
                  {template.exercises.map((exercise) => (
                    <li
                      key={exercise.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{exercise.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {exercise.targetSets}×{exercise.targetReps} @ {exercise.targetWeight} kg
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => onStart(template)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-foreground/90 active:scale-[0.96]"
                >
                  <Play className="h-4 w-4" />
                  Start
                </button>
                <button
                  onClick={() => onDelete(template.id)}
                  className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-[0.96]"
                  aria-label={`Delete ${template.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
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

function TemplateEditor({
  template,
  exerciseNames,
  onCancel,
  onSave,
}: TemplateEditorProps) {
  const [name, setName] = useState(template.name);
  const [exercises, setExercises] = useState<TemplateExercise[]>(
    template.exercises.length ? template.exercises : [emptyTemplateExercise()]
  );

  function update(id: string, patch: Partial<TemplateExercise>) {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === id ? { ...exercise, ...patch } : exercise
      )
    );
  }

  const canSave =
    name.trim().length > 0 && exercises.some((exercise) => exercise.name.trim());

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
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Template name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Push day"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-foreground focus:ring-2 focus:ring-foreground/10"
        />
      </div>

      <div className="space-y-3">
        {exercises.map((exercise, index) => (
          <div
            key={exercise.id}
            className="animate-slide-up rounded-xl border border-border bg-card p-4 shadow-sm"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="mb-3 flex items-end gap-2">
              <ExerciseNameInput
                suggestions={exerciseNames}
                value={exercise.name}
                onChange={(value) => update(exercise.id, { name: value })}
                onSubmit={() => {}}
                placeholder="Exercise name..."
              />
              <button
                onClick={() =>
                  setExercises((prev) => prev.filter((e) => e.id !== exercise.id))
                }
                className="inline-flex items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-[0.96]"
                aria-label="Remove exercise"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label="Sets"
                value={exercise.targetSets}
                onChange={(v) => update(exercise.id, { targetSets: v })}
              />
              <NumberField
                label="Reps"
                value={exercise.targetReps}
                onChange={(v) => update(exercise.id, { targetReps: v })}
              />
              <NumberField
                label="Weight (kg)"
                value={exercise.targetWeight}
                step={0.5}
                onChange={(v) => update(exercise.id, { targetWeight: v })}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExercises((prev) => [...prev, emptyTemplateExercise()])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-all hover:border-foreground/40 hover:text-foreground active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" />
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
        className="w-full rounded-xl bg-foreground px-6 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        Save template
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        type="number"
        min={0}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-foreground focus:ring-2 focus:ring-foreground/10"
      />
    </div>
  );
}
