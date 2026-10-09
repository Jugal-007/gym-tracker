import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell, Play } from "lucide-react";
import { useGym } from "@/hooks/useGymStore";
import { Templates } from "@/components/gym/Templates.tsx";
import { getExerciseNames } from "@/components/gym/storage";
import { useMemo } from "react";

import { flushSync } from "react-dom";
import type { Template } from "@/components/gym/types";

export const Route = createFileRoute("/workout/")({
  component: WorkoutHub,
});

function WorkoutHub() {
  const {
    templates,
    sessions,
    activeSession,
    startSession,
    startFromTemplate,
    saveTemplate,
    deleteTemplate,
  } = useGym();
  const navigate = useNavigate();

  const exerciseNames = useMemo(() => getExerciseNames(sessions, templates), [sessions, templates]);

  function handleStartEmpty() {
    flushSync(() => {
      startSession();
    });
    navigate({ to: "/workout/active" });
  }

  function handleStartTemplate(t: Template) {
    flushSync(() => {
      startFromTemplate(t);
    });
    navigate({ to: "/workout/active" });
  }

  return (
    <div className="space-y-7 pb-6">
      <div className="pt-2">
        <p className="text-sm font-medium text-muted-foreground">Train your way</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">Workout</h1>
        <p className="mt-2 text-muted-foreground">Start fresh or follow one of your routines.</p>
      </div>

      {activeSession ? (
        <button
          onClick={() => navigate({ to: "/workout/active" })}
          className="flex w-full items-center justify-between rounded-[1.6rem] border border-primary/30 bg-primary p-5 text-left text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
        >
          <span>
            <span className="block text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/70">
              Workout in progress
            </span>
            <span className="mt-1 block text-xl font-extrabold">
              Resume {activeSession.templateName || "your workout"}
            </span>
            <span className="mt-1 block text-sm text-primary-foreground/75">
              {activeSession.exercises.length} exercises added
            </span>
          </span>
          <Play className="h-6 w-6" fill="currentColor" />
        </button>
      ) : (
        <button
          onClick={handleStartEmpty}
          className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-primary px-6 py-5 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <Dumbbell className="h-6 w-6" /> Start Empty Workout
        </button>
      )}

      <div className="-mx-4 px-4">
        <Templates
          templates={templates}
          exerciseNames={exerciseNames}
          sessions={sessions}
          onStart={handleStartTemplate}
          onSave={saveTemplate}
          onDelete={deleteTemplate}
        />
      </div>
    </div>
  );
}
