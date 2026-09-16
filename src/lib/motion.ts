import type { Transition, Variants } from "framer-motion";

export const enterEase: Transition["ease"] = [0.22, 1, 0.36, 1];

export const landing: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.18,
    },
  },
};

export const landingItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: enterEase, when: "beforeChildren" },
  },
};

let landingPlayed = false;

export function takeLandingEnter() {
  if (landingPlayed) return false;
  landingPlayed = true;
  return true;
}

let shellPlayed = false;

export function takeShellEnter() {
  if (shellPlayed) return false;
  shellPlayed = true;
  return true;
}
