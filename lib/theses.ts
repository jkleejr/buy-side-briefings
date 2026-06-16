import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DATA_DIR = path.resolve(process.cwd(), "data");

// ---------------------------------------------------------------------------
// Theses — permanent, long-form, source-cited investment narratives (as opposed
// to the daily dossiers, which rotate). One markdown file per asset at
// data/theses/<slug>.md with frontmatter (title, subtitle, updated, summary).
// ---------------------------------------------------------------------------

export type ThesisMeta = {
  title: string;
  subtitle?: string;
  /** YYYY-MM-DD the thesis was last revised. */
  updated?: string;
  summary?: string;
};

export type Thesis = { meta: ThesisMeta; body: string };

export function getThesis(slug: string): Thesis | null {
  const file = path.join(DATA_DIR, "theses", `${slug}.md`);
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const { data, content } = matter(raw);
    const meta = data as ThesisMeta;
    // YAML auto-parses an unquoted date into a Date object, which can't render
    // as a React child — coerce any non-string `updated` back to YYYY-MM-DD.
    if (meta.updated != null && typeof meta.updated !== "string") {
      meta.updated = new Date(meta.updated as unknown as string).toISOString().slice(0, 10);
    }
    return { meta, body: content };
  } catch {
    return null;
  }
}
