import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Zap, Terminal, Send, Loader2 } from "lucide-react";
import type { SystemStatus } from "@/hooks/useSystemStatus";

interface InferenceEngineProps {
  status: SystemStatus;
}

const InferenceEngine = ({ status }: InferenceEngineProps) => {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const contextPct = (status.context_used / status.context_max) * 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setOutput("");
    const response = "The Intel i7 in your Mac runs the model at ~" + status.tps.toFixed(1) + " tokens/sec. Memory pressure is manageable for Q4 quantization.";
    let i = 0;
    const interval = setInterval(() => {
      setOutput(response.slice(0, i + 1));
      i++;
      if (i >= response.length) {
        clearInterval(interval);
        setGenerating(false);
      }
    }, 30);
    setPrompt("");
  };

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Inference Engine</h3>
        </div>
        <span className={`status-badge ${status.ai_status === "inferring" ? "bg-emerald/10 text-emerald" : "bg-secondary text-muted-foreground"}`}>
          {status.ai_status === "inferring" ? "⚡ Inferring" : "● Idle"}
        </span>
      </div>

      {/* Model info */}
      <div className="bg-secondary/50 rounded-lg p-3 mb-4">
        <div className="text-xs text-muted-foreground mb-1">Active Model</div>
        <div className="font-mono text-sm text-foreground truncate">{status.active_model}</div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Tokens/sec
          </div>
          <motion.div
            className="text-xl font-mono font-semibold text-emerald"
            key={status.tps.toFixed(1)}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
          >
            {status.tps.toFixed(1)}
          </motion.div>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Context Window</div>
          <div className="font-mono text-sm text-foreground mb-1.5">
            {status.context_used} / {status.context_max}
          </div>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${contextPct}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">llama.cpp prompt</span>
        </div>
        {output && (
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-mono text-emerald leading-relaxed">{output}
              {generating && <span className="animate-pulse">▊</span>}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center">
          <span className="pl-3 text-primary font-mono text-sm">❯</span>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter prompt..."
            className="flex-1 bg-transparent px-2 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={generating}
          />
          <button type="submit" disabled={generating || !prompt.trim()} className="p-2.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InferenceEngine;
