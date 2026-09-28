import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell, Plus } from "lucide-react";
import { useGym } from "@/hooks/useGymStore";
import { Templates } from "@/components/gym/Templates.tsx";
import { getExerciseNames } from "@/components/gym/storage";
import { useMemo } from "react";

import { flushSync } from "react-dom";

export const Route = createFileRoute("/workout/")({
  component: WorkoutHub,
});

function WorkoutHub() {
  const { templates, sessions, startSession, startFromTemplate, saveTemplate, deleteTemplate } = useGym();
  const navigate = useNavigate();

  const exerciseNames = useMemo(() => getExerciseNames(sessions, templates), [sessions, templates]);

  function handleStartEmpty() {
    flushSync(() => {
      startSession();
    });
    navigate({ to: "/workout/active" });
  }

  function handleStartTemplate(t: any) {
    flushSync(() => {
      startFromTemplate(t);
    });
    navigate({ to: "/workout/active" });
  }

  return (
    <div className="space-y-8">
      <div className="pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Workout Hub</h1>
        <p className="mt-2 text-muted-foreground font-medium">Start a new session or choose a routine.</p>
      </div>

      <button
        onClick={handleStartEmpty}
        className="flex w-full items-center justify-center gap-3 rounded-3xl bg-foreground px-6 py-5 text-lg font-bold text-background transition-all hover:bg-foreground/90 hover:-translate-y-0.5 active:scale-[0.98] shadow-md"
      >
        <Dumbbell className="h-6 w-6" />
        Start Empty Workout
      </button>

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
