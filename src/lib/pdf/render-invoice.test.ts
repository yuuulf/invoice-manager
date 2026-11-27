// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { InvoiceSnapshot } from "@/lib/invoices/snapshot";
import {
  createDocument,
  layoutRecipientBlock,
  renderInvoicePdf,
} from "./render-invoice";
import { sampleSnapshot } from "./test-snapshot";

const mm = (value: number) => value * 2.8346;

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

describe("上段・左の配置（件名が長いとき）", () => {
  const longSubject = {
    ...sampleSnapshot,
    subject: "Webサイト保守・改修およびランディングページ制作",
    period: { type: "range", start: "2026-11-01", end: "2026-11-30" },
  } satisfies InvoiceSnapshot;
  const veryLongSubject = {
    ...longSubject,
    subject:
      "Webサイト保守・改修およびランディングページ制作とバナー画像制作一式、アクセス解析レポート作成",
  } satisfies InvoiceSnapshot;
  const layout = (s: InvoiceSnapshot) =>
    layoutRecipientBlock(createDocument("test"), s);

  test("件名が1行なら、リード文・ご請求金額は従来の位置", () => {
    const short = layout(sampleSnapshot);
    expect(short.subjectLines).toBe(1);
    expect(short.leadY).toBeCloseTo(short.subjectY + mm(8));
    expect(short.amountY).toBeCloseTo(mm(83));
  });

  test("件名が2行になったら、リード文を1行分下げて重ねない", () => {
    const short = layout(sampleSnapshot);
    const long = layout(longSubject);
    expect(long.subjectLines).toBe(2);
    expect(long.leadY).toBeGreaterThanOrEqual(
      long.subjectY + long.subjectLineHeight * 2,
    );
    expect(long.leadY - short.leadY).toBeCloseTo(long.subjectLineHeight);
  });

  test("3行以上になる件名も省略せずに折り返し、ご請求金額・明細をその分下げる", () => {
    const s = {
      ...veryLongSubject,
      client: { ...veryLongSubject.client, contactName: "佐藤 花子" },
    };
    const l = layout(s);
    expect(l.subjectLines).toBeGreaterThanOrEqual(3);
    expect(l.leadY).toBeGreaterThanOrEqual(
      l.subjectY + l.subjectLineHeight * l.subjectLines,
    );
    expect(l.amountY).toBeGreaterThanOrEqual(l.leadY + mm(10));
    // 明細はご請求金額の下線より下から始める
    expect(l.itemsTop).toBeGreaterThan(l.amountUnderlineY);
    expect(l.itemsTop).toBeGreaterThan(mm(100));
  });

  test("件名が短ければ明細は従来の位置（100mm）", () => {
    expect(layout(sampleSnapshot).itemsTop).toBeCloseTo(mm(100));
    expect(layout(longSubject).itemsTop).toBeCloseTo(mm(100));
  });
});
