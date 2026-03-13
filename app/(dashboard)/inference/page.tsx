"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Zap, Terminal, Send, Loader2, Cpu, HardDrive, Gauge } from "lucide-react";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MOCK_RESPONSES = [
  "The Intel i7 in your system runs the model at approximately {tps} tokens/sec. Memory pressure is manageable for Q4 quantization.",
  "Current context utilization is at {context_pct}%. You have {context_remaining} tokens remaining before the window resets.",
  "Model {model} is loaded and ready. GPU offloading is disabled — running pure CPU inference via llama.cpp.",
  "System thermals are within safe range at {temp}°C. No throttling detected. Inference performance is stable.",
  "Recommended: Switch to Q5_K_M quantization for better quality at ~15% speed reduction. Current TPS: {tps}.",
];

export default function InferencePage() {
  const { status, history } = useSystemStatus();
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const contextPct = (status.context_used / status.context_max) * 100;

  const tpsData = history.slice(-20).map((h, i) => ({
    time: i,
    tps: 8 + Math.random() * 12,
  }));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || generating) return;

    const userMsg = prompt.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setPrompt("");
    setGenerating(true);

    const template = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
    const response = template
      .replace("{tps}", status.tps.toFixed(1))
      .replace("{context_pct}", contextPct.toFixed(0))
      .replace("{context_remaining}", String(status.context_max - status.context_used))
      .replace("{model}", status.active_model)
      .replace("{temp}", status.cpu_temp.toFixed(0));

    let i = 0;
    const partial: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, partial]);

    const interval = setInterval(() => {
      i++;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: response.slice(0, i) };
        return updated;
      });
      if (i >= response.length) {
        clearInterval(interval);
        setGenerating(false);
      }
    }, 25);
  };

  return (
    <div className="bg-background">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Inference Engine</h1>
            <p className="text-sm text-muted-foreground">llama.cpp local inference monitor</p>
          </div>
          <span className={`ml-auto status-badge ${status.ai_status === "inferring" ? "bg-emerald/10 text-emerald" : "bg-secondary text-muted-foreground"}`}>
            {status.ai_status === "inferring" ? "⚡ Inferring" : "● Idle"}
          </span>
        </motion.div>

        {/* Metrics row */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Brain, label: "Active Model", value: status.active_model.split("-").slice(0, 2).join("-"), sub: "Q4_K_M GGUF" },
            { icon: Zap, label: "Tokens/sec", value: status.tps.toFixed(1), sub: "CPU inference" },
            { icon: Gauge, label: "Context Window", value: `${status.context_used} / ${status.context_max}`, sub: `${contextPct.toFixed(0)}% used` },
            { icon: Cpu, label: "CPU Temp", value: `${status.cpu_temp.toFixed(0)}°C`, sub: status.cpu_temp > 80 ? "⚠ High" : "Normal" },
          ].map((m) => (
            <div key={m.label} className="glass-card-hover p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <div className="font-mono text-lg font-semibold text-foreground truncate">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chat terminal */}
          <motion.div variants={item} className="lg:col-span-2 glass-card-hover flex flex-col" style={{ height: "480px" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono">llama.cpp interactive session</span>
              <div className="ml-auto flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-crimson/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald/60" />
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Enter a prompt to start inference</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Model: {status.active_model}</p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm font-mono ${
                    msg.role === "user"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-secondary/50 text-emerald"
                  }`}>
                    {msg.content}
                    {generating && i === messages.length - 1 && msg.role === "assistant" && (
                      <span className="animate-pulse ml-0.5">▊</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center border-t border-border">
              <span className="pl-4 text-primary font-mono text-sm">❯</span>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter prompt..."
                className="flex-1 bg-transparent px-2 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
                disabled={generating}
              />
              <button type="submit" disabled={generating || !prompt.trim()} className="p-3 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </motion.div>

          {/* Side panel */}
          <motion.div variants={item} className="space-y-4">
            {/* TPS chart */}
            <div className="glass-card-hover p-4">
              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Tokens/sec History
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={tpsData}>
                  <defs>
                    <linearGradient id="tpsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--emerald))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--emerald))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="tps" stroke="hsl(var(--emerald))" fill="url(#tpsGrad)" strokeWidth={1.5} dot={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ display: "none" }}
                    formatter={(v: any) => [`${v.toFixed(1)} tps`, "Speed"]}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Context window */}
            <div className="glass-card-hover p-4">
              <div className="text-xs text-muted-foreground mb-3">Context Window</div>
              <div className="flex items-end justify-between mb-2">
                <span className="font-mono text-2xl font-semibold text-foreground">{contextPct.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground">{status.context_used} / {status.context_max}</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${contextPct}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>

            {/* Model details */}
            <div className="glass-card-hover p-4">
              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <HardDrive className="w-3 h-3" /> Model Details
              </div>
              <div className="space-y-2.5">
                {[
                  ["File", status.active_model],
                  ["Quantization", "Q4_K_M"],
                  ["Parameters", "7B"],
                  ["Backend", "llama.cpp (CPU)"],
                  ["Threads", "4"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono text-foreground truncate ml-2">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
