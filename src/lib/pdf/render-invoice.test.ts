// @vitest-environment node
import { expect, test } from "vitest";
import { renderInvoicePdf } from "./render-invoice";
import { sampleSnapshot } from "./test-snapshot";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);

test("A4 1ページの PDF を作る", async () => {
  const pdf = await renderInvoicePdf(sampleSnapshot, {
    sample: false,
    seal: png,
  });
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  const body = pdf.toString("latin1");
  expect(body.match(/\/Type \/Page\b/g)).toHaveLength(1);
  expect(body).toContain("/MediaBox [0 0 595.28 841.89]");
  expect(body).toContain("/Subtype /Image");
});

test("データ印がなければ画像を入れない", async () => {
  const pdf = await renderInvoicePdf(sampleSnapshot, {
    sample: false,
    seal: null,
  });
  expect(pdf.toString("latin1")).not.toContain("/Subtype /Image");
});

test("確定前（sample）は透かしの分だけ内容が増える", async () => {
  const [confirmed, sample] = await Promise.all([
    renderInvoicePdf(sampleSnapshot, { sample: false, seal: null }),
    renderInvoicePdf(sampleSnapshot, { sample: true, seal: null }),
  ]);
  expect(sample.toString("latin1")).toContain("/ca 0.12");
  expect(confirmed.toString("latin1")).not.toContain("/ca 0.12");
});
