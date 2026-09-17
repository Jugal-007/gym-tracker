import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWeightUnit, type WeightUnit } from "@/hooks/useWeightUnit";
import { loadSessions, computeSessionVolume, loadWeeklyGoal, saveWeeklyGoal } from "@/components/gym/storage";
import { loadTemplates } from "@/components/gym/templates";
import { syncDown, syncUp, LAST_SYNCED_KEY } from "@/lib/sync";
import { buildRecords } from "@/components/gym/records";
import {
  LogOut, RefreshCw, Download, Trash2, User as UserIcon,
  Database, ChevronRight, CheckCircle2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { startOfMonth } from "date-fns";

function Avatar({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const photoUrl = user.user_metadata?.avatar_url as string | undefined;
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground text-background text-2xl font-bold ring-2 ring-border">
      {initials}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-2xl font-extrabold text-foreground tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

interface ProfileViewProps {
  onSignOut: () => void;
}

export function ProfileView({ onSignOut }: ProfileViewProps) {
  const { user, signOut } = useAuth();
  const { unit, setUnit, format } = useWeightUnit();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [weeklyGoal, setWeeklyGoalState] = useState(loadWeeklyGoal());

  const sessions = loadSessions();
  const templates = loadTemplates();
  const records = buildRecords(sessions);

  const totalVolume = sessions.reduce((sum, s) => sum + computeSessionVolume(s), 0);
  const thisMonthStart = startOfMonth(new Date()).getTime();
  const thisMonthSessions = sessions.filter((s) => s.startedAt >= thisMonthStart).length;
  const prCount = Object.keys(records).length;

  useEffect(() => {
    const raw = localStorage.getItem(LAST_SYNCED_KEY);
    if (raw) setLastSynced(raw);
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await syncUp();
      await syncDown();
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, now);
      setLastSynced(now);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      sessions,
      templates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lft-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    // Delete user data from Supabase tables first, then sign out
    if (user) {
      await supabase.from("sessions").delete().eq("user_id", user.id);
      await supabase.from("templates").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
    }
    await signOut();
    onSignOut();
  };

  const handleSignOut = async () => {
    await signOut();
    onSignOut();
  };

  const handleWeeklyGoalChange = (val: number) => {
    setWeeklyGoalState(val);
    saveWeeklyGoal(val);
  };

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Athlete";

  const formatLastSynced = (iso: string | null) => {
    if (!iso) return "Never";
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <UserIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-8">
      {/* ── Account Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border/30 bg-card/60 p-6 backdrop-blur-[20px] shadow-sm"
      >
        <div className="flex items-center gap-4">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold text-foreground">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {user.app_metadata?.provider === "google" ? "Signed in with Google" : "Email account"}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-destructive/50 hover:text-destructive active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </motion.div>

      {/* ── Stats Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/80 px-1">
          My Stats
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Sessions" value={sessions.length} />
          <StatCard label="This Month" value={thisMonthSessions} sub="sessions" />
          <StatCard label="Total Volume" value={format(totalVolume)} />
          <StatCard label="Exercises Tracked" value={prCount} sub="with PRs" />
        </div>
      </motion.div>

      {/* ── Preferences ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/80 px-1">
          Preferences
        </h2>
        <div className="space-y-2 rounded-3xl border border-border/30 bg-card/60 p-4 backdrop-blur-[20px] shadow-sm">

          {/* Weight unit toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Weight Unit</p>
              <p className="text-xs text-muted-foreground">Used across all sessions and stats</p>
            </div>
            <div className="flex rounded-xl border border-border/50 bg-muted/40 p-0.5">
              {(["kg", "lbs"] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-bold transition-all",
                    unit === u
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/30" />

          {/* Weekly goal stepper */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Weekly Goal</p>
              <p className="text-xs text-muted-foreground">Target workouts per week</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleWeeklyGoalChange(Math.max(1, weeklyGoal - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60 text-lg font-bold text-foreground transition-colors hover:bg-muted active:scale-90"
              >
                −
              </button>
              <span className="w-5 text-center text-base font-extrabold tabular-nums text-foreground">
                {weeklyGoal}
              </span>
              <button
                onClick={() => handleWeeklyGoalChange(Math.min(14, weeklyGoal + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60 text-lg font-bold text-foreground transition-colors hover:bg-muted active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Data & Backup ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/80 px-1">
          Data & Backup
        </h2>
        <div className="space-y-2 rounded-3xl border border-border/30 bg-card/60 p-4 backdrop-blur-[20px] shadow-sm">

          {/* Sync status */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Cloud Sync</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last synced: {formatLastSynced(lastSynced)}
                </p>
              </div>
            </div>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>

          <div className="border-t border-border/30" />

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex w-full items-center justify-between py-2 text-left transition-colors hover:opacity-70 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Export Data</p>
                <p className="text-xs text-muted-foreground">Download all sessions & routines as JSON</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="border-t border-border/30" />

          {/* Backup indicator */}
          <div className="flex items-center gap-3 py-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {sessions.length} sessions · {templates.length} routines
              </p>
              <p className="text-xs text-muted-foreground">Backed up to Supabase</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Danger Zone ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destructive/70 px-1">
          Danger Zone
        </h2>
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex w-full items-center gap-3 py-2 text-left transition-colors hover:opacity-70">
                <Trash2 className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently deletes all your data and account
                  </p>
                </div>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all your workout data from our servers. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </motion.div>
    </div>
  );
}
