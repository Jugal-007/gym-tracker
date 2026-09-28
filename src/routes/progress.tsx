import { createFileRoute } from "@tanstack/react-router";
import { useGym } from "@/hooks/useGymStore";
import { StatsPanel } from "@/components/gym/StatsPanel";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const { sessions, templates } = useGym();

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Progress</h1>
        <p className="mt-1 text-muted-foreground font-medium">Strength, volume, and consistency.</p>
      </div>
      <StatsPanel sessions={sessions} templates={templates} />
    </div>
  );
}
