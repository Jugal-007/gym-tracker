import { createFileRoute } from "@tanstack/react-router";
import { AthleteJourney } from "@/components/gym/AthleteJourney";
import { useGym } from "@/hooks/useGymStore";

export const Route = createFileRoute("/journey")({ component: JourneyPage });

function JourneyPage() {
  const { sessions } = useGym();
  return (
    <div className="space-y-6 pt-2">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Your training arc</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
          Athlete Journey
        </h1>
      </div>
      <AthleteJourney sessions={sessions} />
    </div>
  );
}
