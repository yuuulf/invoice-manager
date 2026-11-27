/**
 * 出力ファイル名（spec.md 7.5）。
 * 確定した PDF は「請求書_{請求書番号}.pdf」、確定前（SAMPLE）は「サンプル_請求書_{請求書番号}.pdf」
 */
export function invoicePdfFileName(
  invoiceNumber: string,
  { sample = false }: { sample?: boolean } = {},
) {
  return `${sample ? "サンプル_" : ""}請求書_${invoiceNumber}.pdf`;
}

/**
 * PDF のレスポンス。既定ではダウンロードさせ、inline なら画面内に表示させる（プレビュー用）。
 * 日本語のファイル名は RFC 5987 形式で渡す
 */
export function pdfResponse(
  pdf: Buffer,
  invoiceNumber: string,
  {
    inline = false,
    sample = false,
  }: { inline?: boolean; sample?: boolean } = {},
): Response {
  const fileName = invoicePdfFileName(invoiceNumber, { sample });
  const asciiName = `${sample ? "sample_" : ""}invoice_${invoiceNumber}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
