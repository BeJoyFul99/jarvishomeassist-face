"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Zap, Droplets, Flame } from "lucide-react";

import { Card } from "@/components/ui/card";

/**
 * Dimmed "ghost" preview of a sample bill row + utility card set.
 * Used inside empty states to convey what a bill looks like before
 * the user uploads their first one.
 */
export function GhostBillPreview() {
  const reduced = useReducedMotion();
  const fade = reduced
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.6, delay: 0.15 },
      };

  return (
    <motion.div {...fade} aria-hidden className="pointer-events-none select-none">
      <div className="relative">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
        <div className="opacity-40 grid gap-3 md:grid-cols-3">
          <Card className="rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden">
            <div className="bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] px-5 py-4 flex items-center justify-between relative">
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative flex items-center gap-2 text-white">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-semibold">Electricity</span>
              </div>
              <span className="relative text-lg font-bold text-white tabular-nums">
                $42.49
              </span>
            </div>
            <div className="p-5 space-y-2 text-sm text-neutral-400">
              <div className="flex justify-between">
                <span>Winter Tier 1</span>
                <span className="tabular-nums">$20.69</span>
              </div>
              <div className="flex justify-between">
                <span>Winter Tier 2</span>
                <span className="tabular-nums">$6.22</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="tabular-nums">$14.55</span>
              </div>
              <div className="flex justify-between">
                <span>Ontario Electricity Rebate</span>
                <span className="tabular-nums text-emerald-300">-$2.70</span>
              </div>
            </div>
          </Card>
          <Card className="rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden hidden md:block">
            <div className="bg-gradient-to-br from-[#30d158] to-[#6ee7b7] px-5 py-4 flex items-center justify-between relative">
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative flex items-center gap-2 text-white">
                <Droplets className="h-5 w-5" />
                <span className="text-sm font-semibold">Water</span>
              </div>
              <span className="relative text-lg font-bold text-white tabular-nums">
                $44.95
              </span>
            </div>
            <div className="p-5 space-y-2 text-sm text-neutral-400">
              <div className="flex justify-between">
                <span>Usage 15 m³</span>
                <span className="tabular-nums">$36.75</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="tabular-nums">$8.20</span>
              </div>
            </div>
          </Card>
          <Card className="rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden hidden md:block">
            <div className="bg-gradient-to-br from-[#bf5af2] to-[#d4b5ff] px-5 py-4 flex items-center justify-between relative">
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative flex items-center gap-2 text-white">
                <Flame className="h-5 w-5" />
                <span className="text-sm font-semibold">HVAC</span>
              </div>
              <span className="relative text-lg font-bold text-white tabular-nums">
                $3.04
              </span>
            </div>
            <div className="p-5 space-y-2 text-sm text-neutral-400">
              <div className="flex justify-between">
                <span>Natural Gas 8 m³</span>
                <span className="tabular-nums">$3.04</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
