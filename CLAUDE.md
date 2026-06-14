# news-routine（news.basaapp.com）

外交・安全保障・紛争／戦争・世界情勢（国際政治）を事実ベース・出典付きで毎日届けるサイト。日本の外交・安保も対象。Claude Code routine が定期実行で記事を追加する。国内政治の内輪の話題は扱わない。

## スタック / 運用
- Hono + Vite + bun → Cloudflare Workers。ドメイン `news.basaapp.com`（custom domain）。
- main push で自動デプロイ。
- 記事は `content/articles/*.md`（frontmatter + Markdown）をビルド時にバンドルしてレンダリング。
- 投稿済み台帳は `data/articles.json`（重複防止）。

## 記事を追加するときは必ず
1. **`.claude/skills/news-collection/`** の手順・編集方針に従う（中立性・出典・帰属表現・記事構成のルール）。
2. **`.claude/skills/article-registry/`** で重複チェック → 投稿後に台帳登録。
3. 記事ファイルと `data/articles.json` を**同一コミット**で push。
4. **公開後に Slack 通知**: Slack コネクタで各記事の**タイトル＋URL**（`https://news.basaapp.com/articles/<slug>`）を `#claude-code` に送る（news-collection スキル参照）。
5. **じっくり時間をかける**: 急がず、多角的に検索し（複数クエリ・複数ソース）、拡張思考で裏取り・中立判断を詰める。**推奨モデル: Opus 4.8**。

## SEO / LLMO
- 最適化の方針・維持手順は **`.claude/skills/seo-llmo/`** に集約。記事を書くたび「結論先出し・数値＋出典・明確な見出し・強い `summary`」を満たす。
- 実装は `src/seo.ts`（SITE設定・JSON-LD・robots/sitemap/feed/llms 生成）と `src/components/Layout.tsx`。新ルートを足したら sitemap / llms.txt に反映し、`bun run typecheck && bun run build` を通す。

## frontmatter フォーマット（厳守）
パーサ対応は `key: value` と `key: [a, b, c]` のみ（src/articles.ts）。
```
---
slug: ...        # サイト内で一意
title: ...
date: YYYY-MM-DD
topics: [a, b]
sources: [url1, url2]   # 2件以上
summary: ...
---
```

## 注意
- 台帳を更新せず記事だけコミットしない（重複検出が壊れる）。
- 特定の国・勢力・指導者を推奨・非難しない。事実と意見を分離し、当事者の主張は帰属を明示、死傷者など数値は出典と留保を付す。
