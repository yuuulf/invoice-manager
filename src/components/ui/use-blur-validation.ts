"use client";

import { useState, type FocusEvent } from "react";

/**
 * 入力欄から離れたとき（フォーカスアウト）にその項目をチェックし、エラーを表示する（spec.md 3.1）。
 * フォームの onBlur に返り値の onBlur を渡し、表示には返り値の errors を使う。
 *
 * - validate(name, formData): その項目のエラー。問題なければ undefined、チェックしない項目なら null
 * - 送信結果（resetKey）が変わったら、送信結果のエラー（serverErrors）の表示に戻す
 */
export function useBlurValidation(
  resetKey: unknown,
  serverErrors: Record<string, string | undefined>,
  validate: (name: string, formData: FormData) => string | undefined | null,
) {
  const [blurErrors, setBlurErrors] = useState<
    Record<string, string | undefined>
  >({});
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setBlurErrors({});
  }

  const onBlur = (e: FocusEvent<HTMLFormElement>) => {
    const target = e.target as Partial<HTMLInputElement>;
    if (!target.name || !target.form) return;
    const name = target.name;
    const error = validate(name, new FormData(target.form));
    if (error === null) return;
    setBlurErrors((current) => ({ ...current, [name]: error }));
  };

  const errors: Record<string, string | undefined> = { ...serverErrors };
  for (const [name, error] of Object.entries(blurErrors)) errors[name] = error;
  return { errors, onBlur };
}
