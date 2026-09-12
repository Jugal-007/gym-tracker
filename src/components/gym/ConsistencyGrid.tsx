import { useMemo } from "react";
import { format, startOfDay, subDays, startOfWeek, addDays, isSameDay } from "date-fns";
import type { Session } from "./types";
import { Flame } from "lucide-react";

interface ConsistencyGridProps {
  sessions: Session[];
}

export function ConsistencyGrid({ sessions }: ConsistencyGridProps) {
  // We'll show the last 20 weeks on mobile (so it fits nicely horizontally if we let it scroll, or we can make it auto-fit)
  const WEEKS = 20;
  const DAYS = WEEKS * 7;
  
  const today = startOfDay(new Date());
  
  const grid = useMemo(() => {
    // End date is the end of the current week (Saturday)
    const endOfWeek = addDays(startOfWeek(today, { weekStartsOn: 0 }), 6);
    // Start date is WEEKS ago from the start of this week
    const startDate = subDays(startOfWeek(today, { weekStartsOn: 0 }), (WEEKS - 1) * 7);

    const days = [];
    let current = startDate;
    while (current <= endOfWeek) {
      // Find if there's a session on this day
      const hasSession = sessions.some(s => isSameDay(new Date(s.startedAt), current));
      const isFuture = current > today;
      
      days.push({
        date: current,
        hasSession,
        isFuture,
      });
      current = addDays(current, 1);
    }
    return days;
  }, [sessions, today]);

  // Group days by column (weeks)
  // Grid layout will flow column by column
  // To do column by column in CSS Grid easily, we use grid-auto-flow: column
  
  return (
    <div className="animate-slide-up rounded-xl border border-border bg-card p-4 shadow-sm overflow-hidden">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Consistency Heatmap
        </h3>
      </div>
      
      <div className="flex gap-2">
        {/* Y Axis labels (Mon, Wed, Fri) */}
        <div className="flex flex-col justify-between text-[10px] font-medium text-muted-foreground py-[6px]">
          <span className="h-3 leading-3">S</span>
          <span className="h-3 leading-3">M</span>
          <span className="h-3 leading-3">T</span>
          <span className="h-3 leading-3">W</span>
          <span className="h-3 leading-3">T</span>
          <span className="h-3 leading-3">F</span>
          <span className="h-3 leading-3">S</span>
        </div>
        
        {/* The Grid */}
        <div className="flex-1 overflow-x-auto hide-scrollbar pb-1">
          <div 
            className="grid gap-[3px]" 
            style={{ 
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
              gridAutoFlow: "column",
              gridAutoColumns: "1fr"
            }}
          >
            {grid.map((day, i) => {
              // Activity intensity could be calculated here (e.g. by volume), but for now boolean is fine.
              let bg = "bg-muted/50";
              if (day.isFuture) {
                bg = "bg-transparent"; // Future days have no background
              } else if (day.hasSession) {
                bg = "bg-primary";
              }
              
              return (
                <div 
                  key={i}
                  title={format(day.date, "MMM d, yyyy")}
                  className={`w-3 h-3 rounded-[2px] transition-colors ${bg}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
