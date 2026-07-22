"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, User, Briefcase, GraduationCap, Wrench, Award, FolderGit2 } from "lucide-react";
import type { ResumeProfileData } from "@/lib/resume";

interface Props {
  profile: ResumeProfileData;
  onChange: (next: ResumeProfileData) => void;
}

/** Split a textarea into bullet lines (one bullet per line). */
const toLines = (v: string) => v.split("\n");
const toList = (v: string) => v.split(",").map((s) => s.trimStart());

function SectionCard({
  icon: Icon,
  title,
  hint,
  onAdd,
  children,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {hint && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {hint}
            </span>
          )}
        </div>
        {onAdd && (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onAdd}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
      aria-label="Remove entry"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  );
}

export function ProfileEditor({ profile, onChange }: Props) {
  const set = (patch: Partial<ResumeProfileData>) =>
    onChange({ ...profile, ...patch });

  const setContact = (key: keyof ResumeProfileData["contact"], v: string) =>
    set({ contact: { ...profile.contact, [key]: v } });

  const updateAt = <T,>(list: T[], i: number, patch: Partial<T>): T[] =>
    list.map((item, idx) => (idx === i ? { ...item, ...patch } : item));

  const removeAt = <T,>(list: T[], i: number): T[] =>
    list.filter((_, idx) => idx !== i);

  return (
    <div className="space-y-4">
      {/* Contact */}
      <SectionCard icon={User} title="Contact">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ["name", "Full name", "Jane Doe"],
              ["email", "Email", "jane@example.com"],
              ["phone", "Phone", "(555) 123-4567"],
              ["location", "Location", "Toronto, ON"],
              ["website", "Website / Portfolio", "janedoe.dev"],
              ["linkedin", "LinkedIn", "linkedin.com/in/janedoe"],
            ] as const
          ).map(([key, label, ph]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                value={profile.contact[key]}
                placeholder={ph}
                onChange={(e) => setContact(key, e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Summary */}
      <SectionCard icon={User} title="Professional Summary" hint="the AI rewrites this per job">
        <Textarea
          value={profile.summary}
          onChange={(e) => set({ summary: e.target.value })}
          placeholder="A few sentences about who you are, what you do best, and what you're looking for…"
          className="min-h-[90px] text-sm"
        />
      </SectionCard>

      {/* Experience */}
      <SectionCard
        icon={Briefcase}
        title="Work Experience"
        onAdd={() =>
          set({
            experiences: [
              ...profile.experiences,
              { company: "", role: "", location: "", start: "", end: "", bullets: [] },
            ],
          })
        }
      >
        {profile.experiences.length === 0 && (
          <p className="text-xs text-muted-foreground">No experience added yet.</p>
        )}
        <div className="space-y-5">
          {profile.experiences.map((exp, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  <Input value={exp.role} placeholder="Job title" className="h-9 text-sm"
                    onChange={(e) => set({ experiences: updateAt(profile.experiences, i, { role: e.target.value }) })} />
                  <Input value={exp.company} placeholder="Company" className="h-9 text-sm"
                    onChange={(e) => set({ experiences: updateAt(profile.experiences, i, { company: e.target.value }) })} />
                  <Input value={exp.location} placeholder="Location" className="h-9 text-sm"
                    onChange={(e) => set({ experiences: updateAt(profile.experiences, i, { location: e.target.value }) })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={exp.start} placeholder="Start (May 2022)" className="h-9 text-sm"
                      onChange={(e) => set({ experiences: updateAt(profile.experiences, i, { start: e.target.value }) })} />
                    <Input value={exp.end} placeholder="End (Present)" className="h-9 text-sm"
                      onChange={(e) => set({ experiences: updateAt(profile.experiences, i, { end: e.target.value }) })} />
                  </div>
                </div>
                <RemoveButton onClick={() => set({ experiences: removeAt(profile.experiences, i) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Achievements & responsibilities — one bullet per line
                </Label>
                <Textarea
                  value={exp.bullets.join("\n")}
                  placeholder={"Shipped X that improved Y by 30%\nLed a team of 4 engineers…"}
                  className="min-h-[90px] text-sm font-normal"
                  onChange={(e) =>
                    set({ experiences: updateAt(profile.experiences, i, { bullets: toLines(e.target.value) }) })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Skills */}
      <SectionCard
        icon={Wrench}
        title="Skills"
        onAdd={() => set({ skills: [...profile.skills, { category: "", items: [] }] })}
      >
        {profile.skills.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Group skills by category — e.g. &ldquo;Languages&rdquo;, &ldquo;Frameworks&rdquo;, &ldquo;Soft Skills&rdquo;.
          </p>
        )}
        <div className="space-y-3">
          {profile.skills.map((g, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 flex-1">
                <Input value={g.category} placeholder="Category" className="h-9 text-sm"
                  onChange={(e) => set({ skills: updateAt(profile.skills, i, { category: e.target.value }) })} />
                <Input
                  value={g.items.join(", ")}
                  placeholder="TypeScript, Go, PostgreSQL (comma-separated)"
                  className="h-9 text-sm"
                  onChange={(e) => set({ skills: updateAt(profile.skills, i, { items: toList(e.target.value) }) })}
                />
              </div>
              <RemoveButton onClick={() => set({ skills: removeAt(profile.skills, i) })} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Projects */}
      <SectionCard
        icon={FolderGit2}
        title="Projects"
        onAdd={() =>
          set({
            projects: [
              ...profile.projects,
              { name: "", description: "", bullets: [], technologies: [] },
            ],
          })
        }
      >
        {profile.projects.length === 0 && (
          <p className="text-xs text-muted-foreground">No projects added yet.</p>
        )}
        <div className="space-y-5">
          {profile.projects.map((p, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  <Input value={p.name} placeholder="Project name" className="h-9 text-sm"
                    onChange={(e) => set({ projects: updateAt(profile.projects, i, { name: e.target.value }) })} />
                  <Input
                    value={p.technologies.join(", ")}
                    placeholder="Tech used (comma-separated)"
                    className="h-9 text-sm"
                    onChange={(e) => set({ projects: updateAt(profile.projects, i, { technologies: toList(e.target.value) }) })}
                  />
                </div>
                <RemoveButton onClick={() => set({ projects: removeAt(profile.projects, i) })} />
              </div>
              <Input value={p.description} placeholder="One-line description" className="h-9 text-sm"
                onChange={(e) => set({ projects: updateAt(profile.projects, i, { description: e.target.value }) })} />
              <Textarea
                value={p.bullets.join("\n")}
                placeholder="Highlights — one bullet per line"
                className="min-h-[70px] text-sm"
                onChange={(e) => set({ projects: updateAt(profile.projects, i, { bullets: toLines(e.target.value) }) })}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Education */}
      <SectionCard
        icon={GraduationCap}
        title="Education"
        onAdd={() =>
          set({
            education: [
              ...profile.education,
              { school: "", degree: "", field: "", start: "", end: "", notes: "" },
            ],
          })
        }
      >
        {profile.education.length === 0 && (
          <p className="text-xs text-muted-foreground">No education added yet.</p>
        )}
        <div className="space-y-4">
          {profile.education.map((ed, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <Input value={ed.school} placeholder="School" className="h-9 text-sm"
                  onChange={(e) => set({ education: updateAt(profile.education, i, { school: e.target.value }) })} />
                <Input value={ed.degree} placeholder="Degree (B.Sc.)" className="h-9 text-sm"
                  onChange={(e) => set({ education: updateAt(profile.education, i, { degree: e.target.value }) })} />
                <Input value={ed.field} placeholder="Field of study" className="h-9 text-sm"
                  onChange={(e) => set({ education: updateAt(profile.education, i, { field: e.target.value }) })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={ed.start} placeholder="Start" className="h-9 text-sm"
                    onChange={(e) => set({ education: updateAt(profile.education, i, { start: e.target.value }) })} />
                  <Input value={ed.end} placeholder="End" className="h-9 text-sm"
                    onChange={(e) => set({ education: updateAt(profile.education, i, { end: e.target.value }) })} />
                </div>
                <Input value={ed.notes} placeholder="Notes (GPA, honours…)" className="h-9 text-sm sm:col-span-2"
                  onChange={(e) => set({ education: updateAt(profile.education, i, { notes: e.target.value }) })} />
              </div>
              <RemoveButton onClick={() => set({ education: removeAt(profile.education, i) })} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Certifications */}
      <SectionCard
        icon={Award}
        title="Certifications"
        onAdd={() =>
          set({
            certifications: [...profile.certifications, { name: "", issuer: "", year: "" }],
          })
        }
      >
        {profile.certifications.length === 0 && (
          <p className="text-xs text-muted-foreground">No certifications added yet.</p>
        )}
        <div className="space-y-3">
          {profile.certifications.map((cert, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px] gap-2 flex-1">
                <Input value={cert.name} placeholder="Certification" className="h-9 text-sm"
                  onChange={(e) => set({ certifications: updateAt(profile.certifications, i, { name: e.target.value }) })} />
                <Input value={cert.issuer} placeholder="Issuer" className="h-9 text-sm"
                  onChange={(e) => set({ certifications: updateAt(profile.certifications, i, { issuer: e.target.value }) })} />
                <Input value={cert.year} placeholder="Year" className="h-9 text-sm"
                  onChange={(e) => set({ certifications: updateAt(profile.certifications, i, { year: e.target.value }) })} />
              </div>
              <RemoveButton onClick={() => set({ certifications: removeAt(profile.certifications, i) })} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
