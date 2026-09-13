import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { X, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthOverlay({ isOpen, onClose }: AuthOverlayProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setStatus("loading");
    const { error } = await signIn(email);

    if (error) {
      setStatus("error");
      setErrorMessage(error);
    } else {
      setStatus("success");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border/20 bg-card p-6 shadow-2xl backdrop-blur-[25px] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/50 text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Sign In</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in via Magic Link to sync your workouts across all devices.
          </p>
        </div>

        {status === "success" ? (
          <div className="rounded-2xl bg-green-500/10 p-4 text-center">
            <p className="text-sm font-medium text-green-500">
              Check your email for the magic link!
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                required
              />
            </div>
            
            {status === "error" && (
              <p className="text-xs text-destructive">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-bold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]",
                status === "loading" && "opacity-70"
              )}
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send Magic Link"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
