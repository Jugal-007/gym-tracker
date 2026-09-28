import { createFileRoute } from "@tanstack/react-router";
import { useGym } from "@/hooks/useGymStore";
import { SessionHistory } from "@/components/gym/SessionHistory";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { sessions, deleteSession, saveSessionAsTemplate } = useGym();

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">History</h1>
        <p className="mt-1 text-muted-foreground font-medium">Your completed workouts.</p>
      </div>
      
      {sessions.length > 0 ? (
        <SessionHistory
          sessions={sessions}
          onDelete={deleteSession}
          onSaveTemplate={saveSessionAsTemplate}
        />
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card/30 p-8 text-center text-muted-foreground">
          No workouts recorded yet.
        </div>
      )}
    </div>
  );
}
