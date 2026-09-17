import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Clock, Dumbbell, History, LayoutTemplate, Moon, Play, Plus, Sun, Trophy, Timer, User as UserIcon, LogOut } from "lucide-react";
import { ActiveSession, TimerDisplay } from "@/components/gym/ActiveSession";
import { ExerciseNameInput } from "@/components/gym/ExerciseNameInput";
import { SessionHistory } from "@/components/gym/SessionHistory";
import { StatsPanel } from "@/components/gym/StatsPanel";
import { Templates } from "@/components/gym/Templates.tsx";
import { ProfileView } from "@/components/gym/ProfileView";
import { AuthOverlay } from "@/components/auth/AuthOverlay";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildRecords } from "@/components/gym/records";
import { syncDown } from "@/lib/sync";
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

type View = "landing" | "active" | "history" | "templates" | "stats" | "profile";

function Index() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("landing");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleSync = () => {
      setSessions(loadSessions());
      setTemplates(loadTemplates());
    };

    handleSync();
    
    // Also load active session (which shouldn't be overwritten by cloud, but good to ensure consistency)
    const active = loadActiveSession();
    if (active) {
      setActiveSession(active);
      setView("active");
    }

    window.addEventListener("gym-sync-complete", handleSync);
    return () => window.removeEventListener("gym-sync-complete", handleSync);
  }, []);

  useEffect(() => {
    if (user) {
      syncDown().catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveActiveSession(activeSession);
  }, [activeSession]);

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  const exerciseNames = useMemo(() => getExerciseNames(sessions, templates), [sessions, templates]);

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
    <div className="relative min-h-screen bg-background pb-32 sm:pb-6 overflow-hidden">
      {/* Subtle monochrome ambient background for glassmorphism */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-70 dark:opacity-40">
        <div className="absolute top-[-10%] left-[-10%] h-[50vh] w-[50vw] rounded-full bg-foreground/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50vh] w-[50vw] rounded-full bg-foreground/20 blur-[120px]" />
      </div>

      {activeSession && view !== "active" && (
        <FloatingTimer
          session={activeSession}
          onClick={() => setView("active")}
          onClearRestTimer={() => updateActiveSession({ ...activeSession, restTimerEndsAt: null })}
        />
      )}

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
            <div className="flex items-center gap-2">
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
              
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => (user ? setView("profile") : setIsAuthOpen(true))}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus:outline-none",
                  view === "profile" && "bg-primary text-primary-foreground"
                )}
              >
                <UserIcon className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="will-change-transform"
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
              <StatsPanel sessions={sessions} templates={templates} />
            ) : view === "templates" ? (
              <Templates
                templates={templates}
                exerciseNames={exerciseNames}
                onStart={startFromTemplate}
                onSave={saveTemplate}
                onDelete={deleteTemplate}
              />
            ) : view === "profile" ? (
              <ProfileView onSignOut={() => setView("landing")} />
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

      {/* Global Auth Overlay */}
      <AuthOverlay isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-6 left-4 right-4 z-50 block sm:hidden">
        <div className="mx-auto max-w-md rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 p-2 backdrop-blur-[25px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
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
  { key: "templates", label: "Routines", icon: <LayoutTemplate className="h-5 w-5" /> },
  { key: "stats", label: "Stats", icon: <BarChart3 className="h-5 w-5" /> },
  { key: "history", label: "History", icon: <History className="h-5 w-5" /> },
  { key: "profile", label: "Profile", icon: <UserIcon className="h-5 w-5" /> },
];

function TabNav({ view, setView, isMobile = false, hasActiveSession = false }: { view: View; setView: (v: View) => void, isMobile?: boolean, hasActiveSession?: boolean }) {
  const tabs = [
    {
      key: (hasActiveSession ? "active" : "landing") as View,
      label: hasActiveSession ? "Active" : "Start",
      icon: hasActiveSession ? <Play className="h-5 w-5" fill="currentColor" /> : <Dumbbell className="h-5 w-5" />,
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
              "relative z-10 flex flex-col items-center justify-center transition-colors duration-200 active:scale-95",
              isMobile ? "w-16 h-14 gap-1" : "px-4 py-2 rounded-full flex-row gap-2",
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
                className={cn("absolute z-[-1]", isMobile ? "inset-0 rounded-2xl" : "inset-0 rounded-full")}
                animate={{
                  backgroundColor: isSpecialActive ? "#3b82f6" : "var(--color-foreground)"
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className={cn(isActive && (isSpecialActive ? "text-white" : "text-background"))}>
              {tab.icon}
            </span>
            <span className={cn(
              isActive && (isSpecialActive ? "text-white" : "text-background"),
              isMobile ? "text-[10px] font-medium tracking-wide" : "text-sm font-medium"
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
        <>
          {/* Routines are the PRIMARY CTA when they exist */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                Your Routines
              </h2>
              <button
                onClick={onManageTemplates}
                className="text-xs font-semibold text-primary/80 hover:text-primary transition-colors"
              >
                All &rarr;
              </button>
            </div>
            <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar">
              <div className="flex gap-4 pb-4 w-max snap-x snap-mandatory">
                {templates.map(template => (
                   <button
                     key={template.id}
                     onClick={() => onStartTemplate(template)}
                     className="relative flex h-[120px] w-56 shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[1.5rem] border border-border bg-card/80 p-4 text-left shadow-sm backdrop-blur-[12px] transition-all hover:border-foreground/30 hover:-translate-y-1 hover:shadow-md active:scale-[0.97]"
                   >
                      <div>
                        <span className="mb-1 block text-base font-bold leading-tight text-foreground line-clamp-1">{template.name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {template.exercises.length} Exercises
                        </span>
                      </div>
                      <div className="flex w-full items-end justify-between gap-3">
                        <p className="flex-1 text-xs font-medium text-muted-foreground/70 line-clamp-1">
                          {template.exercises.map(e => e.name).join(", ")}
                        </p>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
                          <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
                        </div>
                      </div>
                   </button>
                ))}
              </div>
            </div>
            {/* Demoted secondary action */}
            <button
              onClick={onStart}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 py-3 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
            >
              <Dumbbell className="h-4 w-4" />
              Start empty workout instead
            </button>
          </div>
        </>
      ) : (
        /* No routines yet — big primary CTA */
        <button
          onClick={onStart}
          className="flex w-full items-center justify-center gap-3 rounded-3xl bg-foreground px-6 py-5 text-lg font-bold text-background transition-all hover:bg-foreground/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <Dumbbell className="h-6 w-6" />
          Start Empty Workout
        </button>
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

function FloatingTimer({ session, onClick, onClearRestTimer }: { session: Session; onClick: () => void; onClearRestTimer: () => void }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = now - session.startedAt;
  const isResting = session.restTimerEndsAt && session.restTimerEndsAt > now;

  return (
    <div className="fixed bottom-32 right-4 z-50 sm:bottom-6 sm:right-6">
      <button
        onClick={onClick}
        className="flex items-center gap-3 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-[25px] px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      >
        <div className="flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Workout Active
          </span>
          <div className="scale-75 origin-left -mt-1">
            <TimerDisplay ms={elapsed} />
          </div>
        </div>
      </button>
    </div>
  );
}
