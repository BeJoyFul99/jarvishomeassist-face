import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useFleet, type FleetAgentLog } from "@/hooks/useFleet";

const typeColors: Record<FleetAgentLog["type"], string> = {
  pulse: "text-cyan",
  info: "text-emerald",
  warning: "text-volcano",
  error: "text-crimson",
};

const AgentFeed = () => {
  const { agentFeed } = useFleet();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [agentFeed]);

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan pulse-dot" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Agent Feed</span>
      </div>
      <div ref={scrollRef} className="px-4 py-2 max-h-32 overflow-y-auto">
        {agentFeed.length === 0 ? (
          <div className="text-[11px] font-mono text-muted-foreground opacity-50 py-2">
            Waiting for heartbeats...
          </div>
        ) : (
          agentFeed.slice(-20).map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-mono text-[11px] leading-5 flex items-center gap-2"
            >
              <span className="text-muted-foreground opacity-50">
                {new Date(log.timestamp).toISOString().slice(11, 19)}
              </span>
              <span className={`${typeColors[log.type]} opacity-80`}>
                [{log.nodeName.toUpperCase()}]
              </span>
              <span className={`${typeColors[log.type]} opacity-60`}>
                {log.message}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AgentFeed;
