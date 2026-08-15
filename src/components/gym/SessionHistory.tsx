import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Trash2, Calendar, LayoutTemplate, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeSessionSets,
  computeSessionVolume,
} from "./storage";
import type { Session } from "./types";

interface SessionHistoryProps {
  sessions: Session[];
  onDelete: (id: string) => void;
  onSaveTemplate?: (session: Session) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

export function SessionHistory({
  sessions,
  onDelete,
  onSaveTemplate,
}: SessionHistoryProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      onDelete(id);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 350);
  }

  if (sessions.length === 0) {
    return (
      <div className="animate-fade-in py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border animate-float">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground">No workouts yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Finish your first session to see it here.
        </p>
      </div>
    );
  }

  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <div className="mx-auto max-w-xl space-y-3 animate-fade-in">
      <h2 className="px-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        History ({sessions.length})
      </h2>
      {sorted.map((session, index) => {
        const duration = session.endedAt
          ? session.endedAt - session.startedAt
          : 0;
        const sets = computeSessionSets(session);
        const volume = computeSessionVolume(session);
        const isExpanded = expanded[session.id];
        const isDeleting = deletingIds.has(session.id);
        const prs = session.exercises.reduce(
          (sum, ex) => sum + ex.sets.filter((s) => s.pr).length,
          0
        );

        return (
          <div
            key={session.id}
            className={cn(
              "animate-slide-up overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-foreground/20 hover:shadow-md",
              isDeleting && "deleting"
            )}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <button
              onClick={() =>
                setExpanded((prev) => ({ ...prev, [session.id]: !isExpanded }))
              }
              className="flex w-full items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <p className="flex items-center gap-2 font-medium text-foreground">
                  {format(session.startedAt, "EEEE, MMM d")}
                  {prs > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      <Trophy className="h-3 w-3" />
                      {prs} PR
                    </span>
                  )}
                </p>
                {session.templateName && (
                  <p className="text-xs text-muted-foreground">
                    {session.templateName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(session.startedAt, "h:mm a")} ·{" "}
                  {duration > 0 ? formatDuration(duration) : "0s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {volume.toLocaleString()} kg
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.exercises.length} exercises · {sets} sets
                  </p>
                </div>
                {/* Chevron with rotation animation */}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-300",
                    isExpanded && "rotate-180"
                  )}
                />
              </div>
            </button>

            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border px-4 py-3">
                  {session.exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No exercises logged.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {session.exercises.map((exercise, exIndex) => {
                        const exVolume = exercise.sets.reduce(
                          (sum, set) => sum + set.reps * set.weight,
                          0
                        );
                        const exPr = exercise.sets.some((set) => set.pr);
                        return (
                          <li
                            key={exercise.id}
                            className={cn(
                              "flex items-center justify-between text-sm",
                              isExpanded && "animate-slide-up"
                            )}
                            style={isExpanded ? { animationDelay: `${exIndex * 40}ms` } : undefined}
                          >
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                              {exercise.name}
                              {exPr && <Trophy className="h-3.5 w-3.5" />}
                            </span>
                            <span className="text-muted-foreground">
                              {exercise.sets.length} sets · {exVolume.toLocaleString()} kg
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Total volume: {volume.toLocaleString()} kg
                    </p>
                    <div className="flex items-center gap-1">
                    {onSaveTemplate && (
                      <button
                        onClick={() => onSaveTemplate(session)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.96]"
                      >
                        <LayoutTemplate className="h-3.5 w-3.5" />
                        Save as template
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-destructive transition-all hover:bg-destructive/10 active:scale-[0.96]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
