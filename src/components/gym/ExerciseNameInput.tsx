import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { Command } from "cmdk";
import { Search, Plus } from "lucide-react";
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
  placeholder = "Add an exercise...",
}: ExerciseNameInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return suggestions;
    return suggestions.filter((name) => name.toLowerCase().includes(query));
  }, [suggestions, search]);

  const exactMatch = filtered.some((n) => n.toLowerCase() === search.trim().toLowerCase());

  function handleSelect(name: string) {
    onChange(name);
    setSearch("");
    setOpen(false);
    // Use timeout to allow drawer to close before submitting
    setTimeout(() => {
      onSubmit();
    }, 150);
  }

  function handleCreate() {
    if (!search.trim()) return;
    onChange(search.trim());
    setSearch("");
    setOpen(false);
    setTimeout(() => {
      onSubmit();
    }, 150);
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} shouldScaleBackground>
      <Drawer.Trigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card px-4 py-3.5 text-left text-base transition-all",
            "hover:bg-accent/50 hover:border-border/80 active:scale-[0.98]",
            value ? "text-foreground font-semibold" : "text-muted-foreground"
          )}
        >
          <Search className="h-5 w-5 opacity-50" />
          {value || placeholder}
        </button>
      </Drawer.Trigger>
      
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[85vh] flex-col rounded-t-[32px] bg-background outline-none">
          <div className="flex-1 overflow-y-auto rounded-t-[32px] bg-background p-4 pt-5 pb-safe">
            <div className="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
            
            <Command className="flex flex-col overflow-hidden" shouldFilter={false}>
              <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3 border border-border/50 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/10 transition-all">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Command.Input 
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search exercises..."
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
                  autoFocus
                />
              </div>

              <Command.List className="mt-4 overflow-y-auto overflow-x-hidden max-h-[50vh] px-1 space-y-1">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No exercises found.
                </Command.Empty>
                
                {filtered.map((name) => (
                  <Command.Item
                    key={name}
                    value={name}
                    onSelect={handleSelect}
                    className="flex cursor-pointer items-center rounded-xl px-4 py-3.5 text-base font-medium transition-colors aria-selected:bg-accent aria-selected:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground active:scale-[0.98]"
                  >
                    {name}
                  </Command.Item>
                ))}

                {search.trim() && !exactMatch && (
                  <Command.Item
                    value={search}
                    onSelect={handleCreate}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-primary transition-colors aria-selected:bg-primary/10 data-[selected=true]:bg-primary/10 active:scale-[0.98]"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-primary">
                      <Plus className="h-4 w-4" />
                    </div>
                    Create "{search}"
                  </Command.Item>
                )}
              </Command.List>
            </Command>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
