import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ExerciseNameInputProps {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function ExerciseNameInput({
  suggestions,
  value,
  onChange,
  onSubmit,
  placeholder = "Exercise name",
}: ExerciseNameInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return suggestions.slice(0, 6);
    return suggestions
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [suggestions, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(name: string) {
    onChange(name);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      setOpen(false);
      onSubmit();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-all",
          "focus:border-foreground focus:ring-2 focus:ring-foreground/10",
          "placeholder:text-muted-foreground"
        )}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg animate-scale-in origin-top-left">
          {filtered.map((name, index) => (
            <li
              key={name}
              className={cn(
                "cursor-pointer px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted",
                index !== filtered.length - 1 && "border-b border-border"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => handleSelect(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
