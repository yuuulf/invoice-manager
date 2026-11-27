// 一覧の並べ替え・絞り込み・戻り先（spec.md 3.2）。条件は URL の検索パラメータに持たせる

/** ページの searchParams（Next.js が渡すもの） */
export type SearchParams = Record<string, string | string[] | undefined>;

export type SortOrder = "asc" | "desc";
export type SortState<K extends string> = { key: K; order: SortOrder } | null;

/** 一覧の条件として URL に持たせるパラメータ */
export const LIST_PARAM = {
  sort: "sort",
  order: "order",
  keyword: "q",
  view: "view",
} as const;

/** 1 つ目の値（複数あれば先頭）。なければ空文字 */
export function firstParam(params: SearchParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** すべての値（空は除く） */
export function allParams(params: SearchParams, key: string): string[] {
  const value = params[key];
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map((v) => v.trim()).filter(Boolean);
}

/** searchParams を URLSearchParams にする（空の値は除く） */
export function toSearchParams(
  params: SearchParams,
  omit: readonly string[] = [],
): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (omit.includes(key)) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v) result.append(key, v);
    }
  }
  return result;
}

/** 並べ替えの条件を読む。許可していない列や向きなら null（既定の順） */
export function parseSort<K extends string>(
  params: SearchParams,
  keys: readonly K[],
): SortState<K> {
  const key = firstParam(params, LIST_PARAM.sort);
  const order = firstParam(params, LIST_PARAM.order);
  if (!(keys as readonly string[]).includes(key)) return null;
  return { key: key as K, order: order === "desc" ? "desc" : "asc" };
}

/**
 * 見出しを押したときの次の並べ替え。昇順 → 降順 → 既定の順 の順に切り替える
 */
export function nextSort<K extends string>(
  current: SortState<K>,
  key: K,
): SortState<K> {
  if (current?.key !== key) return { key, order: "asc" };
  return current.order === "asc" ? { key, order: "desc" } : null;
}

/** 並べ替えの条件を差し替えた URL（他の条件は残す） */
export function sortHref<K extends string>(
  basePath: string,
  query: string,
  sort: SortState<K>,
): string {
  const params = new URLSearchParams(query);
  params.delete(LIST_PARAM.sort);
  params.delete(LIST_PARAM.order);
  if (sort) {
    params.set(LIST_PARAM.sort, sort.key);
    params.set(LIST_PARAM.order, sort.order);
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator("ja", { numeric: true });

/**
 * 並べ替える。空（null・空文字）はどちらの向きでも最後にする。
 * 同じ値どうしは元の順（既定の順）を保つ
 */
export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: SortState<K>,
  values: Record<K, (row: T) => SortValue>,
): T[] {
  if (!sort) return [...rows];
  const valueOf = values[sort.key];
  const sign = sort.order === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: valueOf(row) }))
    .sort((a, b) => {
      const aEmpty =
        a.value === null || a.value === undefined || a.value === "";
      const bEmpty =
        b.value === null || b.value === undefined || b.value === "";
      if (aEmpty || bEmpty) {
        return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
      }
      const diff =
        typeof a.value === "number" && typeof b.value === "number"
          ? a.value - b.value
          : collator.compare(String(a.value), String(b.value));
      return diff === 0 ? a.index - b.index : diff * sign;
    })
    .map(({ row }) => row);
}

/** 検索用に文字をそろえる（全角英数→半角、大文字→小文字） */
function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

/**
 * キーワードに一致するか。空白で区切った語をすべて含めば一致（部分一致・大文字小文字と全角半角を区別しない）。
 * キーワードが空なら常に一致
 */
export function matchesKeyword(
  values: readonly (string | null | undefined)[],
  keyword: string,
): boolean {
  const words = normalize(keyword).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = normalize(values.filter(Boolean).join("\n"));
  return words.every((word) => text.includes(word));
}

/**
 * 一覧に戻るときの URL。back は一覧の検索パラメータ（「?」なし）。
 * 検索パラメータとして読み直すので、別のサイトやパスには飛ばない
 */
export function listHref(basePath: string, back: string | null | undefined) {
  const search = new URLSearchParams(back ?? "").toString();
  return search ? `${basePath}?${search}` : basePath;
}

/** 一覧へ戻るための条件を持たせるパラメータ（編集・作成画面の URL とフォーム） */
export const BACK_PARAM = "back";

/** 一覧から開く画面（編集・作成）の URL に、一覧へ戻るための条件を付ける */
export function withBack(href: string, listQuery: string): string {
  if (!listQuery) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${new URLSearchParams({ [BACK_PARAM]: listQuery })}`;
}

/** 一覧の表に渡す、いまの並べ替え・絞り込みの状態 */
export type ListView<K extends string> = {
  basePath: string;
  sort: SortState<K>;
  /** いまの一覧の検索パラメータ（「?」なし）。並べ替えのリンクと戻り先に使う */
  query: string;
  /** 絞り込み中か（0 件のときの案内を変える） */
  filtered: boolean;
};
