import { Link, useLocation } from "@tanstack/react-router";
import {
  Dumbbell,
  Home,
  LayoutTemplate,
  BarChart3,
  History,
  User as UserIcon,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useState } from "react";
import { AuthOverlay } from "@/components/auth/AuthOverlay";
import { useGym } from "@/hooks/useGymStore";
import { TimerDisplay } from "@/components/gym/ActiveSession";
import type { Session } from "@/components/gym/types";

const TAB_ITEMS = [
  { key: "/", label: "Home", icon: <Home className="h-5 w-5" /> },
  { key: "/workout", label: "Workout", icon: <LayoutTemplate className="h-5 w-5" /> },
  { key: "/progress", label: "Progress", icon: <BarChart3 className="h-5 w-5" /> },
  { key: "/history", label: "History", icon: <History className="h-5 w-5" /> },
  { key: "/profile", label: "Profile", icon: <UserIcon className="h-5 w-5" /> },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const { activeSession, updateActiveSession } = useGym();

  const isImmersive = location.pathname === "/workout/active";

  return (
    <div className="relative min-h-screen bg-background pb-32 sm:pb-6 overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 right-[-20%] h-80 w-80 rounded-full bg-primary/12 blur-[90px]" />
        <div className="absolute bottom-24 left-[-30%] h-72 w-72 rounded-full bg-indigo-500/8 blur-[90px]" />
      </div>

      {!isImmersive && activeSession && (
        <FloatingTimer
          session={activeSession}
          onClearRestTimer={() => updateActiveSession({ ...activeSession, restTimerEndsAt: null })}
        />
      )}

      <div className="relative z-10">
        {!isImmersive && (
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl">
            <div className="mx-auto flex max-w-xl items-center justify-between">
              <Link
                to="/"
                className="flex items-center gap-2 text-foreground transition-all hover:opacity-70 active:scale-95"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Dumbbell className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap text-lg font-extrabold tracking-[0.16em]">
                  LFT
                </span>
              </Link>

              <div className="flex items-center gap-4">
                <div className="hidden sm:block">
                  <TabNav isMobile={false} hasActiveSession={activeSession !== null} />
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
                        {theme === "dark" ? (
                          <Sun className="h-5 w-5" />
                        ) : (
                          <Moon className="h-5 w-5" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() =>
                      user ? (window.location.href = "/profile") : setIsAuthOpen(true)
                    }
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus:outline-none",
                      location.pathname === "/profile" && "bg-primary text-primary-foreground",
                    )}
                  >
                    <UserIcon className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </header>
        )}

        <main className={cn("mx-auto w-full", !isImmersive ? "max-w-xl px-4 py-6" : "")}>
          {isImmersive ? (
            children
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="will-change-transform"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <AuthOverlay isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

        {!isImmersive && (
          <div className="fixed bottom-0 left-0 right-0 z-50 block sm:hidden">
            <div className="border-t border-border/50 bg-background/95 pb-safe pt-2 backdrop-blur-xl">
              <TabNav isMobile={true} hasActiveSession={activeSession !== null} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabNav({
  isMobile = false,
  hasActiveSession = false,
}: {
  isMobile?: boolean;
  hasActiveSession?: boolean;
}) {
  const location = useLocation();
  const tabs = TAB_ITEMS;

  return (
    <nav className={cn("relative flex items-center", isMobile ? "justify-around w-full px-2 pb-2" : "gap-1")}>
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.key;
        const isSpecialActive = tab.key === "/workout" && hasActiveSession;
        return (
          <Link
            key={tab.key}
            to={tab.key}
            className={cn(
              "relative z-10 flex flex-col items-center justify-center transition-colors duration-200 active:scale-95",
              isMobile ? "w-16 h-12 gap-1" : "px-4 py-2 rounded-full flex-row gap-2",
              isActive || isSpecialActive
                ? "text-[#22C55E]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn(isActive || isSpecialActive ? "text-[#22C55E]" : "")}>{tab.icon}</span>
            <span
              className={cn(
                isActive || isSpecialActive ? "text-[#22C55E]" : "",
                isMobile ? "text-[10px] font-medium tracking-wide" : "text-sm font-medium",
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function FloatingTimer({
  session,
  onClearRestTimer,
}: {
  session: Session;
  onClearRestTimer: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const elapsed = now - session.startedAt;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <Link to="/workout/active" className="fixed bottom-32 right-4 z-50 sm:bottom-6 sm:right-6">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl transition-all hover:scale-[1.02] active:scale-95">
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
      </div>
    </Link>
  );
}
