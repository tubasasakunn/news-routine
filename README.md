# news-routine

日本の政治ニュースを**事実ベース・出典付き**で毎日お届けするサイト（`news.basaapp.com`）。
Claude Code routine が定期実行で記事を調査・追加する。

## 技術スタック
- Hono + Vite（`hono/jsx` でサーバーサイドレンダリング）
- Cloudflare Workers（bun でビルド）
- 記事は `content/articles/*.md`（Markdown + frontmatter）をビルド時にバンドル

## 開発
```bash
bun install
bun run dev        # ローカル開発サーバ (Vite)
bun run build      # dist/ にビルド
bun run preview    # wrangler で本番相当の動作確認
bun run typecheck  # 型チェック
```

## デプロイ
main への push で Cloudflare に自動デプロイ（CI 設定は別途）。
手動は `bun run deploy`。ドメイン `news.basaapp.com` は `wrangler.jsonc` の custom domain ルートで設定。

## ディレクトリ
```
content/articles/   記事（Markdown）。routine が追加する本体
data/articles.json  投稿済み記事の台帳（重複防止用）
src/                Hono アプリ（ルーティング・レンダリング）
.claude/skills/
  news-collection/    政治ニュース収集の手順・編集方針（routine が読む）
  article-registry/   重複防止スキル（全プロジェクト共通）
```

## 記事の追加（routine / 手動共通）
`.claude/skills/news-collection/SKILL.md` の手順に従う。要点：
1. 信頼できる情報源を調査（一次情報優先 + Web 検索補完）
2. `article-registry` で重複チェック
3. `content/articles/<YYYY-MM-DD>-<slug>.md` を作成（フォーマット厳守）
4. 台帳に登録 → 記事と台帳を同一コミットで push
