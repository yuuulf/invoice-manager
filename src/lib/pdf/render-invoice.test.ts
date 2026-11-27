// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { InvoiceSnapshot } from "@/lib/invoices/snapshot";
import {
  createDocument,
  layoutRecipientBlock,
  layoutNotes,
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

  test("上限（34文字）の件名は、記号や英単語が混ざっても期間込みで3行に収まる", () => {
    const subjects = [
      "あ".repeat(34),
      "（「漢」）、。・ー".repeat(5).slice(0, 34),
      "Web maintenance・改修（LP）、バナー制作一式と解析",
      "maintenance".repeat(4).slice(0, 34),
      "W".repeat(34),
    ];
    for (const subject of subjects) {
      expect([...subject].length).toBeLessThanOrEqual(34);
      expect(
        layout({ ...longSubject, subject }).subjectLines,
      ).toBeLessThanOrEqual(3);
    }
  });
});

describe("備考欄（spec.md 7.1, 8.4）", () => {
  test("上限の250文字（改行なし）は、いちばん狭い備考欄（税込・宛名2行・件名3行・手数料の行あり）にも入る", () => {
    const layout = layoutNotes(
      createDocument("test"),
      "あ".repeat(250),
      mm(27.4),
    );
    expect(layout.fits).toBe(true);
    expect(layout.size).toBeGreaterThanOrEqual(6.5);
  });

  test("上限（5行・250文字）で各行が折り返す長さでも、いちばん狭い備考欄に入る", () => {
    // 1 行に収まらない長さの行を 4 行 + 残り
    const notes = [51, 51, 51, 51, 46].map((n) => "あ".repeat(n)).join("\n");
    const layout = layoutNotes(createDocument("test"), notes, mm(27.4));
    expect(layout.fits).toBe(true);
    expect(layout.size).toBeGreaterThanOrEqual(6.5);
  });

  test("欄に入るなら通常の大きさ（9.5pt、行の高さ 1.8 倍）", () => {
    const layout = layoutNotes(createDocument("test"), "1\n2\n3\n4\n5", mm(45));
    expect(layout).toMatchObject({ size: 9.5, fits: true });
    expect(layout.lineHeight).toBeCloseTo(9.5 * 1.8);
  });

  test("欄が狭くて入らなければ、行間を詰めてから字を小さくし、5行を入れる", () => {
    // 税込・宛名 2 行・件名 3 行・手数料の行ありのときの備考欄の高さ
    const layout = layoutNotes(
      createDocument("test"),
      "1\n2\n3\n4\n5",
      mm(27.4),
    );
    expect(layout.fits).toBe(true);
    expect(layout.size).toBeLessThan(9.5);
    expect(layout.size).toBeGreaterThanOrEqual(6.5);
    expect(mm(3) * 2 + layout.lineHeight * 6).toBeLessThanOrEqual(mm(27.4));
  });

  test("備考が短ければ、欄が狭くても字は小さくしない", () => {
    expect(layoutNotes(createDocument("test"), "1\n2", mm(27.4)).size).toBe(
      9.5,
    );
  });
});
