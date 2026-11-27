import { createHash } from "node:crypto";
import type { InvoiceSnapshot } from "@/lib/invoices/snapshot";

/**
 * PDF の内容から作る短い識別子。プレビューの iframe の URL と key に付け、
 * 請求書・取引先・事業主のどれかが変わったら PDF を読み込み直させる（同じ内容なら同じ値）
 */
export function pdfVersion(snapshot: InvoiceSnapshot, seal: Buffer | null) {
  const hash = createHash("sha256").update(JSON.stringify(snapshot));
  if (seal) hash.update(seal);
  return hash.digest("hex").slice(0, 16);
}
