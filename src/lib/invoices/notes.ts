import { countNoteLines, NOTES_MAX_LINES } from "@/lib/pdf/render-invoice";

/**
 * 備考の行数（PDF で折り返した行を含む）が上限を超えていればエラーメッセージを返す（spec.md 7.1）。
 * PDF のフォントで測るため、サーバー側（Server Action）で呼ぶ
 */
export function notesLinesError(notes: string | null): string | null {
  return countNoteLines(notes) > NOTES_MAX_LINES
    ? `備考は${NOTES_MAX_LINES}行以内（PDFで折り返した行を含む）で入力してください`
    : null;
}
