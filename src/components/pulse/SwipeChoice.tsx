import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { MoveHorizontal } from "lucide-react";
import { swipeChoiceForOffset } from "@shared/pulse";

/**
 * Swipe-to-answer card for binary questions. Fling past the threshold to
 * commit; anything short springs back. The tap buttons below stay as the
 * precise + accessible path — this is the fast one. Mount with
 * key={questionId} so each question starts centered.
 */
export function SwipeChoice({
  leftLabel,
  rightLabel,
  onChoose,
}: {
  leftLabel: string;
  rightLabel: string;
  onChoose: (side: "left" | "right") => void;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 180], [-6, 6]);
  const leftStamp = useTransform(x, [-90, -24], [1, 0]);
  const rightStamp = useTransform(x, [24, 90], [0, 1]);
  const committed = useRef(false);

  return (
    <motion.div
      drag={reduceMotion ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(_, info) => {
        if (committed.current) return;
        const side = swipeChoiceForOffset(info.offset.x);
        if (side) {
          committed.current = true;
          onChoose(side);
        }
      }}
      style={reduceMotion ? undefined : { x, rotate }}
      role="img"
      aria-label={`Swipe left for ${leftLabel}, right for ${rightLabel}`}
      className="relative touch-pan-y cursor-grab select-none overflow-hidden rounded-3xl bg-card p-5 pt-4 ring-1 ring-line shadow-xs active:cursor-grabbing"
    >
      <motion.span
        style={reduceMotion ? undefined : { opacity: leftStamp }}
        aria-hidden
        className="absolute left-4 top-3.5 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white"
      >
        ← {leftLabel}
      </motion.span>
      <motion.span
        style={reduceMotion ? undefined : { opacity: rightStamp }}
        aria-hidden
        className="absolute right-4 top-3.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white"
      >
        {rightLabel} →
      </motion.span>
      <div className="flex items-center justify-between gap-3 pt-7">
        <span className="min-w-0 flex-1 truncate text-left text-sm font-bold text-ink">
          {leftLabel}
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-mute ring-1 ring-line">
          <MoveHorizontal size={16} />
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-ink">
          {rightLabel}
        </span>
      </div>
      <p className="mt-2 text-center text-[11px] font-medium text-mute">
        {reduceMotion ? "Tap an option below" : "Swipe to answer — or tap below"}
      </p>
    </motion.div>
  );
}
