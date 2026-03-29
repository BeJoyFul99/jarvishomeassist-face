"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "@/lib/pushManager";
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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "default">(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  // Check if already subscribed on mount
  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    if (!token) return;
    setPushLoading(true);
    try {
      if (enabled) {
        // Request permission first if needed
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          setPushPermission(perm);
          if (perm !== "granted") {
            setPushLoading(false);
            return;
          }
        }
        const ok = await subscribeToPush(token);
        setPushEnabled(ok);
        if (ok) toast.success("Push notifications enabled");
        else toast.error("Failed to enable push notifications");
      } else {
        await unsubscribeFromPush(token);
        setPushEnabled(false);
        toast.success("Push notifications disabled");
      }
    } catch {
      toast.error("Push notification error");
    }
    setPushLoading(false);
  };

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

      {/* Browser push — Web Push API via service worker */}
      <motion.div variants={item} className="glass-card p-5 space-y-5">
        <h2 className="text-sm font-medium text-foreground">Browser</h2>
        <div className="h-px bg-white/[0.06]" />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-foreground">
              Push notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              {pushPermission === "granted"
                ? "Receive reminders and alerts even when the app is closed"
                : pushPermission === "denied"
                  ? "Blocked by browser — enable in site settings"
                  : "Get notified about reminders and important events"}
            </p>
          </div>
          {pushPermission === "denied" ? (
            <span className="text-[11px] font-mono text-crimson">Blocked</span>
          ) : pushPermission === "granted" || pushEnabled ? (
            <Switch
              checked={pushEnabled}
              disabled={pushLoading}
              onCheckedChange={handlePushToggle}
            />
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
                disabled={pushLoading}
                onClick={() => handlePushToggle(true)}
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
