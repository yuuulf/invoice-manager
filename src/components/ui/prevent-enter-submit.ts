import type { KeyboardEvent } from "react";

/** Enter を押しても送信しない入力欄（文字を入力する欄）。ボタン・チェックボックスなどは除く */
const NON_TEXT_TYPES = new Set([
  "button",
  "checkbox",
  "file",
  "image",
  "radio",
  "reset",
  "submit",
]);

/**
 * 入力欄で Enter を押したときにフォームを送信しない（保存・作成・削除などは必ずボタンで行う）。
 * フォームの onKeyDown に渡す。複数行の入力欄の改行と、ボタンにフォーカスして Enter で押す操作はそのまま。
 * Enter で送信してよいのは一覧の検索（ListFilter）だけ
 */
export function preventEnterSubmit(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter") return;
  const target = event.target;
  if (target instanceof HTMLInputElement && !NON_TEXT_TYPES.has(target.type)) {
    event.preventDefault();
  }
}
