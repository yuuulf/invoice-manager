/** 出力ファイル名「請求書_{請求番号}.pdf」（spec.md 7.5） */
export function invoicePdfFileName(invoiceNumber: string) {
  return `請求書_${invoiceNumber}.pdf`;
}

/**
 * PDF のレスポンス。既定ではダウンロードさせ、inline なら画面内に表示させる（プレビュー用）。
 * 日本語のファイル名は RFC 5987 形式で渡す
 */
export function pdfResponse(
  pdf: Buffer,
  invoiceNumber: string,
  { inline = false }: { inline?: boolean } = {},
): Response {
  const fileName = invoicePdfFileName(invoiceNumber);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="invoice_${invoiceNumber}.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
