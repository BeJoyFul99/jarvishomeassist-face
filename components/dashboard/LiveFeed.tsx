import { useEffect, useRef } from "react";
import type { SystemStatus } from "@/hooks/useSystemStatus";

interface LiveFeedProps {
  logs: SystemStatus["logs"];
}

const LiveFeed = ({ logs }: LiveFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const colorize = (log: string) => {
    if (log.includes("[WARN]")) return "text-amber";
    if (log.includes("[ERROR]")) return "text-crimson";
    if (log.includes("[DEBUG]")) return "text-muted-foreground";
    return "text-emerald/70";
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan pulse-dot" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Live Feed
        </span>
      </div>
      <div ref={scrollRef} className="px-4 py-3 max-h-28 overflow-y-auto">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`font-mono text-[11px] leading-5 ${colorize(log)} opacity-70`}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;
