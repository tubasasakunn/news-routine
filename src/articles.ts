import { marked } from "marked";

export type Article = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  topics: string[];
  sources: string[]; // 出典 URL（1件以上）
  summary: string;
  html: string; // 本文（Markdown → HTML）
};

// content/articles/*.md をビルド時にバンドル（Workers にはファイルシステムが無いため）
const files = import.meta.glob("../content/articles/*.md", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

/**
 * 簡易フロントマターパーサ。
 * 対応: `key: value`（文字列）と `key: [a, b, c]`（インライン配列）のみ。
 * 記事の frontmatter はこの形式に揃えること（news-collection スキル参照）。
 */
function parseFrontmatter(raw: string): { meta: Record<string, string | string[]>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string | string[]> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      meta[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
    } else {
      meta[key] = stripQuotes(value);
    }
  }
  return { meta, body: match[2] };
}

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "");
}

function asArray(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v) return [v];
  return [];
}

function toArticle(path: string, raw: string): Article {
  const { meta, body } = parseFrontmatter(raw);
  const slug = (meta.slug as string) || path.split("/").pop()!.replace(/\.md$/, "");
  return {
    slug,
    title: (meta.title as string) || slug,
    date: (meta.date as string) || "1970-01-01",
    topics: asArray(meta.topics),
    sources: asArray(meta.sources),
    summary: (meta.summary as string) || "",
    html: marked.parse(body, { async: false }) as string,
  };
}

export const articles: Article[] = Object.entries(files)
  .map(([path, raw]) => toArticle(path, raw))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

export const articlesBySlug = new Map(articles.map((a) => [a.slug, a]));

export function allTopics(): string[] {
  const set = new Set<string>();
  for (const a of articles) for (const t of a.topics) set.add(t);
  return [...set].sort();
}

export function articlesByTopic(topic: string): Article[] {
  return articles.filter((a) => a.topics.includes(topic));
}
