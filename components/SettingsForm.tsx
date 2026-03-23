"use client";

import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { type SettingsField, groupBySection } from "@/lib/settingsSchema";

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

interface SettingsFormProps {
  fields: SettingsField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function SettingsForm({ fields, values, onChange }: SettingsFormProps) {
  const sections = groupBySection(fields);

  return (
    <>
      {sections.map(({ section, fields: sectionFields }) => (
        <motion.div key={section} variants={item} className="glass-card p-5 space-y-5">
          <h2 className="text-sm font-medium text-foreground">{section}</h2>
          <Separator className="bg-white/[0.06]" />
          <div className="grid gap-4">
            {sectionFields.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                value={values[field.key] ?? String(field.defaultValue)}
                onChange={(v) => onChange(field.key, v)}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </>
  );
}

// ── Per-field renderer ─────────────────────────────────────────

function FieldRow({ field, value, onChange }: { field: SettingsField; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-sm text-foreground">{field.label}</Label>
        <p className="text-xs text-muted-foreground">{field.description}</p>
      </div>
      {field.type === "toggle" && (
        <Switch
          checked={value === "true"}
          onCheckedChange={(checked) => onChange(String(checked))}
        />
      )}
      {field.type === "select" && field.options && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-48 bg-secondary/50 border-white/[0.06]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {field.type === "number" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={field.min}
            max={field.max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-20 bg-secondary/50 border-white/[0.06] font-mono text-sm"
          />
          {field.suffix && (
            <span className="text-xs text-muted-foreground">{field.suffix}</span>
          )}
        </div>
      )}
    </div>
  );
}
