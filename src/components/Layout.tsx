import type { FC, PropsWithChildren } from "hono/jsx";

const SITE_NAME = "basa 政治ニュース";
const SITE_DESC = "政治の動きを、事実ベースで・出典付きで毎日お届け。";

type LayoutProps = PropsWithChildren<{
  title?: string;
  description?: string;
}>;

export const Layout: FC<LayoutProps> = ({ title, description, children }) => {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={description || SITE_DESC} />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#fbfaf7" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#16151a" media="(prefers-color-scheme: dark)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@500;600;700&display=swap"
        />
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <header class="masthead">
          <div class="masthead-inner">
            <a href="/" class="masthead-brand">
              <span class="masthead-rule" aria-hidden="true" />
              <span class="masthead-title">{SITE_NAME}</span>
            </a>
            <p class="masthead-tagline">{SITE_DESC}</p>
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
            <p class="footer-copy">&copy; {SITE_NAME}</p>
          </div>
        </footer>
      </body>
    </html>
  );
};
