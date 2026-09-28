import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { loadSessions, saveSessions, loadActiveSession, saveActiveSession, generateId } from "@/components/gym/storage";
import { loadTemplates, saveTemplates, STARTER_TEMPLATES, recoverTemplatesFromSessions, sessionFromTemplate, templateFromSession } from "@/components/gym/templates";
import { buildRecords } from "@/components/gym/records";
import type { Session, Template } from "@/components/gym/types";
import { useWorkoutSettings } from "@/hooks/useWorkoutSettings";
import { syncDown, syncUp, syncDeleteSession, syncDeleteTemplate } from "@/lib/sync";
import { useAuth } from "@/components/auth/AuthProvider";

interface GymContextType {
  sessions: Session[];
  templates: Template[];
  activeSession: Session | null;
  isLoaded: boolean;
  startSession: () => void;
  startFromTemplate: (template: Template) => void;
  updateActiveSession: (session: Session) => void;
  finishSession: (session: Session) => void;
  cancelSession: () => void;
  deleteSession: (id: string) => void;
  saveTemplate: (template: Template) => void;
  saveSessionAsTemplate: (session: Session) => void;
  deleteTemplate: (id: string) => void;
  addExerciseToActive: (name: string) => void;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { warmupDuration } = useWorkoutSettings();
  const { user } = useAuth();

  useEffect(() => {
    let localSessions = loadSessions();
    let localTemplates = loadTemplates();

    if (localTemplates.length === 0) {
      const recovered = recoverTemplatesFromSessions(localSessions);
      if (recovered.length > 0) {
        localTemplates = recovered;
        saveTemplates(recovered);
      } else {
        const hasInitialized = localStorage.getItem("gym-tracker-templates-initialized");
        if (!hasInitialized) {
          localTemplates = STARTER_TEMPLATES;
          saveTemplates(STARTER_TEMPLATES);
          localStorage.setItem("gym-tracker-templates-initialized", "true");
        }
      }
    }

    setSessions(localSessions);
    setTemplates(localTemplates);
    setIsLoaded(true);

    const active = loadActiveSession();
    if (active) {
      setActiveSession(active);
    }

    const handleSync = () => {
      setSessions(loadSessions());
      setTemplates(loadTemplates());
    };

    window.addEventListener("gym-sync-complete", handleSync);
    return () => window.removeEventListener("gym-sync-complete", handleSync);
  }, []);

  useEffect(() => {
    if (user && isLoaded) {
      syncDown().catch(console.error);
    }
  }, [user, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    saveSessions(sessions);
  }, [sessions, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    saveActiveSession(activeSession);
  }, [activeSession, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    saveTemplates(templates);
  }, [templates, isLoaded]);

  function startSession() {
    const session: Session = {
      id: generateId(),
      startedAt: Date.now(),
      endedAt: null,
      warmupEndsAt: warmupDuration > 0 ? Date.now() + warmupDuration * 1000 : null,
      exercises: [],
    };
    setActiveSession(session);
  }

  function startFromTemplate(template: Template) {
    const session = sessionFromTemplate(template);
    session.warmupEndsAt = warmupDuration > 0 ? Date.now() + warmupDuration * 1000 : null;
    setActiveSession(session);
  }

  function updateActiveSession(session: Session) {
    setActiveSession(session);
  }

  function finishSession(session: Session) {
    const finished = { ...session, endedAt: Date.now() };
    setSessions((prev) => [finished, ...prev]);
    setActiveSession(null);
    setTimeout(() => syncUp().catch(console.error), 250);
  }

  function cancelSession() {
    setActiveSession(null);
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    syncDeleteSession(id).catch(console.error);
  }

  function saveTemplate(template: Template) {
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === template.id);
      return exists ? prev.map((t) => (t.id === template.id ? template : t)) : [template, ...prev];
    });
    setTimeout(() => syncUp().catch(console.error), 250);
  }

  function saveSessionAsTemplate(session: Session) {
    const name =
      session.templateName ??
      (session.exercises[0]?.name ? `${session.exercises[0].name} day` : "New template");
    saveTemplate(templateFromSession(session, name));
  }

  function deleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    syncDeleteTemplate(id).catch(console.error);
  }

  function addExerciseToActive(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (activeSession) {
      setActiveSession({
        ...activeSession,
        exercises: [...activeSession.exercises, { id: generateId(), name: trimmed, sets: [] }],
      });
    } else {
      const session: Session = {
        id: generateId(),
        startedAt: Date.now(),
        endedAt: null,
        exercises: [{ id: generateId(), name: trimmed, sets: [] }],
      };
      setActiveSession(session);
    }
  }

  return (
    <GymContext.Provider
      value={{
        sessions,
        templates,
        activeSession,
        isLoaded,
        startSession,
        startFromTemplate,
        updateActiveSession,
        finishSession,
        cancelSession,
        deleteSession,
        saveTemplate,
        saveSessionAsTemplate,
        deleteTemplate,
        addExerciseToActive,
      }}
    >
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  const context = useContext(GymContext);
  if (context === undefined) {
    throw new Error("useGym must be used within a GymProvider");
  }
  return context;
}
