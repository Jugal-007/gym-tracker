import type { Session } from "@/components/gym/types";
import { buildRecords } from "@/components/gym/records";
import { startOfWeek, endOfWeek, isWithinInterval, subDays } from "date-fns";

export interface XPDetails {
  totalXP: number;
  level: number;
  nextLevelXP: number;
  currentLevelXP: number;
  progress: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
}

const XP_PER_WORKOUT = 100;
const XP_PER_PR = 50;

function calculateLevel(xp: number): XPDetails {
  // Simple curve: Level 1 = 0 XP, Level 2 = 500 XP, Level 3 = 1200 XP, etc.
  // Formula: XP = 500 * (level - 1) ^ 1.2
  // Let's use a simpler one: Level = floor(sqrt(XP / 100)) + 1
  // e.g. 0 XP = L1, 100 XP = L2, 400 XP = L3, 900 XP = L4
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const currentLevelStartXP = 100 * Math.pow(level - 1, 2);
  const nextLevelStartXP = 100 * Math.pow(level, 2);
  const progress = ((xp - currentLevelStartXP) / (nextLevelStartXP - currentLevelStartXP)) * 100;

  return {
    totalXP: xp,
    level,
    currentLevelXP: currentLevelStartXP,
    nextLevelXP: nextLevelStartXP,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

export function computeGamification(sessions: Session[]): { xp: XPDetails; achievements: Achievement[]; currentStreak: number; longestStreak: number } {
  let xp = 0;
  let prCount = 0;
  
  // XP from workouts
  // Filter valid completed workouts (must have at least one completed set)
  const validSessions = sessions.filter(s => 
    s.endedAt && s.exercises.some(ex => ex.sets.some(set => set.completed))
  );

  xp += validSessions.length * XP_PER_WORKOUT;

  // XP from PRs
  const records = buildRecords(validSessions);
  prCount = Object.keys(records).length;
  xp += prCount * XP_PER_PR;

  // Calculate Streaks
  // A streak is counted by unique days trained.
  const daysTrained = [...new Set(validSessions.map(s => {
    const d = new Date(s.startedAt);
    d.setHours(0,0,0,0);
    return d.getTime();
  }))].sort((a,b) => b - a); // newest first

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Check if today or yesterday is the start of the current streak
  let previousDay = today.getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // Calculate current streak
  for (let i = 0; i < daysTrained.length; i++) {
    const day = daysTrained[i];
    const diff = previousDay - day;
    
    if (diff === 0 || diff === ONE_DAY) {
      currentStreak++;
      previousDay = day;
    } else if (i === 0 && diff === ONE_DAY * 2) {
      // missed yesterday, streak is broken
      break;
    } else {
      break; // Gap > 1 day
    }
  }

  // Calculate longest streak
  if (daysTrained.length > 0) {
    let currentLongest = 1;
    tempStreak = 1;
    for (let i = 1; i < daysTrained.length; i++) {
      const diff = daysTrained[i-1] - daysTrained[i];
      if (diff === ONE_DAY) {
        tempStreak++;
        if (tempStreak > currentLongest) currentLongest = tempStreak;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = currentLongest;
  }

  // Define Achievements
  const achievements: Achievement[] = [
    {
      id: "first_workout",
      name: "First Step",
      description: "Complete your first workout.",
      unlocked: validSessions.length >= 1,
      unlockedAt: validSessions.length >= 1 ? validSessions[validSessions.length - 1].endedAt! : undefined
    },
    {
      id: "workout_10",
      name: "Consistency is Key",
      description: "Complete 10 workouts.",
      unlocked: validSessions.length >= 10,
    },
    {
      id: "workout_50",
      name: "Half Century",
      description: "Complete 50 workouts.",
      unlocked: validSessions.length >= 50,
    },
    {
      id: "first_pr",
      name: "Breaking Barriers",
      description: "Hit your first Personal Record.",
      unlocked: prCount >= 1,
    },
    {
      id: "streak_7",
      name: "Weekly Warrior",
      description: "Achieve a 7-day workout streak.",
      unlocked: longestStreak >= 7,
    }
  ];

  return {
    xp: calculateLevel(xp),
    achievements,
    currentStreak,
    longestStreak
  };
}
