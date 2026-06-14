---
name: article-registry
description: 投稿済み記事を台帳（data/articles.json）で管理し、記事を新規作成する前に重複・類似記事を検出して防ぎます。記事の調査・作成・投稿を行うとき、または「この記事は既出か」「重複していないか」を確認するときに必ず使用してください。記事を1本作るたびに呼び出すこと。
---

# article-registry（投稿済み記事の管理・重複防止）

## 概要
このコンテンツサイトでは routine が定期実行で記事を追加するため、**同じ／言い換えただけの記事を二重投稿しない**ことが必須。投稿済み記事の台帳 `data/articles.json` をリポジトリにコミットして管理し、新規記事を作る前に必ず重複チェックを通す。

> routine は毎回 fresh clone で動き実行間の状態を持てない。台帳は **必ずリポジトリにコミット**された `data/articles.json` を正とする。

## 台帳フォーマット（data/articles.json）
```json
[
  {
    "slug": "unique-kebab-slug",
    "title": "記事タイトル",
    "sourceUrl": "https://source.example.com/original-article",
    "topics": ["topic-a", "entity-b", "keyword-c"],
    "summary": "1〜2文の要約（類似判定の材料）",
    "publishedAt": "2026-06-14"
  }
]
```
- `sourceUrl`: 元ネタ記事の URL。同じソースの再掲を防ぐ主キー的役割。
- `topics`: トピック・固有名詞・主要キーワードを正規化して列挙（小文字・かな統一）。類似判定の核。
- `slug`: サイト内で一意。重複時の識別子。

## ワークフロー（記事を作るたびに実行）

1. **台帳ロード**: `data/articles.json` を読む（無ければ `[]` から開始）。
2. **候補メタを作る**: これから書く記事の `sourceUrl` / 正規化タイトル / `topics`（トピック・固有名詞）を決める。
3. **機械判定（決定的・スクリプト）**:
   ```bash
   bun run .claude/skills/article-registry/scripts/registry.ts check \
     --source "<sourceUrl>" --title "<タイトル>" --topics "topic-a,entity-b,keyword-c"
   ```
   - `verdict: "duplicate"` → **そのまま投稿しない**。同一ソース or 正規化タイトル一致＝確定重複。別ソース/別角度に変更するか中止。
   - `verdict: "review"` → トピック重複の**候補**が返る。手順4へ。
   - `verdict: "clear"` → 重複なし。手順5へ。
4. **意味的判定（LLM＝あなた）**: `review` で返った候補記事それぞれと、これから書く内容が **実質同じテーマ・同じ出来事を扱っていないか** を判断する。
   - 実質同じ（言い換え・焼き直し含む）→ 投稿しない。別の切り口・別トピックに変える。
   - 切り口や対象が明確に異なる → 投稿可（手順5）。判断理由を一言残す。
5. **記事生成 → 台帳に追記**:
   ```bash
   bun run .claude/skills/article-registry/scripts/registry.ts add \
     --slug "<slug>" --title "<タイトル>" --source "<sourceUrl>" \
     --topics "topic-a,entity-b,keyword-c" --summary "<要約>" --published "<YYYY-MM-DD>"
   ```
6. **コミット**: 記事ファイルと `data/articles.json` を同一コミットに含めて push。台帳更新を忘れない（次回の重複防止が効かなくなる）。

## 重複判定の基準（中間レベル）
- **確定重複（機械）**: 同一 `sourceUrl`、または正規化タイトルの完全一致。
- **要レビュー（機械→LLM）**: `topics` の重複が閾値以上 → LLM が「同じ出来事/テーマか」を判断。
- 言い換え・要約違いだけの焼き直しは**重複扱い**。対象（人物・製品・事件）や切り口が異なれば別記事として可。

## 注意
- 台帳を更新せずに記事だけコミットしない（重複検出が壊れる）。
- `topics` は表記揺れを正規化（小文字化・全半角・送り仮名統一）してから渡す。
- 同一テーマの続報を出す場合は、前報との差分（新事実）が明確なときのみ。`summary` に差分を書く。

## 終了条件
- [ ] 台帳をロードし機械判定を実行した
- [ ] `review` の候補を LLM が意味的に判定した
- [ ] 投稿する場合は台帳に追記し、記事と同一コミットに含めた
