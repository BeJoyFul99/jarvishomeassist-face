"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanFace, Lock, ChevronRight, Shield, Radio, Server } from "lucide-react";
import { useRouter } from "next/navigation";

const LoginPage = () => {
  const router = useRouter();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [scanning, setScanning] = useState(false);
  const [uptime, setUptime] = useState("14d 02h 37m");
  const [nodesFound, setNodesFound] = useState(0);
  const [nodeSearching, setNodeSearching] = useState(true);

  const handleBiometric = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      router.push("/dashboard");
    }, 2500);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) router.push("/dashboard");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const d = 14, h = 2, m = Math.floor(Math.random() * 60);
      setUptime(`${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Node discovery simulation
  useEffect(() => {
    const steps = [1, 2, 3];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setNodesFound(steps[i]);
        i++;
      } else {
        setNodeSearching(false);
        clearInterval(interval);
      }
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "linear-gradient(hsl(var(--cyan) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--cyan) / 0.5) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, hsl(var(--cyan)), transparent 70%)" }} />

      {/* Node Discovery indicator */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-6 right-6 glass-card px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <Radio className={`w-3.5 h-3.5 text-cyan ${nodeSearching ? "node-search-pulse" : ""}`} />
          <div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {nodeSearching ? "Scanning Tailscale Network..." : "Network Scan Complete"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: nodesFound > i ? 1 : 0.2,
                    scale: nodesFound > i ? 1 : 0.8,
                  }}
                  className="flex items-center gap-1"
                >
                  <Server className={`w-3 h-3 ${nodesFound > i ? "text-cyan" : "text-muted"}`} />
                  <span className={`text-[9px] font-mono ${nodesFound > i ? "text-cyan" : "text-muted"}`}>
                    {["NODE-01", "NODE-02", "NODE-03"][i]}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-card w-full max-w-md p-8 relative"
      >
        {/* HUD corners */}
        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-primary/40 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-primary/40 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-primary/40 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-primary/40 rounded-br-xl" />

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 relative overflow-hidden"
            animate={scanning ? { borderColor: ["hsl(var(--cyan))", "hsl(var(--emerald))", "hsl(var(--cyan))"] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {scanning && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-primary/30 via-transparent to-transparent"
                animate={{ y: ["-100%", "200%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            )}
            <Shield className="w-8 h-8 text-primary relative z-10" />
          </motion.div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Multi-Factor Gateway</h1>
          <p className="text-sm text-muted-foreground font-mono">Sovereign Fleet · Command Center v3.0</p>
        </div>

        {/* Face ID Button */}
        <motion.button
          onClick={handleBiometric}
          disabled={scanning}
          className="w-full py-4 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center gap-3 mb-4 transition-all duration-300 hover:bg-primary/20 hover:border-primary/50 disabled:opacity-70 relative overflow-hidden"
          whileTap={{ scale: 0.98 }}
        >
          {scanning && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent scan-line"
            />
          )}
          <ScanFace className="w-5 h-5" />
          <span className="font-medium">{scanning ? "Scanning Biometrics..." : "Authenticate with Face ID"}</span>
        </motion.button>

        {/* PIN Fallback */}
        <AnimatePresence>
          {!showPin ? (
            <motion.button
              onClick={() => setShowPin(true)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              Use PIN instead
            </motion.button>
          ) : (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handlePinSubmit}
              className="space-y-3"
            >
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground font-mono text-center tracking-[0.5em] placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                autoFocus
                maxLength={8}
              />
              <motion.button
                type="submit"
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Unlock <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Status bar */}
        <div className="mt-8 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan pulse-dot" />
            Fleet: {nodesFound}/3 Nodes
          </div>
          <span>Uptime: {uptime}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
