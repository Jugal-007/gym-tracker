import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Dumbbell, History, LayoutTemplate, Play, Plus } from "lucide-react";
import { ActiveSession } from "@/components/gym/ActiveSession";
import { ExerciseNameInput } from "@/components/gym/ExerciseNameInput";
import { SessionHistory } from "@/components/gym/SessionHistory";
import { StatsPanel } from "@/components/gym/StatsPanel";
import { Templates } from "@/components/gym/Templates.tsx";
import { buildRecords } from "@/components/gym/records";
import {
  loadTemplates,
  saveTemplates,
  sessionFromTemplate,
  templateFromSession,
} from "@/components/gym/templates";
import {
  generateId,
  getExerciseNames,
  loadSessions,
  saveSessions,
} from "@/components/gym/storage";
import type { Session, Template } from "@/components/gym/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gym Log — Minimal Workout Tracker" },
      {
        name: "description",
        content:
          "Track your gym sessions with a minimal black-and-white workout logger. Log exercises, sets, reps, and weight live as you train.",
      },
      { property: "og:title", content: "Gym Log — Minimal Workout Tracker" },
      {
        property: "og:description",
        content:
          "Track your gym sessions with a minimal black-and-white workout logger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type View = "landing" | "active" | "history" | "templates" | "stats";

function Index() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("landing");
  const [newExerciseName, setNewExerciseName] = useState("");

  useEffect(() => {
    setSessions(loadSessions());
    setTemplates(loadTemplates());
  }, []);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  const exerciseNames = useMemo(
    () => getExerciseNames(sessions),
    [sessions]
  );

  const records = useMemo(() => buildRecords(sessions), [sessions]);

  function startSession() {
    const session: Session = {
      id: generateId(),
      startedAt: Date.now(),
      endedAt: null,
      exercises: [],
    };
    setActiveSession(session);
    setView("active");
  }

  function updateActiveSession(session: Session) {
    setActiveSession(session);
  }

  function finishSession(session: Session) {
    const finished = { ...session, endedAt: Date.now() };
    setSessions((prev) => [finished, ...prev]);
    setActiveSession(null);
    setView("landing");
  }

  function cancelSession() {
    setActiveSession(null);
    setView("landing");
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function startFromTemplate(template: Template) {
    setActiveSession(sessionFromTemplate(template));
    setView("active");
  }

  function saveTemplate(template: Template) {
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === template.id);
      return exists
        ? prev.map((t) => (t.id === template.id ? template : t))
        : [template, ...prev];
    });
  }

  function saveSessionAsTemplate(session: Session) {
    const name =
      session.templateName ??
      (session.exercises[0]?.name
        ? `${session.exercises[0].name} day`
        : "New template");
    saveTemplate(templateFromSession(session, name));
    setView("templates");
  }

  function deleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function addExerciseFromLanding() {
    const trimmed = newExerciseName.trim();
    if (!trimmed) return;
    const session: Session = {
      id: generateId(),
      startedAt: Date.now(),
      endedAt: null,
      exercises: [
        {
          id: generateId(),
          name: trimmed,
          sets: [],
        },
      ],
    };
    setActiveSession(session);
    setNewExerciseName("");
    setView("active");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <button
            onClick={() => setView("landing")}
            className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-70"
          >
            <Dumbbell className="h-6 w-6" />
            <span className="whitespace-nowrap text-lg font-bold tracking-tight">
              Gym Log
            </span>
          </button>
          <nav className="flex items-center gap-1">
            <TabButton
              active={view === "landing"}
              onClick={() => setView("landing")}
              label="Start"
            />
            <TabButton
              active={view === "templates"}
              onClick={() => setView("templates")}
              label="Plans"
              icon={<LayoutTemplate className="h-4 w-4" />}
            />
            <TabButton
              active={view === "stats"}
              onClick={() => setView("stats")}
              label="Stats"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <TabButton
              active={view === "history"}
              onClick={() => setView("history")}
              label="History"
              icon={<History className="h-4 w-4" />}
            />
          </nav>
        </div>
      </header>

      <main className="px-4 py-6">
        {view === "active" && activeSession ? (
          <ActiveSession
            session={activeSession}
            exerciseNames={exerciseNames}
            records={records}
            onUpdate={updateActiveSession}
            onFinish={finishSession}
            onCancel={cancelSession}
          />
        ) : view === "history" ? (
          <SessionHistory
            sessions={sessions}
            onDelete={deleteSession}
            onSaveTemplate={saveSessionAsTemplate}
          />
        ) : view === "stats" ? (
          <StatsPanel sessions={sessions} />
        ) : view === "templates" ? (
          <Templates
            templates={templates}
            exerciseNames={exerciseNames}
            onStart={startFromTemplate}
            onSave={saveTemplate}
            onDelete={deleteTemplate}
          />
        ) : (
          <LandingView
            newExerciseName={newExerciseName}
            setNewExerciseName={setNewExerciseName}
            exerciseNames={exerciseNames}
            onStart={startSession}
            onQuickAdd={addExerciseFromLanding}
            recentSessions={sessions.slice(0, 3)}
            templates={templates}
            onStartTemplate={startFromTemplate}
            onManageTemplates={() => setView("templates")}
          />
        )}
      </main>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}

function TabButton({ active, onClick, label, icon }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-[0.96]",
        "px-2 sm:px-3",
        active
          ? "bg-foreground text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      <span className={cn(icon && "hidden sm:inline")}>{label}</span>
    </button>
  );
}

interface LandingViewProps {
  newExerciseName: string;
  setNewExerciseName: (value: string) => void;
  exerciseNames: string[];
  onStart: () => void;
  onQuickAdd: () => void;
  recentSessions: Session[];
  templates: Template[];
  onStartTemplate: (template: Template) => void;
  onManageTemplates: () => void;
}

function LandingView({
  newExerciseName,
  setNewExerciseName,
  exerciseNames,
  onStart,
  onQuickAdd,
  recentSessions,
  templates,
  onStartTemplate,
  onManageTemplates,
}: LandingViewProps) {
  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Ready to train?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Start a session and log your sets as you go.
        </p>
      </div>

      <div className="mb-8 flex items-end gap-2">
        <ExerciseNameInput
          suggestions={exerciseNames}
          value={newExerciseName}
          onChange={setNewExerciseName}
          onSubmit={onQuickAdd}
          placeholder="Quick start with an exercise..."
        />
        <button
          onClick={onQuickAdd}
          disabled={!newExerciseName.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-foreground p-3 text-primary-foreground transition-all hover:bg-foreground/90 active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100"
          aria-label="Start workout with exercise"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={onStart}
        className="mb-10 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-foreground/90 active:scale-[0.96]"
      >
        <Dumbbell className="h-5 w-5" />
        Start Empty Workout
      </button>

      <div className="mb-10 animate-fade-in">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Templates
          </h2>
          <button
            onClick={onManageTemplates}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Manage
          </button>
        </div>
        {templates.length === 0 ? (
          <button
            onClick={onManageTemplates}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-all hover:border-foreground/40 hover:text-foreground active:scale-[0.99]"
          >
            <LayoutTemplate className="h-4 w-4" />
            Create your first template
          </button>
        ) : (
          <div className="space-y-2">
            {templates.slice(0, 4).map((template, index) => (
              <button
                key={template.id}
                onClick={() => onStartTemplate(template)}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-slide-up flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-foreground/30 hover:-translate-y-0.5 active:scale-[0.99]"
              >
                <span>
                  <span className="block font-medium text-foreground">
                    {template.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {template.exercises.length} exercises
                  </span>
                </span>
                <Play className="h-4 w-4 text-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {recentSessions.length > 0 && (
        <div className="animate-fade-in">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent sessions
          </h2>
          <SessionHistory sessions={recentSessions} onDelete={() => {}} />
        </div>
      )}
    </div>
  );
}
