import { useRef, useCallback, useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/utils/haptics";

interface StepperInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  step?: number;
  min?: number;
  placeholder?: string;
  className?: string;
}

export function StepperInput({
  label,
  value,
  onChange,
  onEnter,
  step = 1,
  min = 0,
  placeholder = "0",
  className,
}: StepperInputProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!isTyping) {
      setInputValue(value);
    }
  }, [value, isTyping]);

  const handleIncrement = useCallback(() => {
    hapticLight();
    const current = parseFloat(valueRef.current) || 0;
    const next = Math.round((current + step) * 100) / 100;
    onChange(String(next));
  }, [onChange, step]);

  const handleDecrement = useCallback(() => {
    hapticLight();
    const current = parseFloat(valueRef.current) || 0;
    const next = Math.max(min, Math.round((current - step) * 100) / 100);
    onChange(String(next));
  }, [onChange, step, min]);

  const startAuto = useCallback((action: () => void) => {
    action(); // Immediate action
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(action, 100);
    }, 400); // 400ms delay before repeating
  }, []);

  const stopAuto = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const handleBlur = () => {
    setIsTyping(false);
    let parsed = parseFloat(inputValue);
    if (isNaN(parsed)) parsed = min;
    parsed = Math.max(min, parsed);
    // Remove trailing .0 if integer
    onChange(String(parsed));
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center justify-between overflow-hidden rounded-xl border border-border/50 bg-background/50 focus-within:border-foreground/40 focus-within:ring-4 focus-within:ring-foreground/5 transition-all">
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => {
            e.preventDefault();
            startAuto(handleDecrement);
          }}
          onPointerUp={stopAuto}
          onPointerLeave={stopAuto}
          onPointerCancel={stopAuto}
          className="flex h-11 w-10 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-90 transition-all focus:outline-none select-none"
        >
          <Minus className="h-5 w-5" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={isTyping ? inputValue : value}
          onChange={(e) => {
            setIsTyping(true);
            setInputValue(e.target.value);
          }}
          onBlur={handleBlur}
          onFocus={() => setIsTyping(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
              if (onEnter) onEnter();
            }
          }}
          placeholder={placeholder}
          className="w-full min-w-0 flex-1 bg-transparent px-0 py-3 text-center text-[15px] font-bold text-foreground outline-none tabular-nums"
          style={{ MozAppearance: "textfield" }}
        />
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => {
            e.preventDefault();
            startAuto(handleIncrement);
          }}
          onPointerUp={stopAuto}
          onPointerLeave={stopAuto}
          onPointerCancel={stopAuto}
          className="flex h-11 w-10 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-90 transition-all focus:outline-none select-none"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>
    </div>
  );
}
