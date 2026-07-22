"use client";

import type {
  ContactInfo,
  ResumeProfileData,
  TailoredResume,
} from "@/lib/resume";

export interface ResumeDocData {
  contact: ContactInfo;
  summary: string;
  skills: ResumeProfileData["skills"];
  experiences: ResumeProfileData["experiences"];
  education: ResumeProfileData["education"];
  certifications: ResumeProfileData["certifications"];
  projects: ResumeProfileData["projects"];
}

/** Merge a tailored AI resume with the profile's contact block. */
export function toDocData(
  profile: ResumeProfileData,
  tailored?: TailoredResume | null,
): ResumeDocData {
  if (!tailored) return profile;
  return {
    contact: profile.contact,
    summary: tailored.summary || "",
    skills: tailored.skills || [],
    experiences: tailored.experiences || [],
    education: tailored.education || [],
    certifications: tailored.certifications || [],
    projects: tailored.projects || [],
  };
}

const range = (start?: string, end?: string) =>
  [start, end].filter(Boolean).join(" – ");

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-800 border-b border-neutral-300 pb-1 mb-2 mt-5 first:mt-0">
      {children}
    </h2>
  );
}

/**
 * The printable resume document. Deliberately theme-independent: always
 * black-on-white with classic professional typography so the on-screen
 * preview matches the printed PDF exactly.
 */
export function ResumeDocument({ data }: { data: ResumeDocData }) {
  const c = data.contact;
  const contactLine = [c.email, c.phone, c.location, c.website, c.linkedin]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div
      className="bg-white text-neutral-900 px-10 py-9 w-full"
      style={{
        fontFamily: "'Source Serif Pro', Georgia, 'Times New Roman', serif",
      }}
    >
      {/* Header */}
      <header className="text-center mb-4">
        <h1 className="text-[26px] font-bold tracking-wide text-neutral-900 leading-tight">
          {c.name?.trim() || "Your Name"}
        </h1>
        {contactLine && (
          <p className="text-[11px] text-neutral-600 mt-1">{contactLine}</p>
        )}
      </header>

      {/* Summary */}
      {data.summary?.trim() && (
        <section>
          <SectionTitle>Summary</SectionTitle>
          <p className="text-[12px] leading-[1.5] text-neutral-800">
            {data.summary}
          </p>
        </section>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <section>
          <SectionTitle>Skills</SectionTitle>
          <div className="space-y-0.5">
            {data.skills.map((g, i) => (
              <p key={i} className="text-[12px] leading-[1.45] text-neutral-800">
                {g.category?.trim() && (
                  <span className="font-semibold">{g.category}: </span>
                )}
                {g.items.filter((s) => s.trim()).join(", ")}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {data.experiences.length > 0 && (
        <section>
          <SectionTitle>Experience</SectionTitle>
          <div className="space-y-3">
            {data.experiences.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[13px] font-semibold text-neutral-900">
                    {e.role?.trim() || "Role"}
                    {e.company?.trim() && (
                      <span className="font-normal text-neutral-700">
                        {" "}
                        · {e.company}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-neutral-600 whitespace-nowrap">
                    {range(e.start, e.end)}
                  </p>
                </div>
                {e.location?.trim() && (
                  <p className="text-[11px] italic text-neutral-600">
                    {e.location}
                  </p>
                )}
                {e.bullets.filter((b) => b.trim()).length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-4 list-disc marker:text-neutral-500">
                    {e.bullets
                      .filter((b) => b.trim())
                      .map((b, j) => (
                        <li
                          key={j}
                          className="text-[12px] leading-[1.45] text-neutral-800"
                        >
                          {b}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <section>
          <SectionTitle>Projects</SectionTitle>
          <div className="space-y-2.5">
            {data.projects.map((p, i) => (
              <div key={i}>
                <p className="text-[13px] font-semibold text-neutral-900">
                  {p.name?.trim() || "Project"}
                  {p.technologies?.filter((t) => t.trim()).length > 0 && (
                    <span className="font-normal text-[11px] text-neutral-600">
                      {" "}
                      — {p.technologies.filter((t) => t.trim()).join(", ")}
                    </span>
                  )}
                </p>
                {p.description?.trim() && (
                  <p className="text-[12px] leading-[1.45] text-neutral-800">
                    {p.description}
                  </p>
                )}
                {p.bullets?.filter((b) => b.trim()).length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-4 list-disc marker:text-neutral-500">
                    {p.bullets
                      .filter((b) => b.trim())
                      .map((b, j) => (
                        <li
                          key={j}
                          className="text-[12px] leading-[1.45] text-neutral-800"
                        >
                          {b}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <section>
          <SectionTitle>Education</SectionTitle>
          <div className="space-y-2">
            {data.education.map((ed, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[13px] font-semibold text-neutral-900">
                    {ed.school?.trim() || "School"}
                  </p>
                  <p className="text-[11px] text-neutral-600 whitespace-nowrap">
                    {range(ed.start, ed.end)}
                  </p>
                </div>
                {(ed.degree?.trim() || ed.field?.trim()) && (
                  <p className="text-[12px] text-neutral-800">
                    {[ed.degree, ed.field].filter((s) => s?.trim()).join(", ")}
                  </p>
                )}
                {ed.notes?.trim() && (
                  <p className="text-[11px] text-neutral-600">{ed.notes}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {data.certifications.length > 0 && (
        <section>
          <SectionTitle>Certifications</SectionTitle>
          <div className="space-y-0.5">
            {data.certifications.map((cert, i) => (
              <p key={i} className="text-[12px] leading-[1.45] text-neutral-800">
                <span className="font-semibold">{cert.name}</span>
                {cert.issuer?.trim() && ` — ${cert.issuer}`}
                {cert.year?.trim() && (
                  <span className="text-neutral-600"> ({cert.year})</span>
                )}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
