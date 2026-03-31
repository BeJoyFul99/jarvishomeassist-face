"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanFace,
  Lock,
  ChevronRight,
  Shield,
  Radio,
  Server,
  Mail,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore, toAuthUser } from "@/store/useAuthStore";

const LoginPage = () => {
  const router = useRouter();
  const { login, isAuthenticated, user, _hasHydrated } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [usePin, setUsePin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [uptime, setUptime] = useState("14d 02h 37m");
  const [nodesFound, setNodesFound] = useState(0);
  const [nodeSearching, setNodeSearching] = useState(true);

  // If already authenticated, redirect based on role (wait for hydration first)
  useEffect(() => {
    if (_hasHydrated && isAuthenticated && user) {
      router.replace(user.role === "administrator" ? "/dashboard" : "/home");
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Tokens are in HttpOnly cookies — we only receive user info
      const authUser = toAuthUser(data.user);
      login(authUser);

      router.push(
        authUser.role === "administrator" ? "/dashboard" : "/home",
      );
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (!pin || pin.length !== 6) {
      setError("6-digit PIN is required");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = { pin };
      if (email) body.email = email;
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "PIN login failed");
        setLoading(false);
        return;
      }

      const authUser = toAuthUser(data.user);
      login(authUser);
      router.push(authUser.role === "administrator" ? "/dashboard" : "/home");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const d = 14,
        h = 2,
        m = Math.floor(Math.random() * 60);
      setUptime(
        `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`,
      );
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
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--cyan) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--cyan) / 0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full opacity-[0.04]"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--cyan)), transparent 70%)",
        }}
      />

      {/* Node Discovery indicator */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-6 right-6 glass-card px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <Radio
            className={`w-3.5 h-3.5 text-cyan ${nodeSearching ? "node-search-pulse" : ""}`}
          />
          <div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {nodeSearching
                ? "Scanning Tailscale Network..."
                : "Network Scan Complete"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: nodesFound > i ? 1 : 0.2,
                    scale: nodesFound > i ? 1 : 0.8,
                  }}
                  className="flex items-center gap-1"
                >
                  <Server
                    className={`w-3 h-3 ${nodesFound > i ? "text-cyan" : "text-muted"}`}
                  />
                  <span
                    className={`text-[9px] font-mono ${nodesFound > i ? "text-cyan" : "text-muted"}`}
                  >
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
          <motion.div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 relative overflow-hidden">
            <Shield className="w-8 h-8 text-primary relative z-10" />
          </motion.div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Sovereign Gateway
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            Jarvis Home Assist · Command Center v3.0
          </p>
        </div>

        {/* Login Form */}
        <div className="flex justify-center mb-4">
          <button
            type="button"
            onClick={() => setUsePin(!usePin)}
            className="text-xs font-mono px-3 py-2 rounded-md bg-secondary/60 border border-border hover:bg-secondary/80"
          >
            {usePin ? "Use password instead" : "Use PIN instead"}
          </button>
        </div>

        <form
          onSubmit={usePin ? handlePinLogin : handleLogin}
          className="space-y-4"
        >
          {/* Email (hidden in PIN mode) */}
          {!usePin && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@homelab.local"
                  className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/50"
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          {/* Password or PIN */}
          {!usePin ? (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/50"
                  autoComplete="current-password"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guest@homelab.local"
                  className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/50"
                  autoComplete="email"
                />
              </div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mt-2">
                Guest PIN
              </label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="w-full bg-secondary border border-border rounded-lg pl-4 pr-4 py-3 text-foreground text-sm text-center letter-spacing-wide focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/50"
                />
                <div className="text-xs text-muted-foreground mt-2 font-mono">Guest login — enter your email and 6-digit PIN.</div>
              </div>
            </div>
          )}

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-crimson bg-crimson/10 border border-crimson/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl ${usePin ? "bg-cyan text-black" : "bg-primary/10 text-primary"} border border-primary/30 flex items-center justify-center gap-3 transition-all duration-300 hover:brightness-105 disabled:opacity-70`}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span className="font-medium">Processing...</span>
            ) : usePin ? (
              <>
                <span className="font-medium">Unlock</span>
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <ScanFace className="w-5 h-5" />
                <span className="font-medium">Sign In</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

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
