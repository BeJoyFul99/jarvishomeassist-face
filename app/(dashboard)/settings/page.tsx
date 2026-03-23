"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, Server } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { SettingsForm } from "@/components/SettingsForm";
import { SERVER_SETTINGS, buildDefaults } from "@/lib/settingsSchema";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const DEFAULTS = buildDefaults(SERVER_SETTINGS);

export default function SettingsPage() {
  const token = useAuthStore((s) => s.token);
  const [values, setValues] = useState<Record<string, string>>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const authHeaders = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings", { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setValues((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // silent
      }
    };
    load();
  }, [authHeaders]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved", { description: "Server configuration has been updated." });
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setValues(DEFAULTS);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(DEFAULTS),
      });
      if (!res.ok) throw new Error("Failed to reset settings");
      toast.success("Settings reset to defaults");
    } catch {
      toast.error("Failed to reset settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <motion.div variants={item}>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Server className="w-5 h-5 text-muted-foreground" /> Server Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System-wide configuration for all users
        </p>
      </motion.div>

      <SettingsForm fields={SERVER_SETTINGS} values={values} onChange={handleChange} />

      <motion.div variants={item} className="flex gap-3">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Button onClick={handleReset} disabled={saving} variant="outline" className="gap-2 border-white/[0.06] text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-4 w-4" />
            Reset defaults
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
