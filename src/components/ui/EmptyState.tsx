import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("animate-fade-in flex flex-col items-center justify-center py-16 text-center px-4", className)}>
      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted/30 text-muted-foreground/40 animate-float">
        {/* We expect a very large, soft icon here, like <Dumbbell className="h-12 w-12" /> */}
        {icon}
      </div>
      <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-[250px] text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
