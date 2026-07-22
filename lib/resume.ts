// Shared types + API client for the Resume Builder tool.
// Server counterpart: jarvisHomeAssist-brain/internal/handlers/resume.go

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
}

export interface ExperienceEntry {
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  notes: string;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  year: string;
}

export interface ProjectEntry {
  name: string;
  description: string;
  bullets: string[];
  technologies: string[];
}

/** The master profile the user maintains. Stored server-side as JSONB. */
export interface ResumeProfileData {
  contact: ContactInfo;
  summary: string;
  experiences: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillGroup[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
}

/** AI-tailored resume document (contact stays client-side from the profile). */
export interface TailoredResume {
  summary: string;
  skills: SkillGroup[];
  experiences: ExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
  keywords: string[];
}

export interface GeneratedResumeRecord {
  id: number;
  job_title: string;
  company: string;
  model: string;
  created_at: string;
  job_description?: string;
  content?: TailoredResume;
}

export interface CatalogModel {
  id: string;
  name: string;
  capabilities: string[];
  description: string;
}

export function emptyProfile(): ResumeProfileData {
  return {
    contact: { name: "", email: "", phone: "", location: "", website: "", linkedin: "" },
    summary: "",
    experiences: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
  };
}

/** Fill in any missing sections so old/partial server data never breaks the UI. */
export function normalizeProfile(raw: unknown): ResumeProfileData {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ResumeProfileData>;
  return {
    contact: { ...base.contact, ...(r.contact || {}) },
    summary: typeof r.summary === "string" ? r.summary : "",
    experiences: Array.isArray(r.experiences) ? r.experiences : [],
    education: Array.isArray(r.education) ? r.education : [],
    skills: Array.isArray(r.skills) ? r.skills : [],
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    projects: Array.isArray(r.projects) ? r.projects : [],
  };
}

// ── API helpers (auth cookies attach automatically; 401s auto-refresh) ──

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { message?: string; error?: string }).message ||
      (data as { error?: string }).error ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function fetchResumeProfile(): Promise<ResumeProfileData> {
  const res = await fetch("/api/v1/resume/profile");
  const data = await jsonOrThrow<{ data: unknown }>(res);
  return normalizeProfile(data.data);
}

export async function saveResumeProfile(profile: ResumeProfileData): Promise<void> {
  const res = await fetch("/api/v1/resume/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  await jsonOrThrow(res);
}

export async function generateResume(input: {
  job_title: string;
  company: string;
  job_description: string;
  model?: string;
}): Promise<GeneratedResumeRecord> {
  const res = await fetch("/api/v1/resume/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<GeneratedResumeRecord>(res);
}

export async function listGeneratedResumes(): Promise<GeneratedResumeRecord[]> {
  const res = await fetch("/api/v1/resume/generated");
  const data = await jsonOrThrow<{ resumes: GeneratedResumeRecord[] }>(res);
  return data.resumes || [];
}

export async function getGeneratedResume(id: number): Promise<GeneratedResumeRecord> {
  const res = await fetch(`/api/v1/resume/generated/${id}`);
  return jsonOrThrow<GeneratedResumeRecord>(res);
}

export async function deleteGeneratedResume(id: number): Promise<void> {
  const res = await fetch(`/api/v1/resume/generated/${id}`, { method: "DELETE" });
  await jsonOrThrow(res);
}

export async function fetchResumeModels(): Promise<{
  models: CatalogModel[];
  defaultModel: string;
}> {
  const [modelsRes, settingsRes] = await Promise.all([
    fetch("/api/v1/resume/models"),
    fetch("/api/settings"),
  ]);
  const data = await jsonOrThrow<{ models: CatalogModel[] }>(modelsRes);
  const settings: Record<string, string> = settingsRes.ok
    ? await settingsRes.json().catch(() => ({}))
    : {};
  const chatModels = (data.models || []).filter((m) =>
    m.capabilities.includes("chat"),
  );
  return {
    models: chatModels,
    defaultModel: settings["ai_resume_model"] || chatModels[0]?.id || "",
  };
}
