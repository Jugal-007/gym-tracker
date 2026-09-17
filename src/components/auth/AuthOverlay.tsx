import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { X, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthOverlay({ isOpen, onClose }: AuthOverlayProps) {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setStatus("loading");
    setErrorMessage("");
    const { error } = await signInWithGoogle();
    if (error) {
      setStatus("error");
      setErrorMessage(error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@") || !password) return;

    setStatus("loading");
    setErrorMessage("");

    const { error } = isSignUp 
      ? await signUpWithPassword(email, password)
      : await signInWithPassword(email, password);

    if (error) {
      setStatus("error");
      setErrorMessage(error);
    } else {
      setStatus("idle");
      onClose();
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

        <div className="mb-6 text-center mt-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to sync your workouts across all devices.
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={status === "loading"}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-border/50 bg-background py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-70"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/40"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
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
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
              required
            />
          </div>
          
          {status === "error" && (
            <p className="text-xs text-destructive text-center">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading" || !email || !password}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-bold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]",
              status === "loading" && "opacity-70"
            )}
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              isSignUp ? "Sign Up" : "Sign In"
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <span className="text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
          </span>{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage("");
            }}
            className="font-medium text-primary hover:underline"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
