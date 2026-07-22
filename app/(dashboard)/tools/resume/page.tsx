"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { staggerContainer, springItem } from "@/lib/motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Save,
  Loader2,
  UserRound,
  Sparkles,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import {
  emptyProfile,
  fetchResumeProfile,
  saveResumeProfile,
  fetchResumeModels,
  generateResume,
  listGeneratedResumes,
  getGeneratedResume,
  deleteGeneratedResume,
  type ResumeProfileData,
  type TailoredResume,
  type CatalogModel,
  type GeneratedResumeRecord,
} from "@/lib/resume";
import { ProfileEditor } from "@/components/resume/ProfileEditor";
import { JobTailor } from "@/components/resume/JobTailor";
import { ResumeDocument, toDocData } from "@/components/resume/ResumeDocument";

const container = staggerContainer(0.08);
const item = springItem;

export default function ResumeBuilderPage() {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState<ResumeProfileData>(emptyProfile());
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [models, setModels] = useState<CatalogModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [generating, setGenerating] = useState(false);

  const [history, setHistory] = useState<GeneratedResumeRecord[]>([]);
  const [active, setActive] = useState<GeneratedResumeRecord | null>(null);
  const [previewMode, setPreviewMode] = useState<"tailored" | "master">("master");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Initial load: profile, model catalog, history — independent fetches.
  useEffect(() => {
    fetchResumeProfile()
      .then(setProfile)
      .catch(() => toast.error("Failed to load your resume profile"))
      .finally(() => setLoading(false));
    fetchResumeModels()
      .then(({ models, defaultModel }) => {
        setModels(models);
        setSelectedModel((m) => m || defaultModel);
      })
      .catch(() => {});
    listGeneratedResumes()
      .then(setHistory)
      .catch(() => {});
  }, []);

  const onProfileChange = useCallback((next: ResumeProfileData) => {
    setProfile(next);
    setDirty(true);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveResumeProfile(profile);
      setDirty(false);
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const generate = async (input: {
    job_title: string;
    company: string;
    job_description: string;
  }) => {
    // Always generate against the latest profile.
    if (dirty) {
      try {
        await saveResumeProfile(profile);
        setDirty(false);
      } catch {
        toast.error("Couldn't save your profile — fix that before generating");
        return;
      }
    }
    setGenerating(true);
    try {
      const record = await generateResume({ ...input, model: selectedModel });
      setActive(record);
      setPreviewMode("tailored");
      setHistory((h) => [record, ...h]);
      setTab("preview");
      toast.success("Tailored resume ready", {
        description: input.job_title
          ? `Optimized for ${input.job_title}`
          : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const loadResume = async (id: number) => {
    try {
      const record = await getGeneratedResume(id);
      setActive(record);
      setPreviewMode("tailored");
      setTab("preview");
    } catch {
      toast.error("Failed to load resume");
    }
  };

  const removeResume = async (id: number) => {
    try {
      await deleteGeneratedResume(id);
      setHistory((h) => h.filter((r) => r.id !== id));
      if (active?.id === id) {
        setActive(null);
        setPreviewMode("master");
      }
      toast.success("Resume deleted");
    } catch {
      toast.error("Failed to delete resume");
    }
  };

  const tailored: TailoredResume | null =
    previewMode === "tailored" && active?.content ? active.content : null;
  const docData = useMemo(
    () => toDocData(profile, tailored),
    [profile, tailored],
  );

  const printTitleRef = useRef<string>("");
  const downloadPdf = () => {
    const name = profile.contact.name?.trim().replace(/\s+/g, "") || "Resume";
    const suffix =
      tailored && active
        ? `-${(active.company || active.job_title || "Tailored").replace(/\s+/g, "")}`
        : "";
    printTitleRef.current = document.title;
    document.title = `${name}-Resume${suffix}`;
    const restore = () => {
      document.title = printTitleRef.current;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const previewPanel = (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Live Preview</h3>
        </div>
        <div className="flex items-center gap-2">
          {active?.content && (
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(
                [
                  ["tailored", "Tailored"],
                  ["master", "Master"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`px-2.5 py-1 text-[11px] transition-colors ${
                    previewMode === mode
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={downloadPdf}>
            <Download className="w-3 h-3" /> PDF
          </Button>
        </div>
      </div>
      {tailored && active && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
            <Sparkles className="w-2.5 h-2.5 mr-1" />
            {active.job_title || "Tailored"}
            {active.company ? ` @ ${active.company}` : ""}
          </Badge>
          {(tailored.keywords || []).slice(0, 6).map((k) => (
            <Badge key={k} variant="outline" className="text-[10px] text-muted-foreground">
              {k}
            </Badge>
          ))}
        </div>
      )}
      <div className="rounded-lg overflow-hidden border border-border shadow-xl shadow-black/20 max-h-[75vh] overflow-y-auto">
        <ResumeDocument data={docData} />
      </div>
    </div>
  );

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 space-y-5 max-w-[1500px] mx-auto"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Resume Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Keep one master profile — generate a tailored, ATS-friendly resume per job.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[10px] font-mono text-amber">unsaved changes</span>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Profile
          </Button>
          <Button size="sm" className="gap-1.5" onClick={downloadPdf}>
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <motion.div variants={item} className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading your profile…</span>
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <Tabs value={tab} onValueChange={setTab} className="space-y-5">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="profile" className="gap-1.5 text-xs">
                <UserRound className="w-3.5 h-3.5" /> Profile
              </TabsTrigger>
              <TabsTrigger value="tailor" className="gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" /> Tailor
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5 text-xs">
                <Eye className="w-3.5 h-3.5" /> Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                <ProfileEditor profile={profile} onChange={onProfileChange} />
                <div className="hidden xl:block sticky top-6">{previewPanel}</div>
              </div>
            </TabsContent>

            <TabsContent value="tailor">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                <JobTailor
                  models={models}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  generating={generating}
                  onGenerate={generate}
                  history={history}
                  activeId={active?.id ?? null}
                  onLoad={loadResume}
                  onDelete={removeResume}
                />
                <div className="hidden xl:block sticky top-6">{previewPanel}</div>
              </div>
            </TabsContent>

            <TabsContent value="preview">
              <div className="max-w-[850px] mx-auto">{previewPanel}</div>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}

      {/* Print-only copy rendered at the body root so app chrome, transforms,
          and overflow containers can't interfere with the printed page. */}
      {mounted &&
        createPortal(
          <div className="resume-print-root">
            <ResumeDocument data={docData} />
          </div>,
          document.body,
        )}
    </motion.div>
  );
}
