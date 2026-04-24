"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Base shimmer block. Uses a gradient sliding across the element.
 * Reduced motion: static muted block.
 */
export function Shimmer({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={`bg-white/5 rounded-md ${className}`} aria-hidden />;
  }
  return (
    <div
      className={`relative overflow-hidden bg-white/5 rounded-md ${className}`}
      aria-hidden
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.6, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}

export function BillTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-white/10">
            <TableHead className="text-neutral-400 font-medium">
              Statement
            </TableHead>
            <TableHead className="text-neutral-400 font-medium">Due</TableHead>
            <TableHead className="text-neutral-400 font-medium">
              Status
            </TableHead>
            <TableHead className="text-neutral-400 font-medium">
              Extraction
            </TableHead>
            <TableHead className="text-right text-neutral-400 font-medium">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i} className="border-white/5">
              <TableCell>
                <Shimmer className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Shimmer className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Shimmer className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Shimmer className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-block">
                  <Shimmer className="h-4 w-16" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function BudgetPaceSkeleton() {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-10 w-40" />
          <Shimmer className="h-3 w-24" />
        </div>
        <div className="space-y-3 sm:items-end sm:flex sm:flex-col">
          <Shimmer className="h-3 w-36" />
          <Shimmer className="h-7 w-32" />
          <Shimmer className="h-5 w-28 rounded-full" />
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <Shimmer className="h-2.5 w-full rounded-full" />
        <div className="flex justify-between">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-3 w-12" />
          <Shimmer className="h-3 w-16" />
        </div>
      </div>
    </Card>
  );
}

export function UtilityCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden"
        >
          <div className="h-14 bg-gradient-to-br from-white/10 to-white/5 px-5 py-4 flex items-center justify-between">
            <Shimmer className="h-4 w-24 bg-white/10" />
            <Shimmer className="h-5 w-16 bg-white/10" />
          </div>
          <div className="p-5 space-y-3">
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-4 w-5/6" />
          </div>
          <div className="px-5 pb-5">
            <Shimmer className="h-1.5 w-full rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
      <Card className="rounded-[20px] border-white/10 bg-gradient-to-br from-neutral-950 to-neutral-900 p-6 space-y-4">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-14 w-56" />
        <Shimmer className="h-4 w-40" />
        <div className="flex gap-2 pt-2">
          <Shimmer className="h-6 w-20 rounded-full" />
          <Shimmer className="h-6 w-28 rounded-full" />
        </div>
      </Card>
      <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-6 space-y-4">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
            >
              <Shimmer className="h-3 w-16" />
              <Shimmer className="h-4 w-14" />
              <Shimmer className="h-3 w-8" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function MetersSkeleton() {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <Shimmer className="h-4 w-32" />
      </div>
      <div className="p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-4 w-16" />
            <Shimmer className="h-4 w-16" />
            <Shimmer className="h-4 w-12 ml-auto" />
          </div>
        ))}
      </div>
    </Card>
  );
}
