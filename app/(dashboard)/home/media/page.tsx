"use client";

import { motion } from "framer-motion";
import {
  HardDrive,
  Film,
  Music,
  Image,
  FileText,
  Clock,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const MEDIA_CATEGORIES = [
  { name: "Movies & Shows", icon: Film, count: 142, size: "1.2 TB", color: "text-magenta" },
  { name: "Music", icon: Music, count: 3420, size: "48 GB", color: "text-cyan" },
  { name: "Photos", icon: Image, count: 12840, size: "86 GB", color: "text-amber" },
  { name: "Documents", icon: FileText, count: 347, size: "2.4 GB", color: "text-emerald" },
];

const RECENT_FILES = [
  { name: "Family Vacation 2024", type: "Photo Album", icon: Image, time: "2h ago", color: "text-amber" },
  { name: "Movie Night - Inception", type: "Video", icon: Film, time: "Yesterday", color: "text-magenta" },
  { name: "Grocery List.pdf", type: "Document", icon: FileText, time: "2d ago", color: "text-emerald" },
  { name: "Weekend Playlist", type: "Music Playlist", icon: Music, time: "3d ago", color: "text-cyan" },
  { name: "Home Renovation Plans", type: "Document", icon: FileText, time: "1w ago", color: "text-emerald" },
];

const STORAGE_USED = 1.34; // TB
const STORAGE_TOTAL = 4; // TB

const HomeMediaPage = () => {
  const usedPercent = (STORAGE_USED / STORAGE_TOTAL) * 100;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 max-w-5xl mx-auto space-y-6"
    >
      <motion.div
        variants={item}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Media & Storage
          </h1>
          <p className="text-sm text-muted-foreground">
            Your shared family files
          </p>
        </div>
      </motion.div>

      {/* Storage Overview */}
      <motion.div variants={item} className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Storage
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {STORAGE_USED} TB / {STORAGE_TOTAL} TB
          </span>
        </div>
        <Progress value={usedPercent} className="h-2" />
        <p className="text-[11px] text-muted-foreground">
          {(STORAGE_TOTAL - STORAGE_USED).toFixed(2)} TB available
        </p>
      </motion.div>

      {/* Media Categories */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Categories
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MEDIA_CATEGORIES.map((cat) => (
            <motion.button
              key={cat.name}
              variants={item}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card p-4 text-left hover:bg-secondary/50 transition-colors space-y-2"
            >
              <div
                className={`p-2 rounded-lg bg-secondary w-fit ${cat.color}`}
              >
                <cat.icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-foreground">{cat.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {cat.count.toLocaleString()} items · {cat.size}
              </p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Recent Activity
        </h2>
        <div className="space-y-2">
          {RECENT_FILES.map((file, i) => (
            <motion.div
              key={i}
              variants={item}
              className="glass-card p-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors cursor-pointer"
            >
              <div
                className={`p-2 rounded-lg bg-secondary ${file.color}`}
              >
                <file.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {file.type}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {file.time}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HomeMediaPage;
