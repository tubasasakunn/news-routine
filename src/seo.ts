// src/seo.ts — SEO / LLMO 共通設定とユーティリティ
//
// 方針・運用は .claude/skills/seo-llmo/SKILL.md を参照（ベストプラクティス維持のため）。
// ここを変えたら sitemap / llms.txt / JSON-LD すべてに波及するので、SITE の値だけ
// プロジェクトごとに調整し、ロジックは原則共通に保つ。

import type { Article } from "./articles";
import { articles, allTopics } from "./articles";

export const SITE = {
  url: "https://news.basaapp.com",
  name: "basa 世界情勢ニュース",
  description: "外交・安全保障・世界情勢を、事実ベースで・出典付きで毎日お届け。",
  lang: "ja",
  locale: "ja_JP",
  // 著者・発行者（透明性のため明示。AI 執筆サイトは authorType を "Person" に）
  authorType: "Organization" as "Organization" | "Person",
  authorName: "basa 世界情勢ニュース 編集部",
  authorDescription: "Claude（Anthropic の AI）を用いた routine が事実と出典に基づき編集・執筆。",
  publisherName: "basa",
  // schema.org の記事タイプ（ニュース=NewsArticle / 解説=Article / ブログ=BlogPosting）
  articleType: "NewsArticle",
  // ニュースサイトなら Google News sitemap（/news-sitemap.xml）を出す
  isNews: true,
  // llms.txt 冒頭の説明
  about:
    "外交・安全保障・紛争・世界情勢（国際政治）を、事実ベースで出典付きに要約するニュースサイト。Claude（AI）を用いた routine が毎日自動更新する。意見と事実を分離し、当事者の主張は帰属を明示する。",
} as const;

/** 相対パスを絶対 URL に。canonical / OG / sitemap などで使用。 */
export const abs = (path: string) => new URL(path, SITE.url).toString();

/** </script> 注入を防ぐ安全な JSON-LD 文字列化。 */
export const jsonLdString = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

const author = () =>
  SITE.authorType === "Person"
    ? { "@type": "Person", name: SITE.authorName, description: SITE.authorDescription }
    : { "@type": "Organization", name: SITE.authorName, description: SITE.authorDescription };

const publisher = () => ({
  "@type": "Organization",
  name: SITE.publisherName,
  url: SITE.url,
});

// ---- JSON-LD ビルダー（schema.org 構造化データ） ----

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: publisher(),
  };
}

export function articleJsonLd(a: Article, opts?: { modified?: string }) {
  const url = abs(`/articles/${a.slug}`);
  const published = `${a.date}T08:00:00+09:00`;
  // Google は headline ≤110字を推奨
  const headline = a.title.length > 110 ? a.title.slice(0, 109) + "…" : a.title;
  return {
    "@context": "https://schema.org",
    "@type": SITE.articleType,
    headline,
    description: a.summary,
    datePublished: published,
    dateModified: opts?.modified ? `${opts.modified}T08:00:00+09:00` : published,
    inLanguage: SITE.lang,
    author: author(),
    publisher: publisher(),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    isAccessibleForFree: true,
    ...(a.topics.length ? { keywords: a.topics.join(", ") } : {}),
    ...(a.sources.length ? { citation: a.sources } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

export function collectionJsonLd(name: string, path: string, list: Article[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: abs(path),
    inLanguage: SITE.lang,
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: list.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: abs(`/articles/${a.slug}`),
        name: a.title,
      })),
    },
  };
}

// ---- テキスト/XML エンドポイント ----

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** robots.txt: すべてのクローラを許可し、現行の主要 AI クローラを明示的に許可（LLMO）。 */
export function robotsTxt() {
  // コンテンツを検索エンジンと LLM 双方に利用してもらう方針（引用最大化）。
  // ※ 旧トークン anthropic-ai / Claude-Web は廃止済みのため記載しない。
  const aiBots = [
    // AI 検索・取得系（引用を生む）
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
    "DuckAssistBot",
    // AI 学習系（露出増のため許可）
    "GPTBot",
    "ClaudeBot",
    "CCBot",
    "Amazonbot",
    "Meta-ExternalAgent",
    "Google-Extended",
    "Applebot-Extended",
  ];
  const lines = ["# すべてのクローラ（検索エンジン・AI）にコンテンツ利用を許可", "User-agent: *", "Allow: /", ""];
  for (const b of aiBots) lines.push(`User-agent: ${b}`, "Disallow:", "");
  lines.push(`Sitemap: ${abs("/sitemap.xml")}`);
  if (SITE.isNews) lines.push(`Sitemap: ${abs("/news-sitemap.xml")}`);
  return lines.join("\n") + "\n";
}

/** sitemap.xml: トップ・トピック・各記事を lastmod 付きで列挙。 */
export function sitemapXml(extra: { loc: string; lastmod?: string }[] = []) {
  const latest = articles[0]?.date;
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: abs("/"), lastmod: latest },
    { loc: abs("/topics"), lastmod: latest },
    ...extra,
    ...allTopics().map((t) => ({ loc: abs(`/topics/${encodeURIComponent(t)}`), lastmod: latest })),
    ...articles.map((a) => ({ loc: abs(`/articles/${a.slug}`), lastmod: a.date })),
  ];
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** Google News sitemap: 直近 2 日の記事のみ（ニュースサイト向け）。 */
export function newsSitemapXml() {
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const recent = articles.filter((a) => a.date >= cutoff);
  const body = recent
    .map((a) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(abs(`/articles/${a.slug}`))}</loc>`,
        "    <news:news>",
        `      <news:publication><news:name>${xmlEscape(SITE.name)}</news:name><news:language>${SITE.lang}</news:language></news:publication>`,
        `      <news:publication_date>${a.date}T08:00:00+09:00</news:publication_date>`,
        `      <news:title>${xmlEscape(a.title)}</news:title>`,
        "    </news:news>",
        "  </url>",
      ].join("\n"),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${body}\n</urlset>\n`;
}

/** RSS 2.0 フィード（最新 50 件）。検索・LLM・購読の発見性向上。 */
export function rssXml() {
  const items = articles
    .slice(0, 50)
    .map((a) => {
      const url = abs(`/articles/${a.slug}`);
      const pub = new Date(`${a.date}T08:00:00+09:00`).toUTCString();
      return [
        "    <item>",
        `      <title>${xmlEscape(a.title)}</title>`,
        `      <link>${xmlEscape(url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
        `      <pubDate>${pub}</pubDate>`,
        `      <description>${xmlEscape(a.summary)}</description>`,
        ...a.topics.map((t) => `      <category>${xmlEscape(t)}</category>`),
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(SITE.name)}</title>
    <link>${SITE.url}</link>
    <atom:link href="${abs("/feed.xml")}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(SITE.description)}</description>
    <language>${SITE.lang}</language>
${items}
  </channel>
</rss>
`;
}

/** llms.txt: LLM 向けのサイト要約とリンク集（llmstxt.org 準拠）。 */
export function llmsTxt(extraLinks: { label: string; path: string }[] = []) {
  const links = [
    { label: "トピック一覧", path: "/topics" },
    ...extraLinks,
    { label: "RSS フィード", path: "/feed.xml" },
    { label: "サイトマップ", path: "/sitemap.xml" },
  ];
  return [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    SITE.about,
    "",
    "## 最新記事",
    "",
    ...articles
      .slice(0, 50)
      .map((a) => `- [${a.title}](${abs(`/articles/${a.slug}`)})${a.summary ? `: ${a.summary}` : ""}`),
    "",
    "## ナビゲーション",
    "",
    ...links.map((l) => `- [${l.label}](${abs(l.path)})`),
    "",
  ].join("\n");
}
