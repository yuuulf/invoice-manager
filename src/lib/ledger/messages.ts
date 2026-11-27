import type { Renumbered } from "./repository";

const retry = "プレビューを確認して、もう一度発行してください。";

/** 確定時に請求書番号を振り直したことを伝えるメッセージ（spec.md 7.2） */
export function renumberedMessage({ from, to, reason }: Renumbered): string {
  switch (reason) {
    case "duplicate":
      return `請求書番号 ${from} はすでに台帳にあるため、${to} に振り直しました。${retry}`;
    case "gap":
      return `台帳の番号に空きがあるため、請求書番号を ${from} から ${to} に振り直しました。${retry}`;
    case "behind":
      return `台帳の連番に合わせて、請求書番号を ${from} から ${to} に振り直しました。${retry}`;
  }
}
