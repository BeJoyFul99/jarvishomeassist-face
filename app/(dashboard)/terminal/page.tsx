"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Terminal as TerminalIcon, ChevronRight } from "lucide-react";
import { useSystemStatus } from "@/hooks/useSystemStatus";

interface TerminalLine {
  type: "input" | "output" | "error" | "info";
  content: string;
}

const COMMANDS: Record<string, (status: any) => string[]> = {
  help: () => [
    "Available commands:",
    "  status     — System status overview",
    "  top        — CPU & memory usage",
    "  ports      — List open ports",
    "  model      — Active AI model info",
    "  logs       — Recent system logs",
    "  ifconfig   — Network interfaces",
    "  uptime     — System uptime",
    "  neofetch   — System info",
    "  clear      — Clear terminal",
    "  help       — Show this message",
  ],
  status: (s) => [
    `CPU Temperature: ${s.cpu_temp.toFixed(1)}°C`,
    `CPU Usage: ${(s.cpu_usage.reduce((a: number, b: number) => a + b, 0) / s.cpu_usage.length).toFixed(1)}%`,
    `RAM: ${s.ram_used_gb.toFixed(1)} GB / 16 GB`,
    `AI Status: ${s.ai_status}`,
    `Wi-Fi Signal: ${s.wifi_signal.toFixed(0)} dBm`,
  ],
  top: (s) => [
    "PID    COMMAND          %CPU   MEM",
    "───────────────────────────────────",
    ...s.cpu_usage.map((c: number, i: number) =>
      `${1000 + i}   core-${i}           ${c.toFixed(1).padStart(5)}  ${(s.ram_used_gb / 4).toFixed(1)} GB`
    ),
    "",
    `Total: ${(s.cpu_usage.reduce((a: number, b: number) => a + b, 0) / s.cpu_usage.length).toFixed(1)}% CPU, ${s.ram_used_gb.toFixed(1)} GB RAM`,
  ],
  ports: (s) => [
    "PORT    SERVICE        STATE",
    "──────────────────────────────",
    ...s.ports.map((p: any) =>
      `${String(p.port).padEnd(8)}${p.service.padEnd(15)}${p.open ? "LISTENING" : "CLOSED"}`
    ),
  ],
  model: (s) => [
    `Model: ${s.active_model}`,
    `Speed: ${s.tps.toFixed(1)} tokens/sec`,
    `Context: ${s.context_used} / ${s.context_max} tokens`,
    `Status: ${s.ai_status}`,
    `Backend: llama.cpp (CPU, 4 threads)`,
  ],
  logs: (s) => s.logs,
  ifconfig: () => [
    "en0: flags=8863<UP,BROADCAST,RUNNING>",
    "  inet 192.168.1.42 netmask 0xffffff00",
    "  ether a4:83:e7:2b:1c:9f",
    "  media: autoselect",
    "",
    "utun3: flags=8051<UP,POINTOPOINT,RUNNING>",
    "  inet 100.64.0.12 --> 100.64.0.12",
    "  (Tailscale)",
  ],
  uptime: () => {
    const hours = Math.floor(Math.random() * 72 + 24);
    const mins = Math.floor(Math.random() * 60);
    return [`up ${hours} hours, ${mins} minutes`, `load averages: ${(Math.random() * 3).toFixed(2)} ${(Math.random() * 2).toFixed(2)} ${(Math.random() * 2).toFixed(2)}`];
  },
  neofetch: (s) => [
    "        ████████        ",
    "      ██        ██      HomeLab Server",
    "    ██    ████    ██    ─────────────────",
    "    ██  ████████  ██    OS: macOS 14.2 (Sonoma)",
    "    ██  ████████  ██    CPU: Intel i7 × 4 cores",
    "    ██    ████    ██    RAM: " + s.ram_used_gb.toFixed(1) + " GB / 16 GB",
    "      ██        ██      Storage: 500 GB SSD",
    "        ████████        AI: " + s.active_model,
    "                         Temp: " + s.cpu_temp.toFixed(0) + "°C",
  ],
};

export default function TerminalPage() {
  const { status } = useSystemStatus();
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "info", content: "HomeLab Terminal v1.0.0 — Type 'help' for available commands" },
    { type: "info", content: "" },
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    const newLines: TerminalLine[] = [{ type: "input", content: cmd }];
    setCmdHistory((prev) => [cmd, ...prev]);
    setHistoryIdx(-1);

    if (cmd === "clear") {
      setLines([{ type: "info", content: "Terminal cleared." }, { type: "info", content: "" }]);
      setInput("");
      return;
    }

    const handler = COMMANDS[cmd];
    if (handler) {
      const output = handler(status);
      newLines.push(...output.map((line) => ({ type: "output" as const, content: line })));
    } else {
      newLines.push({ type: "error", content: `command not found: ${cmd}` });
      newLines.push({ type: "info", content: "Type 'help' for available commands" });
    }
    newLines.push({ type: "info", content: "" });
    setLines((prev) => [...prev, ...newLines]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
        setHistoryIdx(idx);
        setInput(cmdHistory[idx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const idx = historyIdx - 1;
        setHistoryIdx(idx);
        setInput(cmdHistory[idx]);
      } else {
        setHistoryIdx(-1);
        setInput("");
      }
    }
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input": return "text-primary";
      case "error": return "text-crimson";
      case "info": return "text-muted-foreground";
      default: return "text-emerald";
    }
  };

  return (
    <div className="bg-background">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <TerminalIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Terminal</h1>
            <p className="text-sm text-muted-foreground">System shell emulator</p>
          </div>
        </div>

        {/* Terminal */}
        <div
          className="glass-card overflow-hidden flex flex-col"
          style={{ height: "calc(100vh - 180px)" }}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-crimson/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald/60" />
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-2">homelab@server ~ %</span>
          </div>

          {/* Output */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {lines.map((line, i) => (
              <div key={i} className={`${getLineColor(line.type)} leading-relaxed whitespace-pre`}>
                {line.type === "input" ? (
                  <span>
                    <span className="text-muted-foreground">❯ </span>
                    <span className="text-primary">{line.content}</span>
                  </span>
                ) : (
                  line.content
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center border-t border-border px-4 py-2.5">
            <ChevronRight className="w-4 h-4 text-primary mr-1 shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="Type a command..."
              autoFocus
            />
          </form>
        </div>
      </motion.div>
    </div>
  );
}
