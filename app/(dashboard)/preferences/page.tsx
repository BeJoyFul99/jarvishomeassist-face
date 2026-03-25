"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { SettingsForm } from "@/components/SettingsForm";
import { USER_PREFERENCES, buildDefaults } from "@/lib/settingsSchema";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const DEFAULTS = buildDefaults(USER_PREFERENCES);

export default function PreferencesPage() {
  const token = useAuthStore((s) => s.token);
  const [values, setValues] = useState<Record<string, string>>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const {
    browserNotificationsEnabled,
    setBrowserNotificationsEnabled,
    browserPermission,
    requestBrowserPermission,
  } = useNotificationStore();

  const authHeaders = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/preferences", { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          // Backend stores values as mixed types; normalize to strings
          const normalized: Record<string, string> = {};
          for (const [k, v] of Object.entries(data)) {
            normalized[k] = String(v);
          }
          setValues((prev) => ({ ...prev, ...normalized }));
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
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      toast.success("Preferences saved", {
        description: "Your personal preferences have been updated.",
      });
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setValues(DEFAULTS);
    setSaving(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(DEFAULTS),
      });
      if (!res.ok) throw new Error("Failed to reset preferences");
      toast.success("Preferences reset to defaults");
    } catch {
      toast.error("Failed to reset preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-3xl mx-auto p-4 md:p-6 space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-xl font-semibold text-foreground">Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personal display & notification settings
        </p>
      </motion.div>

      <SettingsForm
        fields={USER_PREFERENCES}
        values={values}
        onChange={handleChange}
      />

      {/* Browser push — special case, lives outside schema (browser API, not stored on server) */}
      <motion.div variants={item} className="glass-card p-5 space-y-5">
        <h2 className="text-sm font-medium text-foreground">Browser</h2>
        <div className="h-px bg-white/[0.06]" />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-foreground">
              Push notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              {browserPermission === "granted"
                ? "Native alerts even when tab is unfocused"
                : browserPermission === "denied"
                  ? "Blocked by browser — enable in site settings"
                  : "Send native browser alerts for critical events"}
            </p>
          </div>
          {browserPermission === "granted" ? (
            <Switch
              checked={browserNotificationsEnabled}
              onCheckedChange={setBrowserNotificationsEnabled}
            />
          ) : browserPermission === "denied" ? (
            <span className="text-[11px] font-mono text-crimson">Blocked</span>
          ) : (
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-white/[0.06]"
                onClick={requestBrowserPermission}
              >
                <BellRing className="w-3.5 h-3.5" />
                Enable
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row gap-3 pt-2"
      >
        <motion.div
          className="flex-1 sm:flex-initial"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 h-auto text-sm gap-2 font-medium shadow-lg shadow-primary/20"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save preferences"}
          </Button>
        </motion.div>
        <motion.div
          className="flex-1 sm:flex-initial"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleReset}
            disabled={saving}
            variant="outline"
            className="w-full sm:w-auto px-4 py-2 h-auto text-sm gap-2 border-white/10 text-muted-foreground hover:text-foreground transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            Reset defaults
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
