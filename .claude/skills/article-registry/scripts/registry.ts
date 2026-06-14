#!/usr/bin/env bun
/**
 * 投稿済み記事台帳の重複チェック / 追記ツール。
 *
 * 使い方:
 *   bun run registry.ts check --source <url> --title <title> --topics a,b,c
 *   bun run registry.ts add   --slug <slug> --title <title> --source <url> \
 *                             --topics a,b,c --summary <text> --published YYYY-MM-DD
 *   bun run registry.ts list  [--limit N]
 *
 * 設計:
 *   - 機械判定のみ（決定的）。意味的な類似判定は呼び出し側の LLM が担う。
 *   - check は verdict を JSON で stdout に出す: "duplicate" | "review" | "clear"
 *   - 台帳は <repo>/data/articles.json。無ければ [] 扱い。
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

type Article = {
  slug: string;
  title: string;
  sourceUrl: string;
  topics: string[];
  summary?: string;
  publishedAt: string;
};

// .claude/skills/article-registry/scripts/registry.ts → リポジトリルートは4階層上
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const REGISTRY_PATH = resolve(REPO_ROOT, "data/articles.json");

// topics 重複が「要レビュー」になる閾値（重複トピック数）
const TOPIC_OVERLAP_THRESHOLD = 2;

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = val;
    }
  }
  return out;
}

async function loadRegistry(): Promise<Article[]> {
  const file = Bun.file(REGISTRY_PATH);
  if (!(await file.exists())) return [];
  try {
    const data = JSON.parse(await file.text());
    return Array.isArray(data) ? data : [];
  } catch {
    throw new Error(`台帳の JSON 解析に失敗: ${REGISTRY_PATH}`);
  }
}

async function saveRegistry(articles: Article[]): Promise<void> {
  await Bun.write(REGISTRY_PATH, JSON.stringify(articles, null, 2) + "\n");
}

function normalizeTitle(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　]+/g, "")
    .replace(/[、。,.!?！？「」『』（）()\[\]【】・…\-—_]/g, "");
}

function normalizeTopic(s: string): string {
  return s.normalize("NFKC").toLowerCase().trim();
}

function parseTopics(raw?: string): string[] {
  if (!raw || raw === "true") return [];
  return raw.split(",").map(normalizeTopic).filter(Boolean);
}

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(2);
}

async function cmdCheck(args: Record<string, string>) {
  const source = args.source && args.source !== "true" ? args.source : "";
  const title = args.title && args.title !== "true" ? args.title : "";
  const topics = parseTopics(args.topics);
  if (!source && !title) fail("check には --source か --title が必要です");

  const registry = await loadRegistry();
  const normTitle = normalizeTitle(title);

  // 1) 確定重複: 同一 sourceUrl or 正規化タイトル一致
  const exact = registry.find(
    (a) =>
      (source && a.sourceUrl === source) ||
      (normTitle && normalizeTitle(a.title) === normTitle),
  );
  if (exact) {
    print({
      verdict: "duplicate",
      reason: source && exact.sourceUrl === source ? "same_source_url" : "same_normalized_title",
      match: brief(exact),
    });
    return;
  }

  // 2) 要レビュー: topics 重複が閾値以上の記事を候補として返す
  const candidates = registry
    .map((a) => {
      const set = new Set(a.topics.map(normalizeTopic));
      const overlap = topics.filter((t) => set.has(t));
      return { a, overlap };
    })
    .filter((x) => x.overlap.length >= TOPIC_OVERLAP_THRESHOLD)
    .sort((x, y) => y.overlap.length - x.overlap.length)
    .slice(0, 10)
    .map((x) => ({ ...brief(x.a), overlapTopics: x.overlap }));

  if (candidates.length > 0) {
    print({
      verdict: "review",
      reason: "topic_overlap",
      threshold: TOPIC_OVERLAP_THRESHOLD,
      candidates,
      note: "各候補と実質同じテーマ/出来事かを LLM が判断すること",
    });
    return;
  }

  print({ verdict: "clear" });
}

async function cmdAdd(args: Record<string, string>) {
  const required = ["slug", "title", "source", "published"];
  for (const k of required) {
    if (!args[k] || args[k] === "true") fail(`add には --${k} が必要です`);
  }
  const registry = await loadRegistry();

  if (registry.some((a) => a.slug === args.slug)) fail(`slug が重複: ${args.slug}`);
  if (registry.some((a) => a.sourceUrl === args.source)) fail(`sourceUrl が既に存在: ${args.source}`);

  const article: Article = {
    slug: args.slug,
    title: args.title,
    sourceUrl: args.source,
    topics: parseTopics(args.topics),
    summary: args.summary && args.summary !== "true" ? args.summary : undefined,
    publishedAt: args.published,
  };
  registry.push(article);
  await saveRegistry(registry);
  print({ ok: true, added: article, total: registry.length });
}

async function cmdList(args: Record<string, string>) {
  const registry = await loadRegistry();
  const limit = args.limit && args.limit !== "true" ? parseInt(args.limit, 10) : registry.length;
  const items = [...registry].reverse().slice(0, limit).map(brief);
  print({ total: registry.length, items });
}

function brief(a: Article) {
  return { slug: a.slug, title: a.title, sourceUrl: a.sourceUrl, publishedAt: a.publishedAt };
}

function print(obj: unknown) {
  console.log(JSON.stringify(obj, null, 2));
}

const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
switch (cmd) {
  case "check":
    await cmdCheck(args);
    break;
  case "add":
    await cmdAdd(args);
    break;
  case "list":
    await cmdList(args);
    break;
  default:
    fail(`未知のコマンド: ${cmd ?? "(なし)"} — check | add | list`);
}
