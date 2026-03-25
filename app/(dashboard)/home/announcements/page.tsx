"use client";

import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  ChevronLeft, 
  Clock, 
  MessageSquare, 
  ArrowRight,
  Filter,
  Search,
  X,
  Pin,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { ANNOUNCEMENTS, Announcement } from "@/lib/constants";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.98, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } }
};

const TABS = ["all", "info", "success", "warning"];

export default function AnnouncementsPage() {
  const router = useRouter();
  const { scrollY } = useScroll();
  
  // Adaptive Style Transforms (Defined at top level to follow Rules of Hooks)
  const headerOpacity = useTransform(scrollY, [0, 40], [1, 0]);
  const headerHeight = useTransform(scrollY, [0, 40], ["auto", "0px"]);
  const headerMargin = useTransform(scrollY, [0, 40], ["1rem", "0rem"]);
  const headerScale = useTransform(scrollY, [0, 40], [1, 0.8]);
  
  const containerScale = useTransform(scrollY, [0, 100], [1, 0.98]);
  const containerGap = useTransform(scrollY, [0, 100], ["0.75rem", "0.5rem"]);
  
  const itemPadding = useTransform(scrollY, [0, 100], ["0.75rem 1.25rem", "0.4rem 1rem"]);
  const itemBg = useTransform(scrollY, [0, 100], ["rgba(6, 182, 212, 0.05)", "rgba(0, 0, 0, 0.8)"]);
  const itemBlur = useTransform(scrollY, [0, 100], ["blur(12px)", "blur(32px)"]);
  const itemBorder = useTransform(scrollY, [0, 100], ["rgba(255, 255, 255, 0.1)", "rgba(6, 182, 212, 0.4)"]);
  const itemRadius = useTransform(scrollY, [0, 100], ["12px", "8px"]);
  
  const iconScale = useTransform(scrollY, [0, 100], [1, 0.85]);
  const iconPadding = useTransform(scrollY, [0, 100], ["0.5rem", "0.35rem"]);
  
  const titleSize = useTransform(scrollY, [0, 100], ["0.875rem", "0.75rem"]);
  const metaOpacity = useTransform(scrollY, [0, 30], [1, 0]);
  const metaDisplay = useTransform(scrollY, (v: number) => v > 30 ? "none" : "flex");
  
  const timeSize = useTransform(scrollY, [0, 100], ["0.75rem", "0.65rem"]);

  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Announcement | null>(null);

  const filtered = useMemo(() => {
    return ANNOUNCEMENTS.filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                            a.desc.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || a.type === filter;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [filter, search]);

  const { pinnedItems, regularItems } = useMemo(() => {
    const p: Announcement[] = [];
    const r: Announcement[] = [];
    filtered.forEach(a => {
      if (a.pinned) p.push(a);
      else r.push(a);
    });
    return { pinnedItems: p, regularItems: r };
  }, [filtered]);

  return (
    <div className="min-h-screen pt-4 p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 transition-all duration-500">
        <div className="space-y-4">
          <button 
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-cyan transition-all"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Jarvis
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shrink-0">
              <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-cyan" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">Household Updates</h1>
              <p className="text-muted-foreground text-[11px] md:text-sm font-medium mt-1">Intelligent activity log.</p>
            </div>
          </div>
        </div>

        <div className="relative group w-full md:min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-cyan transition-colors" />
          <input 
            type="text" 
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-secondary/30 border-white/5 border rounded-2xl py-3 pl-11 pr-5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan/30 w-full backdrop-blur-xl transition-all"
          />
        </div>
      </div>

      {/* Tabs with Glassy Slider */}
      <div className="flex justify-center md:justify-start mb-12">
        <div className="relative flex items-center p-1 bg-black/40 rounded-2xl border border-white/5 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`relative px-4 md:px-6 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest z-10 transition-colors duration-300 ${
                filter === t ? "text-cyan" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative z-10">{t}</span>
              {filter === t && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-xl"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Feed */}
      <div className="space-y-16">
        {/* Pinned Highlights Section (Sticky with Adaptive Styling) */}
        {pinnedItems.length > 0 && (
          <div className="sticky top-0 z-40 pt-4 -mt-4 pb-6 bg-gradient-to-b from-background via-background/95 to-transparent backdrop-blur-sm">
            <motion.div 
               style={{ 
                 opacity: headerOpacity,
                 height: headerHeight,
                 marginBottom: headerMargin,
                 scale: headerScale,
                 overflow: "hidden"
               }}
               className="flex items-center gap-2 px-1"
            >
              <Pin className="w-3.5 h-3.5 text-cyan fill-cyan" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan/70">Pinned Highlights</h2>
            </motion.div>
            
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              style={{
                scale: containerScale,
                gap: containerGap,
              }}
              className="grid grid-cols-1"
            >
              {pinnedItems.map((a) => (
                <motion.div
                  key={a.id}
                  variants={item}
                  layoutId={a.id}
                  onClick={() => setSelected(a)}
                  style={{
                    padding: itemPadding,
                    backgroundColor: itemBg,
                    backdropFilter: itemBlur,
                    borderColor: itemBorder,
                    borderRadius: itemRadius
                  }}
                  className="glass-card flex items-center gap-4 transition-all duration-300 cursor-pointer group relative overflow-hidden ring-1 ring-cyan/20 border-white/10 hover:bg-white/10"
                >
                  <div className="absolute top-0 right-0 h-full w-24 bg-cyan-500/5 blur-3xl rounded-full translate-x-1/2" />
                  
                  <motion.div 
                    style={{
                      scale: iconScale,
                      padding: iconPadding
                    }}
                    className={`rounded-lg bg-secondary ${a.color} shrink-0 group-hover:scale-105 transition-all relative`}
                  >
                    <a.icon className="w-4 h-4" />
                    <Pin className="absolute -top-1 -right-1 w-2.5 h-2.5 text-cyan fill-cyan" />
                  </motion.div>

                  <div className="flex-1 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <motion.h3 
                        style={{
                          fontSize: titleSize,
                        }}
                        className="font-bold text-white tracking-tight font-display whitespace-nowrap"
                      >
                        {a.title}
                      </motion.h3>
                      <motion.div 
                        style={{
                          opacity: metaOpacity,
                          display: metaDisplay
                        }}
                        className="hidden sm:flex items-center gap-1.5"
                      >
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{a.authorName}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter border ${
                          a.authorRole === 'Assistant' ? 'bg-cyan/10 text-cyan border-cyan/20' : 'bg-magenta/10 text-magenta border-magenta/20'
                        }`}>
                          {a.authorRole}
                        </span>
                      </motion.div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <motion.span 
                        style={{
                          fontSize: timeSize,
                        }}
                        className="font-mono text-white/40 flex items-center gap-2"
                      >
                        <Clock className="w-3.5 h-3.5" /> {a.time}
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Regular Items Feed */}
        <div className="space-y-6">
          {regularItems.length > 0 && (
            <div className="flex items-center gap-2 px-1">
               <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
               <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Recent Activity</h2>
            </div>
          )}
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4"
          >
            {regularItems.length > 0 ? (
              regularItems.map((a) => (
                <motion.div
                  key={a.id}
                  variants={item}
                  layoutId={a.id}
                  onClick={() => setSelected(a)}
                  className="glass-card p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 hover:bg-white/5 transition-all cursor-pointer group relative overflow-hidden ring-1 ring-white/5 bg-white/4 border-white/5"
                >
                  <div className={`p-4 md:p-5 rounded-2xl bg-secondary ${a.color} shrink-0 group-hover:scale-105 transition-transform relative mx-auto md:mx-0 w-fit shadow-xl`}>
                    <a.icon className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  
                  <div className="flex-1 space-y-2 md:space-y-3 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                        <h3 className="text-lg md:text-xl font-bold text-white leading-tight font-display">{a.title}</h3>
                        <div className="flex items-center gap-1.5 ">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{a.authorName}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter border ${
                            a.authorRole === 'Assistant' ? 'bg-cyan/10 text-cyan border-cyan/20' : 'bg-magenta/10 text-magenta border-magenta/20'
                          }`}>
                            {a.authorRole}
                          </span>
                        </div>
                        {a.priority === 'high' && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase tracking-tighter flex items-center gap-1 mx-auto md:mx-0">
                            <AlertTriangle className="w-2.5 h-2.5" /> High Priority
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] md:text-xs font-mono text-muted-foreground/60 flex items-center justify-center md:justify-start gap-1.5 shrink-0">
                        <Clock className="w-3 md:w-3.5 h-3 md:h-3.5" /> {a.time}
                      </span>
                    </div>
                    <p className="text-muted-foreground/80 text-xs md:text-sm leading-relaxed max-w-3xl line-clamp-2 md:line-clamp-1 group-hover:line-clamp-none transition-all duration-500">{a.desc}</p>
                  </div>

                  <div className="hidden md:flex items-center gap-2 text-cyan font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    Inspect <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.div>
              ))
            ) : pinnedItems.length === 0 && (
              <div className="py-24 text-center space-y-4">
                 <div className="p-6 bg-secondary/20 rounded-full w-fit mx-auto border border-white/5">
                   <Search className="w-10 h-10 text-muted-foreground/20" />
                 </div>
                 <div>
                   <p className="text-foreground font-bold italic">No matches found</p>
                   <p className="text-muted-foreground text-sm">Try adjusting your filters or search keywords.</p>
                 </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              layoutId={selected.id}
              className="glass-card w-full max-w-2xl p-0 overflow-hidden relative shadow-2xl"
            >
               {/* Orbs */}
               <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 15, repeat: Infinity }}
                className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[120px] pointer-events-none ${selected.color.replace('text-', 'bg-')}/30`}
              />

              <div className="p-6 relative z-10 space-y-6">
                <div className="flex items-start justify-between">
                  <div className={`p-4 rounded-2xl bg-secondary ${selected.color} shadow-lg`}>
                    <selected.icon className="w-8 h-8" />
                  </div>
                  <button 
                    onClick={() => setSelected(null)}
                    className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground/60 hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-foreground leading-tight">{selected.title}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-cyan bg-cyan/5 w-fit px-2 py-1 rounded border border-cyan/10">
                         <Clock className="w-3 h-3" /> {selected.time}
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-foreground/80">{selected.authorName}</span>
                         <span className={`text-[9px] px-2 py-1 rounded uppercase font-bold tracking-widest border ${
                           selected.authorRole === 'Assistant' ? 'bg-cyan/5 text-cyan border-cyan/10' : 'bg-magenta/5 text-magenta border-magenta/20'
                         }`}>
                           {selected.authorRole}
                         </span>
                      </div>
                      {selected.priority === 'high' && (
                        <span className="text-[9px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase tracking-widest flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> High Priority
                        </span>
                      )}
                      {selected.pinned && (
                        <span className="text-[9px] px-2 py-1 rounded bg-cyan/10 text-cyan border border-cyan/20 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Pin className="w-3 h-3 fill-cyan" /> Pinned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-foreground text-lg font-medium leading-relaxed">
                      {selected.desc}
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed border-l-2 border-white/5 pl-4 italic">
                      {selected.fullContent || "No additional detailed logs are available for this system event."}
                    </p>
                  </div>

                  <div className="pt-8">
                    <button 
                      onClick={() => setSelected(null)}
                      className="w-full py-4 rounded-2xl bg-cyan text-black font-extrabold text-lg hover:opacity-90 transition-all shadow-xl shadow-cyan/20 active:scale-[0.98]"
                    >
                      Acknowledge & Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
