---
name: seo-llmo
description: このサイトの SEO（検索最適化）と LLMO/GEO（生成AI・LLMに引用されやすくする最適化）のベストプラクティスを定義し、維持する。記事を追加・編集するとき、新ページ/新ルートを足すとき、サイトのメタ情報・構造化データ・robots/sitemap/feed/llms を変更するときに必ず参照する。技術実装は src/seo.ts と src/components/Layout.tsx に集約。
---

# seo-llmo（SEO / LLMO ベストプラクティスの維持）

routine が定期実行でコンテンツを足し続けるサイトでは、**最適化を一度入れて終わりにせず、記事ごと・変更ごとにベストプラクティスを保つ**ことが重要。このスキルは「何が実装済みか」「記事を書くとき何を守るか」「どう劣化を防ぐか」を定義する。

> 効果が確認されている順（2025–2026 の調査に基づく）:
> 1. **SSR で本文を完全に HTML に出す**（主要 AI クローラは JS を実行しない。Hono の SSR で本文がそのまま出ている＝OK。クライアント JS で本文を描画しない）
> 2. **AI クローラを許可する robots.txt ＋ 正確な lastmod の sitemap**
> 3. **記事冒頭に結論／統計／出典を置くコンテンツ構造**
> 4. **NewsArticle/Article JSON-LD ＋ RSS**
> 5. llms.txt は低コストなので置くが、引用との相関は確認されていない（依存しない）

## 実装の所在（変更はここに集約）
- `src/seo.ts` … `SITE` 設定とすべての生成ロジック（JSON-LD・robots・sitemap・RSS・llms.txt）。**プロジェクト間で差異は原則 `SITE` だけ**。ロジックは共通に保つ。
- `src/components/Layout.tsx` … `<head>` のメタ（canonical / robots / OG / Twitter / RSS link / JSON-LD 出力）。
- `src/index.tsx` … エンドポイント登録と各ページへの JSON-LD 受け渡し。

## 公開しているエンドポイント（壊さない）
- `/robots.txt` — 全クローラ許可＋現行 AI クローラを明示許可＋ Sitemap 参照
- `/sitemap.xml` — トップ・一覧・各記事を `lastmod` 付きで列挙
- `/news-sitemap.xml` — ニュースサイトのみ（`SITE.isNews=true`）。直近約2日の記事
- `/feed.xml` — RSS 2.0（最新50件）
- `/llms.txt` — LLM 向けのサイト要約＋リンク集（llmstxt.org 準拠）
- 各ページの `<head>` に canonical / OG / Twitter / `robots: max-snippet:-1` / JSON-LD

## 記事を書くたびに守ること（LLMO の核 = 引用されるための構造）
調査で効果が数値確認された順。**article-registry の重複チェックと併せて、これらを満たしてから投稿する。**

1. **冒頭に結論（TL;DR）**: 最初の2〜4文で「何が起きたか/結論」を自己完結的に書く（引用の多くがページ前1/3から拾われる）。
2. **具体的な数値・統計**（単体で最も効く）: 曖昧語を数字に。数字には必ず出典を併記。
3. **出典への外部リンク**を本文・末尾に置く（一次情報優先。URL は公開前に実在確認＝既存ルール）。`sources` は2件以上。
4. **見出しを疑問文に**し、その直下で即答する（「なぜ〜か」「いつ〜するか」）。`##` 見出しで構造化。
5. **固有名詞を明示**（人名・組織・地名・日付をフルで、役職や文脈付き）。代名詞・「前述の通り」など参照表現を避け、各段落を単独で読めるようにする。
6. **引用（クォート）**を入れる（当局者・専門家・一次資料の発言）。
7. **鮮度**: `date` を正確に。内容を更新したら（予測の採点など）日付・本文を実際に更新する。
8. **`summary`（frontmatter）を強く書く**: meta description / OG / JSON-LD / llms.txt / RSS すべてに使われる。1〜2文で固有・具体的に（日本語は120字前後を目安に簡潔に）。
9. **`title` は具体的でキーワードを含む**。JSON-LD の `headline` は110字に自動で丸めるが、タイトル自体も簡潔に。
10. **`topics` は正規化**（小文字・表記統一）。キーワード／エンティティとして JSON-LD と一覧に使う。
11. **AI 執筆の正直な開示を保つ**: フッターと著者表記で「AI（Claude）が執筆」を明示し続ける（開示は信頼を高める。隠さない）。

逆効果なのでやらないこと: **キーワード詰め込み（効果ゼロ〜マイナス）**、`meta keywords`（廃止済み）、`SearchAction`／サイトリンク検索ボックス JSON-LD（2024 末に Google 廃止）、本文を隠して JS で描画すること。

## ベストプラクティスを維持するために（定期・変更時チェック）
- **新ルート/新ページを足したら** `src/seo.ts` の `sitemapXml`（必要なら `extra`）と `llmsTxt`（`extraLinks`）に追加する。
- **AI クローラ一覧は陳腐化する**。`robotsTxt()` の一覧を年1回程度見直す。旧トークン `anthropic-ai` / `Claude-Web` は記載しない（廃止済み）。現行 Anthropic は `ClaudeBot` / `Claude-User` / `Claude-SearchBot`。`Google-Extended` / `Applebot-Extended` は robots 指示子で検索順位に影響しないため許可してよい。
- **`lastmod` は正確に保つ**（些末な変更で動かさない。`changefreq`/`priority` は Google が無視するので入れない）。
- **構造化データを壊さない**: `SITE` を変えたら JSON-LD/RSS/sitemap 全部に波及する。変更後は下記の検証を通す。
- **AI 生成の開示は可視で**（schema に「AI生成」公式プロパティは無い）。著者は捏造 Person ではなく、実体に責任が置ける表現（AI ペルソナ Claude or 編集部 Organization）にする。

### 予測サイト（mirai）固有
- 各予測を**反証可能・期限つき**に（明確な主張＋目標時点＋確信度）。これは LLMO の「具体・構造」と合致。
- **過去予測の採点（的中/外れ/一部的中）の可視トラックレコード**は希少な信頼シグナル。採点時は `dateModified`（= `resolved`）も更新される。

## 検証（変更後に必ず）
```bash
bun run typecheck && bun run build
# ローカル起動して目視（任意）
bunx wrangler dev --local
#   /robots.txt /sitemap.xml /feed.xml /llms.txt /  /articles/<slug>
```
- JSON-LD は Google「リッチリザルト テスト」/ schema.org Validator で検証可能（デプロイ後の URL で）。
- 各記事ページに canonical・`robots: max-snippet:-1`・OG・JSON-LD（Article＋BreadcrumbList）が出ていること。

## 終了条件
- [ ] 記事が上記「書くたびに守ること」を満たしている（結論先出し・数値＋出典・明確な見出し・強い summary）
- [ ] 新ルートを足したなら sitemap / llms.txt に反映した
- [ ] `bun run typecheck && bun run build` が通る
- [ ] AI 執筆の開示（フッター・著者）が保たれている
