import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Dumbbell, History, LayoutTemplate, Play, Plus, Moon, Sun } from "lucide-react";
import { ActiveSession } from "@/components/gym/ActiveSession";
import { ExerciseNameInput } from "@/components/gym/ExerciseNameInput";
import { SessionHistory } from "@/components/gym/SessionHistory";
import { StatsPanel } from "@/components/gym/StatsPanel";
import { Templates } from "@/components/gym/Templates.tsx";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildRecords } from "@/components/gym/records";
import {
  loadTemplates,
  saveTemplates,
  sessionFromTemplate,
  templateFromSession,
} from "@/components/gym/templates";
import { generateId, getExerciseNames, loadSessions, saveSessions, loadActiveSession, saveActiveSession } from "@/components/gym/storage";
import type { Session, Template } from "@/components/gym/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

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
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setSessions(loadSessions());
    setTemplates(loadTemplates());
    const savedActive = loadActiveSession();
    if (savedActive) {
      setActiveSession(savedActive);
      setView("active");
    }
  }, []);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveActiveSession(activeSession);
  }, [activeSession]);

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
    <div className="relative min-h-screen bg-background pb-20 sm:pb-6 overflow-hidden">
      {/* Subtle monochrome ambient background for glassmorphism */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-70 dark:opacity-40">
        <div className="absolute top-[-10%] left-[-10%] h-[50vh] w-[50vw] rounded-full bg-foreground/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50vh] w-[50vw] rounded-full bg-foreground/20 blur-[120px]" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-20 border-b border-border/40 bg-card/60 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <button
            onClick={() => setView("landing")}
            className="flex items-center gap-2 text-foreground transition-all hover:opacity-70 active:scale-95"
          >
            <Dumbbell className="h-6 w-6" />
            <span className="whitespace-nowrap text-xl font-extrabold tracking-wider">LFT</span>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <TabNav view={view} setView={setView} hasActiveSession={activeSession !== null} />
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-colors hover:text-foreground focus:outline-none sm:bg-transparent"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={theme === "dark" ? "dark" : "light"}
                  initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  transition={{ duration: 0.2, type: "spring", bounce: 0.3 }}
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
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
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 block border-t border-border/40 bg-card/70 pb-safe pt-2 backdrop-blur-xl sm:hidden">
        <div className="mx-auto max-w-xl px-4 pb-2">
          <TabNav view={view} setView={setView} isMobile={true} hasActiveSession={activeSession !== null} />
        </div>
      </div>
      </div>
    </div>
  );
}

/* ─── Sliding Tab Navigation ─── */

const TAB_ITEMS: { key: View; label: string; icon: React.ReactNode }[] = [
  { key: "landing", label: "Start", icon: undefined },
  { key: "templates", label: "Plans", icon: <LayoutTemplate className="h-5 w-5" /> },
  { key: "stats", label: "Stats", icon: <BarChart3 className="h-5 w-5" /> },
  { key: "history", label: "History", icon: <History className="h-5 w-5" /> },
];

function TabNav({ view, setView, isMobile = false, hasActiveSession = false }: { view: View; setView: (v: View) => void, isMobile?: boolean, hasActiveSession?: boolean }) {
  const tabs = [
    {
      key: (hasActiveSession ? "active" : "landing") as View,
      label: hasActiveSession ? "Active" : "Start",
      icon: hasActiveSession ? <Play className="h-5 w-5" fill="currentColor" /> : undefined,
    },
    ...TAB_ITEMS.slice(1)
  ];

  return (
    <nav className={cn("relative flex items-center", isMobile ? "justify-around w-full" : "gap-1")}>
      {tabs.map((tab) => {
        const isActive = view === tab.key;
        const isSpecialActive = tab.key === "active";
        return (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={cn(
              "relative z-10 flex flex-col items-center justify-center gap-1 transition-colors duration-200 active:scale-95",
              isMobile ? "w-16 h-12" : "px-3 py-1.5 rounded-full flex-row gap-2",
              isActive 
                ? (isSpecialActive ? "text-white" : "text-primary-foreground")
                : (isSpecialActive 
                  ? "text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400" 
                  : "text-muted-foreground hover:text-foreground")
            )}
          >
            {isActive && (
              <motion.div
                layoutId={isMobile ? "active-tab-mobile" : "active-tab-desktop"}
                className={cn("absolute z-[-1]", isMobile ? "inset-0 rounded-xl" : "inset-0 rounded-full")}
                animate={{
                  backgroundColor: isSpecialActive ? "#3b82f6" : "var(--color-foreground)"
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {tab.icon && (
              <span className={cn(isActive && (isSpecialActive ? "text-white" : "text-background"))}>
                {tab.icon}
              </span>
            )}
            <span className={cn(
              isActive && (isSpecialActive ? "text-white" : "text-background"),
              isMobile ? (tab.icon ? "text-[10px] font-medium" : "text-sm font-semibold") : (tab.icon ? "hidden lg:inline text-sm font-medium" : "text-sm font-medium")
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
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
    <div className="mx-auto max-w-xl space-y-10">
      <div className="text-center pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Ready to train?</h1>
        <p className="mt-2 text-muted-foreground font-medium">Start a session and log your sets as you go.</p>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <ExerciseNameInput
            suggestions={exerciseNames}
            value={newExerciseName}
            onChange={setNewExerciseName}
            onSubmit={onQuickAdd}
            placeholder="Quick start with an exercise..."
          />
        </div>
        <button
          onClick={onQuickAdd}
          disabled={!newExerciseName.trim()}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background transition-all hover:bg-foreground/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0"
          aria-label="Start workout with exercise"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {templates.length > 0 ? (
        <div className="space-y-3">
          <button
            onClick={() => onStartTemplate(templates[0]!)}
            className="flex w-full items-center justify-between gap-3 rounded-3xl bg-foreground px-6 py-5 text-lg font-bold text-background transition-all hover:bg-foreground/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div className="flex flex-col items-start text-left">
               <span className="text-xs font-bold uppercase tracking-widest opacity-60">Quick Start</span>
               <span className="text-xl">{templates[0]!.name}</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/20 text-background backdrop-blur-md">
              <Play className="h-6 w-6 ml-1" fill="currentColor" />
            </div>
          </button>
          <button
            onClick={onStart}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-border/40 bg-card px-6 py-4 text-base font-semibold text-foreground transition-all hover:bg-muted/50 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Dumbbell className="h-5 w-5" />
            Start Empty Workout
          </button>
        </div>
      ) : (
        <button
          onClick={onStart}
          className="flex w-full items-center justify-center gap-3 rounded-3xl bg-foreground px-6 py-5 text-lg font-bold text-background transition-all hover:bg-foreground/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <Dumbbell className="h-6 w-6" />
          Start Empty Workout
        </button>
      )}

      {templates.length === 0 && (
        <EmptyState
          icon={<LayoutTemplate className="h-12 w-12" strokeWidth={1.5} />}
          title="No routines yet"
          description="Create a template for your regular workouts to start training with a single tap."
          className="py-8"
          action={
            <button
              onClick={onManageTemplates}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-border/50 bg-card px-5 py-3 text-sm font-bold text-foreground transition-all hover:bg-muted active:scale-95 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Build a routine
            </button>
          }
        />
      )}

      {templates.length > 1 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
              More Templates
            </h2>
            <button
              onClick={onManageTemplates}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            >
              Manage All
            </button>
          </div>
          <div className="space-y-3">
            {templates.slice(1, 4).map((template) => (
              <button
                key={template.id}
                onClick={() => onStartTemplate(template)}
                className="group flex w-full items-center justify-between rounded-2xl border border-border/40 bg-card p-4 text-left transition-all hover:border-foreground/20 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div>
                  <span className="block text-base font-semibold text-foreground group-hover:text-primary">{template.name}</span>
                  <span className="text-sm text-muted-foreground font-medium">
                    {template.exercises.length} exercises
                  </span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 transition-colors group-hover:bg-foreground group-hover:text-background">
                  <Play className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {recentSessions.length > 0 && (
        <div>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
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
