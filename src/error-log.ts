/**
 * エラーを log-checker に送る。
 *
 * 送信は waitUntil に逃がしてレスポンスをブロックしない。送信自体が失敗しても
 * 握り潰す（ログのためにリクエストを壊さない）。
 *
 * 集計は https://log-checker.basaapp.com/graphql から引ける。
 */
const ENDPOINT = 'https://log-checker.basaapp.com/api/log';
const API_KEY = '906ea13382ea8d53571a857a48127633afbb59566ebfc271';
const SERVICE = 'news-routine';

type Waitable = { waitUntil(promise: Promise<unknown>): void };

/** Hono の Context から ExecutionContext を安全に取り出す（無い環境では undefined） */
export function execCtx(c: unknown): Waitable | undefined {
  try {
    const ctx = (c as { executionCtx?: Waitable }).executionCtx;
    return typeof ctx?.waitUntil === 'function' ? ctx : undefined;
  } catch {
    return undefined;
  }
}

/**
 * エラーを 1 件記録する。
 *
 * @param ctx     ExecutionContext（Hono なら execCtx(c)、scheduled なら第 3 引数）
 * @param logName エラーの種類。集計のキーになるので固定文字列にする
 * @param detail  Error かメッセージ
 */
export function reportError(ctx: Waitable | undefined, logName: string, detail: unknown): void {
  const message =
    detail instanceof Error ? `${detail.message}\n${detail.stack ?? ''}`.trim() : String(detail);

  const task = fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      service: SERVICE,
      type: 'error',
      log_name: logName,
      detail: message.slice(0, 2000),
    }),
  }).then(
    () => undefined,
    () => undefined
  );

  if (ctx) {
    ctx.waitUntil(task);
  } else {
    void task;
  }
}
