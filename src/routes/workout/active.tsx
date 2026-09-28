import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useGym } from "@/hooks/useGymStore";
import { ActiveSession } from "@/components/gym/ActiveSession";
import { WorkoutCompleteScreen } from "@/components/gym/WorkoutCompleteScreen";
import { useMemo, useState } from "react";
import { getExerciseNames } from "@/components/gym/storage";
import { buildRecords } from "@/components/gym/records";
import type { Session } from "@/components/gym/types";

export const Route = createFileRoute("/workout/active")({
  component: ActiveWorkout,
});

function ActiveWorkout() {
  const {
    activeSession,
    updateActiveSession,
    finishSession,
    cancelSession,
    sessions,
    templates,
    isLoaded
  } = useGym();
  const navigate = useNavigate();

  const [completedSession, setCompletedSession] = useState<Session | null>(null);

  const exerciseNames = useMemo(() => getExerciseNames(sessions, templates), [sessions, templates]);
  const records = useMemo(() => buildRecords(sessions), [sessions]);

  if (!isLoaded) {
    return <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">Loading gym data...</div>;
  }

  if (!activeSession && !completedSession) {
    return <Navigate to="/" />;
  }

  function handleFinish(session: Session) {
    const finished = { ...session, endedAt: Date.now() };
    finishSession(finished);
    setCompletedSession(finished);
  }

  function handleCancel() {
    cancelSession();
    navigate({ to: "/" });
  }

  if (completedSession) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <WorkoutCompleteScreen 
          session={completedSession} 
          allSessions={sessions} 
          onViewResults={() => navigate({ to: "/history" })}
          onGoHome={() => navigate({ to: "/" })}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <ActiveSession
        session={activeSession!}
        exerciseNames={exerciseNames}
        records={records}
        onUpdate={updateActiveSession}
        onFinish={handleFinish}
        onCancel={handleCancel}
      />
    </div>
  );
}
