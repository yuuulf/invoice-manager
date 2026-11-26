/** フォームの文字列値を前後の空白を除いて取得する。未入力やファイルは空文字 */
export function getText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** 値が選択肢のいずれかか */
export function isOneOf<T extends string>(
  options: readonly T[],
  value: string,
): value is T {
  return (options as readonly string[]).includes(value);
}
