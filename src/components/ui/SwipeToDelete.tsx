import { ReactNode, useRef } from "react";
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function SwipeToDelete({ onDelete, children, className, threshold = -100 }: SwipeToDeleteProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const deletedRef = useRef(false);

  // Background styling interpolation based on drag distance
  const bgOpacity = useTransform(x, [0, -50, threshold], [0, 0.5, 1]);
  const iconScale = useTransform(x, [0, threshold, threshold - 50], [0.5, 1, 1.2]);
  
  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50); // satisfying "snap" vibration
    }
  };

  const handleDragEnd = async (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (deletedRef.current) return;
    
    // Auto-delete if dragged beyond threshold OR swiped fast to the left
    const isSwipedFast = info.velocity.x < -500;
    const isSwipedFar = info.offset.x < threshold;

    if (isSwipedFar || isSwipedFast) {
      deletedRef.current = true;
      triggerHaptic();
      
      // Animate out completely to the left
      await controls.start({
        x: -window.innerWidth,
        opacity: 0,
        transition: { duration: 0.25, ease: "easeOut" }
      });
      
      onDelete();
    } else {
      // Snap back to original position
      controls.start({
        x: 0,
        transition: { type: "spring", bounce: 0.5, duration: 0.6 }
      });
    }
  };

  return (
    <div className={cn("relative w-full touch-pan-y overflow-hidden", className)}>
      {/* Destructive Background Layer */}
      <motion.div 
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-[inherit] bg-destructive px-6"
      >
        <motion.div 
          style={{ scale: iconScale }} 
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-sm"
        >
          <Trash2 className="h-6 w-6 text-white" />
        </motion.div>
      </motion.div>

      {/* Draggable Surface */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.8, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative z-10 w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
