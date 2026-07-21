"use client";

import { useEffect, useState } from "react";
import { Brain, MessageCircle, Receipt, Loader2, Eye, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface CatalogModel {
  id: string;
  name: string;
  capabilities: string[];
  description: string;
}

const FEATURES = [
  {
    settingKey: "ai_chat_model",
    label: "Chat",
    capability: "chat",
    icon: MessageCircle,
    color: "text-cyan",
  },
  {
    settingKey: "ai_bill_model",
    label: "Bill Reading",
    capability: "vision",
    icon: Receipt,
    color: "text-amber",
  },
] as const;

/** Real model library: lists the worker's catalog and lets admins pick a
 *  model per feature. Selections persist as settings and are sent on every
 *  AI call by the backend. */
export default function ModelLibrary() {
  const [models, setModels] = useState<CatalogModel[] | null>(null);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [modelsRes, settingsRes] = await Promise.all([
          fetch("/api/v1/admin/ai-models"),
          fetch("/api/settings"),
        ]);
        if (!modelsRes.ok) {
          setError("Model catalog unavailable");
          return;
        }
        const modelsData = await modelsRes.json();
        if (!Array.isArray(modelsData.models) || modelsData.models.length === 0) {
          setError(modelsData.error || "No models available");
          return;
        }
        setModels(modelsData.models);
        const sel: Record<string, string> = {};
        const settings = settingsRes.ok ? await settingsRes.json() : {};
        for (const f of FEATURES) {
          sel[f.settingKey] =
            settings[f.settingKey] ||
            modelsData.defaults?.[f.settingKey === "ai_chat_model" ? "chat" : "bill_extract"] ||
            "";
        }
        setSelection(sel);
      } catch {
        setError("Model catalog unavailable");
      }
    };
    load();
  }, []);

  const save = async (settingKey: string, modelId: string) => {
    const prev = selection[settingKey];
    setSelection((s) => ({ ...s, [settingKey]: modelId }));
    setSaving(settingKey);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [settingKey]: modelId }),
      });
      if (!res.ok) throw new Error();
      const label = FEATURES.find((f) => f.settingKey === settingKey)?.label;
      toast.success(`${label} model updated`, {
        description: modelId.split("/").pop(),
      });
    } catch {
      setSelection((s) => ({ ...s, [settingKey]: prev }));
      toast.error("Failed to save model selection");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-magenta" />
          <h3 className="text-sm font-medium text-foreground">Model Library</h3>
        </div>
        {models && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {models.length} models
          </span>
        )}
      </div>

      {error ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{error}</p>
      ) : !models ? (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading catalog…</span>
        </div>
      ) : (
        <>
          {/* Per-feature assignment */}
          <div className="space-y-3 mb-4">
            {FEATURES.map((f) => (
              <div key={f.settingKey} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  {saving === f.settingKey && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Select
                  value={selection[f.settingKey] || ""}
                  onValueChange={(v) => save(f.settingKey, v)}
                  disabled={saving !== null}
                >
                  <SelectTrigger className="bg-secondary/50 border-border h-9 text-xs font-mono">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models
                      .filter((m) => m.capabilities.includes(f.capability))
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Catalog */}
          <div className="space-y-2">
            {models.map((m) => {
              const usedBy = FEATURES.filter(
                (f) => selection[f.settingKey] === m.id,
              );
              return (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-lg border ${
                    usedBy.length > 0
                      ? "bg-magenta/5 border-magenta/20"
                      : "bg-secondary/50 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-foreground truncate">
                      {m.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {m.capabilities.includes("vision") && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" /> vision
                        </span>
                      )}
                      {usedBy.map((f) => (
                        <span
                          key={f.settingKey}
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-magenta/10 ${f.color} flex items-center gap-1`}
                        >
                          <Check className="w-2.5 h-2.5" /> {f.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {m.description}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
