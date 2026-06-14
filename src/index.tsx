import { Hono } from "hono";
import { Layout } from "./components/Layout";
import { articles, articlesBySlug, allTopics, articlesByTopic, type Article } from "./articles";
import {
  SITE,
  websiteJsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
  collectionJsonLd,
  robotsTxt,
  sitemapXml,
  newsSitemapXml,
  rssXml,
  llmsTxt,
} from "./seo";
import styleCss from "./style.css?raw";

const app = new Hono();

// スタイルは Worker から直接配信（静的アセットのビルド設定に依存しない）
app.get("/style.css", (c) => c.body(styleCss, 200, { "Content-Type": "text/css; charset=utf-8" }));

// SEO / LLMO 用エンドポイント（ロジックは src/seo.ts、方針は skills/seo-llmo）
const txt = (body: string, type: string) =>
  new Response(body, {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" },
  });
app.get("/robots.txt", () => txt(robotsTxt(), "text/plain; charset=utf-8"));
app.get("/sitemap.xml", () => txt(sitemapXml(), "application/xml; charset=utf-8"));
app.get("/news-sitemap.xml", () => txt(newsSitemapXml(), "application/xml; charset=utf-8"));
app.get("/feed.xml", () => txt(rssXml(), "application/rss+xml; charset=utf-8"));
app.get("/llms.txt", () => txt(llmsTxt(), "text/plain; charset=utf-8"));

const fmtDate = (d: string) => d.replace(/-/g, "/");

const ArticleCard = ({ a }: { a: Article }) => (
  <article class="card">
    <a href={`/articles/${a.slug}`} class="card-link">
      <time class="card-date">{fmtDate(a.date)}</time>
      <h2 class="card-title">{a.title}</h2>
      {a.summary && <p class="card-summary">{a.summary}</p>}
    </a>
    {a.topics.length > 0 && (
      <div class="tags">
        {a.topics.map((t) => (
          <a href={`/topics/${encodeURIComponent(t)}`} class="tag">
            #{t}
          </a>
        ))}
      </div>
    )}
  </article>
);

// 一覧（新着順）
app.get("/", (c) => {
  return c.html(
    <Layout path="/" jsonLd={websiteJsonLd()}>
      <section class="feed">
        {articles.length === 0 ? (
          <p class="empty">まだ記事がありません。</p>
        ) : (
          articles.map((a) => <ArticleCard a={a} />)
        )}
      </section>
    </Layout>,
  );
});

// 記事詳細
app.get("/articles/:slug", (c) => {
  const a = articlesBySlug.get(c.req.param("slug"));
  if (!a) return c.notFound();
  const path = `/articles/${a.slug}`;
  const published = `${a.date}T08:00:00+09:00`;
  return c.html(
    <Layout
      title={a.title}
      description={a.summary}
      path={path}
      ogType="article"
      publishedTime={published}
      jsonLd={[
        articleJsonLd(a),
        breadcrumbJsonLd([
          { name: "ホーム", path: "/" },
          { name: a.title, path },
        ]),
      ]}
    >
      <article class="post">
        <a href="/" class="back">
          &larr; 一覧へ
        </a>
        <time class="post-date">{fmtDate(a.date)}</time>
        <h1 class="post-title">{a.title}</h1>
        {a.topics.length > 0 && (
          <div class="tags">
            {a.topics.map((t) => (
              <a href={`/topics/${encodeURIComponent(t)}`} class="tag">
                #{t}
              </a>
            ))}
          </div>
        )}
        <div class="post-body" dangerouslySetInnerHTML={{ __html: a.html }} />
        {a.sources.length > 0 && (
          <section class="sources">
            <h2>出典</h2>
            <ul>
              {a.sources.map((s) => (
                <li>
                  <a href={s} rel="noopener noreferrer nofollow" target="_blank">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </Layout>,
  );
});

// トピック別
app.get("/topics/:topic", (c) => {
  const topic = c.req.param("topic");
  const list = articlesByTopic(topic);
  if (list.length === 0) return c.notFound();
  const path = `/topics/${encodeURIComponent(topic)}`;
  return c.html(
    <Layout
      title={`#${topic}`}
      description={`「${topic}」に関する記事一覧。${SITE.name}。`}
      path={path}
      jsonLd={[
        collectionJsonLd(`#${topic}`, path, list),
        breadcrumbJsonLd([
          { name: "ホーム", path: "/" },
          { name: "トピック", path: "/topics" },
          { name: `#${topic}`, path },
        ]),
      ]}
    >
      <h1 class="topic-heading">#{topic}</h1>
      <section class="feed">
        {list.map((a) => (
          <ArticleCard a={a} />
        ))}
      </section>
    </Layout>,
  );
});

// 全トピック一覧
app.get("/topics", (c) => {
  return c.html(
    <Layout
      title="トピック一覧"
      description={`${SITE.name} の全トピック。`}
      path="/topics"
      jsonLd={breadcrumbJsonLd([
        { name: "ホーム", path: "/" },
        { name: "トピック", path: "/topics" },
      ])}
    >
      <h1 class="topic-heading">トピック</h1>
      <div class="topics-index">
        <div class="tags">
          {allTopics().map((t) => (
            <a href={`/topics/${encodeURIComponent(t)}`} class="tag">
              #{t}
            </a>
          ))}
        </div>
      </div>
    </Layout>,
  );
});

export default app;
