import { Outlet, Link, useRouterState, useLocation } from "@tanstack/react-router";
import { Dumbbell, LayoutTemplate, BarChart3, History, User as UserIcon, Play, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth/AuthProvider";
import { useState } from "react";
import { AuthOverlay } from "@/components/auth/AuthOverlay";
import { useGym } from "@/hooks/useGymStore";
import { TimerDisplay } from "@/components/gym/ActiveSession";

const TAB_ITEMS = [
  { key: "/", label: "Start", icon: undefined },
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
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-70 dark:opacity-40">
        <div className="absolute top-[-10%] left-[-10%] h-[50vh] w-[50vw] rounded-full bg-foreground/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50vh] w-[50vw] rounded-full bg-foreground/20 blur-[120px]" />
      </div>

      {!isImmersive && activeSession && (
        <FloatingTimer
          session={activeSession}
          onClick={() => {}}
          onClearRestTimer={() => updateActiveSession({ ...activeSession, restTimerEndsAt: null })}
        />
      )}

      <div className="relative z-10">
        {!isImmersive && (
          <header className="sticky top-0 z-20 border-b border-border/40 bg-card/60 px-4 py-4 backdrop-blur-xl">
            <div className="mx-auto flex max-w-xl items-center justify-between">
              <Link to="/" className="flex items-center gap-2 text-foreground transition-all hover:opacity-70 active:scale-95">
                <Dumbbell className="h-6 w-6" />
                <span className="whitespace-nowrap text-xl font-extrabold tracking-wider">LFT</span>
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
                        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                      </motion.div>
                    </AnimatePresence>
                  </motion.button>
                  
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => (user ? window.location.href = "/profile" : setIsAuthOpen(true))}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus:outline-none",
                      location.pathname === "/profile" && "bg-primary text-primary-foreground"
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
          <div className="fixed bottom-6 left-4 right-4 z-50 block sm:hidden">
            <div className="mx-auto max-w-md rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 p-2 backdrop-blur-[25px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <TabNav isMobile={true} hasActiveSession={activeSession !== null} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabNav({ isMobile = false, hasActiveSession = false }: { isMobile?: boolean, hasActiveSession?: boolean }) {
  const location = useLocation();
  const tabs = [
    {
      key: hasActiveSession ? "/workout/active" : "/",
      label: hasActiveSession ? "Active" : "Home",
      icon: hasActiveSession ? <Play className="h-5 w-5" fill="currentColor" /> : <Dumbbell className="h-5 w-5" />,
    },
    ...TAB_ITEMS.slice(1)
  ];

  return (
    <nav className={cn("relative flex items-center", isMobile ? "justify-around w-full" : "gap-1")}>
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.key;
        const isSpecialActive = tab.key === "/workout/active";
        return (
          <Link
            key={tab.key}
            to={tab.key}
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
          </Link>
        );
      })}
    </nav>
  );
}

function FloatingTimer({ session, onClick, onClearRestTimer }: { session: any; onClick: () => void; onClearRestTimer: () => void }) {
  const [now, setNow] = useState(Date.now());
  const elapsed = now - session.startedAt;

  return (
    <Link to="/workout/active" className="fixed bottom-32 right-4 z-50 sm:bottom-6 sm:right-6">
      <div className="flex items-center gap-3 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-[25px] px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all hover:scale-105 hover:shadow-xl active:scale-95">
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
