import type { Variants } from "framer-motion";

/** Staggered reveal for a list/grid wrapper. Pair children with fadeUpItem or springItem. */
export const staggerContainer = (stagger = 0.06): Variants => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: stagger } },
});

/** Subtle fade + rise — data panels, table rows, log lines. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/** Springy pop-in — cards and tiles on consumer-facing pages. */
export const springItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};
