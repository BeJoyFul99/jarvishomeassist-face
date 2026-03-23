// ─── Settings & Preferences Schema ─────────────────────────────
//
// To add a new setting or preference:
//   1. Add an entry to SERVER_SETTINGS or USER_PREFERENCES below
//   2. That's it. The UI renders automatically, backend already stores any key.
//
// If you add a new server setting, also add its default to
// SeedDefaultSettings() in the Go backend (handlers/settings.go).

export type FieldType = "toggle" | "select" | "number";

export interface SettingsField {
  /** Storage key — sent to/from the backend as-is */
  key: string;
  /** Display label */
  label: string;
  /** Short description shown below the label */
  description: string;
  /** Control type */
  type: FieldType;
  /** Default value (used for reset and initial state before backend loads) */
  defaultValue: string | boolean | number;
  /** Section heading this field appears under */
  section: string;
  /** For "select" type — dropdown options */
  options?: { value: string; label: string }[];
  /** For "number" type — min value */
  min?: number;
  /** For "number" type — max value */
  max?: number;
  /** For "number" type — unit suffix (e.g. "sec", "°C") */
  suffix?: string;
}

// ─── Server Settings (global, admin-only) ──────────────────────

export const SERVER_SETTINGS: SettingsField[] = [
  {
    key: "currency",
    label: "Currency",
    description: "Used across energy billing and budgets",
    type: "select",
    defaultValue: "CAD",
    section: "General",
    options: [
      { value: "CAD", label: "CAD — Canadian Dollar ($)" },
      { value: "USD", label: "USD — US Dollar ($)" },
      { value: "EUR", label: "EUR — Euro (\u20AC)" },
      { value: "GBP", label: "GBP — British Pound (\u00A3)" },
      { value: "AUD", label: "AUD — Australian Dollar ($)" },
      { value: "JPY", label: "JPY — Japanese Yen (\u00A5)" },
      { value: "INR", label: "INR — Indian Rupee (\u20B9)" },
    ],
  },
  {
    key: "terminal_logs",
    label: "Live terminal feed",
    description: "Show scrolling JSON logs on dashboard",
    type: "toggle",
    defaultValue: true,
    section: "General",
  },
  {
    key: "polling_interval",
    label: "Polling interval",
    description: "How often to fetch system status (seconds)",
    type: "number",
    defaultValue: 2,
    section: "Monitoring",
    min: 1,
    max: 30,
    suffix: "sec",
  },
  {
    key: "cpu_alert_threshold",
    label: "CPU alert threshold",
    description: "Trigger alert when temperature exceeds",
    type: "number",
    defaultValue: 90,
    section: "Monitoring",
    min: 60,
    max: 105,
    suffix: "\u00B0C",
  },
  {
    key: "auto_sleep_ai",
    label: "Auto-sleep AI engine",
    description: "Suspend llama.cpp after 30min idle",
    type: "toggle",
    defaultValue: true,
    section: "Monitoring",
  },
];

// ─── User Preferences (per-user, any authenticated user) ───────

export const USER_PREFERENCES: SettingsField[] = [
  {
    key: "theme",
    label: "Theme",
    description: "Dashboard appearance",
    type: "select",
    defaultValue: "dark",
    section: "Appearance",
    options: [
      { value: "dark", label: "Dark" },
      { value: "light", label: "Light (Coming soon)" },
      { value: "system", label: "System" },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Alert bell and sound effects",
    type: "toggle",
    defaultValue: true,
    section: "Notifications",
  },
];

// ─── Helpers ───────────────────────────────────────────────────

/** Group fields by section, preserving order of first appearance. */
export function groupBySection(fields: SettingsField[]): { section: string; fields: SettingsField[] }[] {
  const map = new Map<string, SettingsField[]>();
  for (const f of fields) {
    if (!map.has(f.section)) map.set(f.section, []);
    map.get(f.section)!.push(f);
  }
  return Array.from(map.entries()).map(([section, fields]) => ({ section, fields }));
}

/** Build a { key: defaultValue } map from a schema. */
export function buildDefaults(fields: SettingsField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    out[f.key] = String(f.defaultValue);
  }
  return out;
}
