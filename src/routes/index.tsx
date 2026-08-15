import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { generateId, getExerciseNames, loadSessions, saveSessions } from "@/components/gym/storage";
import type { Session, Template } from "@/components/gym/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LFT — Minimal Workout Tracker" },
      {
        name: "description",
        content:
          "Track your gym sessions with a minimal black-and-white workout logger. Log exercises, sets, reps, and weight live as you train.",
      },
      { property: "og:title", content: "LFT — Minimal Workout Tracker" },
      {
        property: "og:description",
        content: "Track your gym sessions with a minimal black-and-white workout logger.",
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

  const exerciseNames = useMemo(() => getExerciseNames(sessions), [sessions]);

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
      return exists ? prev.map((t) => (t.id === template.id ? template : t)) : [template, ...prev];
    });
  }

  function saveSessionAsTemplate(session: Session) {
    const name =
      session.templateName ??
      (session.exercises[0]?.name ? `${session.exercises[0].name} day` : "New template");
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
            <span className="whitespace-nowrap text-lg font-extrabold tracking-wider">LFT</span>
          </button>
          <TabNav view={view} setView={setView} />
        </div>
      </header>

      <main className="px-4 py-6">
        {/* key forces re-mount → triggers view-enter animation on tab switch */}
        <div key={view} className="animate-view-enter">
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
              onDeleteSession={deleteSession}
              onSaveTemplate={saveSessionAsTemplate}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Sliding Tab Navigation ─── */

const TAB_ITEMS: { key: View; label: string; icon: React.ReactNode }[] = [
  { key: "landing", label: "Start", icon: undefined },
  { key: "templates", label: "Plans", icon: <LayoutTemplate className="h-4 w-4" /> },
  { key: "stats", label: "Stats", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "history", label: "History", icon: <History className="h-4 w-4" /> },
];

function TabNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const navRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<View, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<{ x: number; width: number; ready: boolean }>({
    x: 0,
    width: 0,
    ready: false,
  });

  const updateIndicator = useCallback(() => {
    const button = tabRefs.current.get(view);
    const nav = navRef.current;
    if (button && nav) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = button.getBoundingClientRect();
      setIndicator({
        x: btnRect.left - navRect.left,
        width: btnRect.width,
        ready: true,
      });
    } else {
      setIndicator((prev) => ({ ...prev, ready: false }));
    }
  }, [view]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  return (
    <nav ref={navRef} className="relative flex items-center gap-1">
      {/* Sliding pill indicator */}
      <div
        className={cn("tab-indicator", indicator.ready ? "opacity-100" : "opacity-0")}
        style={{
          width: indicator.width,
          transform: `translate3d(${indicator.x}px, 0, 0)`,
        }}
      />
      {TAB_ITEMS.map((tab) => (
        <button
          key={tab.key}
          ref={(el) => {
            if (el) tabRefs.current.set(tab.key, el);
          }}
          onClick={() => setView(tab.key)}
          className={cn(
            "relative z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 active:scale-[0.96]",
            "px-2 sm:px-3",
            view === tab.key
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.icon}
          <span className={cn(tab.icon && "hidden sm:inline")}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ─── Landing View ─── */

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
  onDeleteSession: (id: string) => void;
  onSaveTemplate: (session: Session) => void;
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
  onDeleteSession,
  onSaveTemplate,
}: LandingViewProps) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Ready to train?</h1>
        <p className="mt-2 text-muted-foreground">Start a session and log your sets as you go.</p>
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
          className="inline-flex items-center justify-center rounded-lg bg-foreground p-3 text-primary-foreground transition-all hover:bg-foreground/90 hover:shadow-md active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100"
          aria-label="Start workout with exercise"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={onStart}
        className="mb-10 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-foreground/90 hover:shadow-md active:scale-[0.97]"
      >
        <Dumbbell className="h-5 w-5" />
        Start Empty Workout
      </button>

      <div className="mb-10">
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
            {templates.slice(0, 4).map((template) => (
              <button
                key={template.id}
                onClick={() => onStartTemplate(template)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-foreground/30 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.99]"
              >
                <span>
                  <span className="block font-medium text-foreground">{template.name}</span>
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
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent sessions
          </h2>
          <SessionHistory
            sessions={recentSessions}
            onDelete={onDeleteSession}
            onSaveTemplate={onSaveTemplate}
          />
        </div>
      )}
    </div>
  );
}
