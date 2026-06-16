import type { FC, PropsWithChildren } from "hono/jsx";
import { SITE, abs, jsonLdString } from "../seo";

type LayoutProps = PropsWithChildren<{
  title?: string;
  description?: string;
  /** canonical / og:url 用のパス（既定はトップ）。 */
  path?: string;
  ogType?: "website" | "article";
  /** schema.org JSON-LD（オブジェクト or 配列）。 */
  jsonLd?: unknown | unknown[];
  publishedTime?: string;
  modifiedTime?: string;
}>;

export const Layout: FC<LayoutProps> = ({
  title,
  description,
  path = "/",
  ogType = "website",
  jsonLd,
  publishedTime,
  modifiedTime,
  children,
}) => {
  const pageTitle = title ? `${title} | ${SITE.name}` : SITE.name;
  const desc = description || SITE.description;
  const canonical = abs(path);
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <html lang={SITE.lang}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={desc} />
        {/* 検索/AI に全文スニペット・大きめのプレビューを許可（LLMO） */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href={canonical} />
        {/* Open Graph */}
        <meta property="og:type" content={ogType} />
        <meta property="og:site_name" content={SITE.name} />
        <meta property="og:locale" content={SITE.locale} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={canonical} />
        {ogType === "article" && publishedTime && (
          <meta property="article:published_time" content={publishedTime} />
        )}
        {ogType === "article" && (modifiedTime || publishedTime) && (
          <meta property="article:modified_time" content={modifiedTime || publishedTime} />
        )}
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={desc} />
        {/* フィード・LLM 向けの代替表現 */}
        <link rel="alternate" type="application/rss+xml" title={`${SITE.name} のRSS`} href="/feed.xml" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#fbfaf7" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#16151a" media="(prefers-color-scheme: dark)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@500;600;700&display=swap"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="stylesheet" href="/style.css" />
        {blocks.map((b) => (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(b) }} />
        ))}
      </head>
      <body>
        <header class="masthead">
          <div class="masthead-inner">
            <a href="/" class="masthead-brand">
              <span class="masthead-rule" aria-hidden="true" />
              <span class="masthead-title">{SITE.name}</span>
            </a>
            <p class="masthead-tagline">{SITE.description}</p>
            <nav class="masthead-nav" aria-label="サイトナビゲーション">
              <a href="/">最新</a>
              <a href="/topics">トピック</a>
            </nav>
          </div>
        </header>
        <main class="container" id="main">
          {children}
        </main>
        <footer class="site-footer">
          <div class="container">
            <p class="footer-policy">
              本サイトは出典を明記した上で事実を要約・整理して提供します。意見・分析は事実と区別して表記し、特定の立場を推奨・批判しません。
            </p>
            <p class="footer-copy">&copy; {SITE.name}</p>
          </div>
        </footer>
      </body>
    </html>
  );
};
