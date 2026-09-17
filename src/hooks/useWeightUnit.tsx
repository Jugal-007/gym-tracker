import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type WeightUnit = "kg" | "lbs";

const KG_TO_LBS = 2.20462;
const STORAGE_KEY = "gym-tracker-weight-unit-v1";

interface WeightUnitContextType {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
  /** Display a weight value converted to the current unit. */
  display: (kg: number) => number;
  /** Format a weight value with its unit suffix. */
  format: (kg: number, decimals?: number) => string;
}

const WeightUnitContext = createContext<WeightUnitContextType>({
  unit: "kg",
  setUnit: () => {},
  display: (kg) => kg,
  format: (kg) => `${kg} kg`,
});

export function WeightUnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<WeightUnit>(() => {
    if (typeof window === "undefined") return "kg";
    return (localStorage.getItem(STORAGE_KEY) as WeightUnit) ?? "kg";
  });

  const setUnit = (newUnit: WeightUnit) => {
    setUnitState(newUnit);
    localStorage.setItem(STORAGE_KEY, newUnit);
  };

  const display = (kg: number): number => {
    if (unit === "lbs") return Math.round(kg * KG_TO_LBS * 10) / 10;
    return kg;
  };

  const format = (kg: number, decimals?: number): string => {
    const value = display(kg);
    const str = decimals !== undefined ? value.toFixed(decimals) : value.toLocaleString();
    return `${str} ${unit}`;
  };

  return (
    <WeightUnitContext.Provider value={{ unit, setUnit, display, format }}>
      {children}
    </WeightUnitContext.Provider>
  );
}

export function useWeightUnit() {
  return useContext(WeightUnitContext);
}
