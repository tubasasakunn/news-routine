# news-routine（news.basaapp.com）

日本の政治ニュースを事実ベース・出典付きで毎日届けるサイト。Claude Code routine が定期実行で記事を追加する。

## スタック / 運用
- Hono + Vite + bun → Cloudflare Workers。ドメイン `news.basaapp.com`（custom domain）。
- main push で自動デプロイ。
- 記事は `content/articles/*.md`（frontmatter + Markdown）をビルド時にバンドルしてレンダリング。
- 投稿済み台帳は `data/articles.json`（重複防止）。

## 記事を追加するときは必ず
1. **`.claude/skills/news-collection/`** の手順・編集方針に従う（政治の中立性・出典・記事構成のルール）。
2. **`.claude/skills/article-registry/`** で重複チェック → 投稿後に台帳登録。
3. 記事ファイルと `data/articles.json` を**同一コミット**で push。

## frontmatter フォーマット（厳守）
パーサ対応は `key: value` と `key: [a, b, c]` のみ（src/articles.ts）。
```
---
slug: ...        # サイト内で一意
title: ...
date: YYYY-MM-DD
topics: [a, b]
sources: [url1, url2]   # 1件以上
summary: ...
---
```

## 注意
- 台帳を更新せず記事だけコミットしない（重複検出が壊れる）。
- 政治的立場を推奨・批判しない。事実と意見を分離し、両論併記。
