/** 出力ファイル名「請求書_{請求番号}.pdf」（spec.md 7.5） */
export function invoicePdfFileName(invoiceNumber: string) {
  return `請求書_${invoiceNumber}.pdf`;
}

/** PDF をダウンロードさせるレスポンス。日本語のファイル名は RFC 5987 形式で渡す */
export function pdfResponse(pdf: Buffer, invoiceNumber: string): Response {
  const fileName = invoicePdfFileName(invoiceNumber);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice_${invoiceNumber}.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
