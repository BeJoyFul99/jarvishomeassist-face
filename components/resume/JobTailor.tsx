"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Trash2,
  Cpu,
  History,
  FileText,
} from "lucide-react";
import type { CatalogModel, GeneratedResumeRecord } from "@/lib/resume";

interface Props {
  models: CatalogModel[];
  selectedModel: string;
  onModelChange: (id: string) => void;
  generating: boolean;
  onGenerate: (input: {
    job_title: string;
    company: string;
    job_description: string;
  }) => void;
  history: GeneratedResumeRecord[];
  activeId: number | null;
  onLoad: (id: number) => void;
  onDelete: (id: number) => void;
}

export function JobTailor({
  models,
  selectedModel,
  onModelChange,
  generating,
  onGenerate,
  history,
  activeId,
  onLoad,
  onDelete,
}: Props) {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const canGenerate = jobDescription.trim().length > 0 && !generating;
  const activeModel = models.find((m) => m.id === selectedModel);

  return (
    <div className="space-y-4">
      {/* Job input */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Job Posting</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Job title</Label>
            <Input
              value={jobTitle}
              placeholder="Senior Software Engineer"
              onChange={(e) => setJobTitle(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Company</Label>
            <Input
              value={company}
              placeholder="Acme Corp"
              onChange={(e) => setCompany(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Job description — paste the full posting
          </Label>
          <Textarea
            value={jobDescription}
            placeholder="Paste the responsibilities, requirements, and anything else from the posting…"
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-[200px] text-sm"
          />
        </div>
      </div>

      {/* Model + generate */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-magenta" />
          <h3 className="text-sm font-medium text-foreground">AI Model</h3>
        </div>
        <Select value={selectedModel} onValueChange={onModelChange} disabled={generating}>
          <SelectTrigger className="bg-secondary/50 border-border h-9 text-xs font-mono">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeModel && (
          <p className="text-[11px] text-muted-foreground">{activeModel.description}</p>
        )}
        <Button
          className="w-full gap-2"
          disabled={!canGenerate}
          onClick={() =>
            onGenerate({
              job_title: jobTitle.trim(),
              company: company.trim(),
              job_description: jobDescription.trim(),
            })
          }
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Tailoring your resume…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Tailored Resume
            </>
          )}
        </Button>
      </div>

      {/* History */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan" />
          <h3 className="text-sm font-medium text-foreground">Previous Resumes</h3>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Generated resumes appear here — load one anytime.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                  activeId === r.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-secondary/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onLoad(r.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-xs font-medium text-foreground truncate">
                    {r.job_title || "Untitled role"}
                    {r.company && (
                      <span className="text-muted-foreground"> · {r.company}</span>
                    )}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">
                    {new Date(r.created_at).toLocaleString()}
                    {r.model && ` · ${r.model.split("/").pop()}`}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => onDelete(r.id)}
                  aria-label="Delete resume"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
