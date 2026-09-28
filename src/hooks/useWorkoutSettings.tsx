import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "gym-tracker-workout-settings-v1";

interface WorkoutSettings {
  warmupDuration: number; // seconds
  restBetweenSets: number; // seconds
  restBetweenExercises: number; // seconds
}

const DEFAULT_SETTINGS: WorkoutSettings = {
  warmupDuration: 60,
  restBetweenSets: 90,
  restBetweenExercises: 120,
};

interface WorkoutSettingsContextType extends WorkoutSettings {
  updateSettings: (settings: Partial<WorkoutSettings>) => void;
}

const WorkoutSettingsContext = createContext<WorkoutSettingsContextType>({
  ...DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function WorkoutSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<WorkoutSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (updates: Partial<WorkoutSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <WorkoutSettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </WorkoutSettingsContext.Provider>
  );
}

export function useWorkoutSettings() {
  return useContext(WorkoutSettingsContext);
}
