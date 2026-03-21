"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function SettingsPage() {
  const effectiveRole = useAuthStore((s) => s.effectiveRole());
  const isAdmin = effectiveRole === "administrator";
  const [pollingInterval, setPollingInterval] = useState("2");
  const [alertThreshold, setAlertThreshold] = useState("90");
  const [autoSleep, setAutoSleep] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState(true);
  const [theme, setTheme] = useState("dark");
  const {
    browserNotificationsEnabled,
    setBrowserNotificationsEnabled,
    browserPermission,
    requestBrowserPermission,
  } = useNotificationStore();
  const handleSave = () => {
    toast.success("Settings saved", {
      description: "Your configuration has been updated.",
    });
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-3xl mx-auto space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System configuration & preferences
        </p>
      </motion.div>

      {/* General */}
      <motion.div variants={item} className="glass-card p-5 space-y-5">
        <h2 className="text-sm font-medium text-foreground">General</h2>
        <Separator className="bg-border" />

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-foreground">Theme</Label>
              <p className="text-xs text-muted-foreground">
                Dashboard appearance
              </p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-36 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light (Coming soon)</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-foreground">
                Browser push notifications
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
              <span className="text-[11px] font-mono text-crimson">
                Blocked
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-border"
                onClick={requestBrowserPermission}
              >
                <BellRing className="w-3.5 h-3.5" />
                Enable
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-foreground">Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Alert bell and sound effects
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-foreground">
                  Live terminal feed
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show scrolling JSON logs on dashboard
                </p>
              </div>
              <Switch checked={terminalLogs} onCheckedChange={setTerminalLogs} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Monitoring — Admin only */}
      {isAdmin && (
        <motion.div variants={item} className="glass-card p-5 space-y-5">
          <h2 className="text-sm font-medium text-foreground">Monitoring</h2>
          <Separator className="bg-border" />

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-foreground">
                  Polling interval
                </Label>
                <p className="text-xs text-muted-foreground">
                  How often to fetch /api/v1/status
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={pollingInterval}
                  onChange={(e) => setPollingInterval(e.target.value)}
                  className="w-20 bg-secondary border-border font-mono text-sm"
                />
                <span className="text-xs text-muted-foreground">sec</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-foreground">
                  CPU alert threshold
                </Label>
                <p className="text-xs text-muted-foreground">
                  Trigger alert when temperature exceeds
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={60}
                  max={105}
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-20 bg-secondary border-border font-mono text-sm"
                />
                <span className="text-xs text-muted-foreground">°C</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-foreground">
                  Auto-sleep AI engine
                </Label>
                <p className="text-xs text-muted-foreground">
                  Suspend llama.cpp after 30min idle
                </p>
              </div>
              <Switch checked={autoSleep} onCheckedChange={setAutoSleep} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div variants={item} className="flex gap-3">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save changes
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-border text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Reset defaults
        </Button>
      </motion.div>
    </motion.div>
  );
}
