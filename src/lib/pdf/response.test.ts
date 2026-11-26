import { expect, test } from "vitest";
import { invoicePdfFileName, pdfResponse } from "./response";

test("ファイル名は 請求書_{請求番号}.pdf", () => {
  expect(invoicePdfFileName("IABC-202611-001")).toBe(
    "請求書_IABC-202611-001.pdf",
  );
});

test("PDF をダウンロードさせ、日本語のファイル名を UTF-8 で渡す", async () => {
  const response = pdfResponse(Buffer.from("%PDF-"), "IABC-202611-001");
  expect(response.headers.get("Content-Type")).toBe("application/pdf");
  const disposition = response.headers.get("Content-Disposition")!;
  expect(disposition).toMatch(/^attachment; /);
  expect(disposition).toContain(
    `filename*=UTF-8''${encodeURIComponent("請求書_IABC-202611-001.pdf")}`,
  );
  expect(decodeURIComponent(disposition.split("UTF-8''")[1])).toBe(
    "請求書_IABC-202611-001.pdf",
  );
  expect(await response.text()).toBe("%PDF-");
});

test("inline なら画面内に表示させる", () => {
  const response = pdfResponse(Buffer.from("%PDF-"), "IABC-202611-001", {
    inline: true,
  });
  expect(response.headers.get("Content-Disposition")).toMatch(/^inline; /);
});
