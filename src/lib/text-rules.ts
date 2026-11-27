// 入力チェックと入力制限の共通部品（spec.md 3.1）。サーバー・ブラウザの両方で使う

/** 文字数（サロゲートペアも 1 文字）が上限を超えているか */
export function exceeds(value: string, max: number): boolean {
  return [...value].length > max;
}

/** 「{項目}は{N}文字以内で入力してください」 */
export function maxLengthMessage(label: string, max: number): string {
  return `${label}は${max}文字以内で入力してください`;
}

/** 全角の英数字を半角にする */
function toHalfWidth(value: string): string {
  return value.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
}

/** 入力制限: 数字だけを残す（全角の数字は半角にする） */
export function digitsOnly(value: string): string {
  return toHalfWidth(value).replace(/\D/g, "");
}

/** 入力制限: 英大文字・数字だけを残す（小文字は大文字に、全角は半角にする） */
export function upperAlphanumericOnly(value: string): string {
  return toHalfWidth(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
